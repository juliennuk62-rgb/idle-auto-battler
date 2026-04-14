#!/usr/bin/env node
/**
 * visual-overhaul.js — mission "refonte visuelle" one-shot.
 *
 * Mobilise ~52 appels d'agents pour identifier puis implémenter 25 améliorations
 * visuelles ambitieuses sur le jeu. Budget cible : ~4 $.
 *
 * Pipeline :
 *   Phase 1 — Stratège Visuel         : 1 agent, produit 25 chantiers JSON
 *   Phase 2 — Developers × 25         : en parallèle par batch de 5
 *   Phase 3 — Reviewers × 25          : en parallèle par batch de 5
 *   Phase 4 — Intégrateur             : ordre d'application + manifest final
 *
 * Sorties :
 *   scripts/out/visual-overhaul/NN-<id>.patch     (un par chantier)
 *   scripts/out/visual-overhaul/NN-<id>.meta.json (rapport par chantier)
 *   scripts/out/visual-overhaul/MANIFEST.md       (récap + ordre conseillé)
 *
 * Usage :
 *   npm run visual-overhaul
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ── Configuration ─────────────────────────────────────────────────────────────
const MODEL          = 'claude-sonnet-4-5-20250929';
const N_CHANTIERS    = 25;             // nombre d'améliorations ciblées
const BATCH_SIZE     = 5;              // agents en parallèle par batch
const BATCH_DELAY_MS = 2000;           // pause entre batches (rate-limit safety)
const BUDGET_USD     = 4.60;           // limite hard en $
const OUT_DIR        = path.join(__dirname, 'out', 'visual-overhaul');

// Pricing Claude Sonnet 4.5 (en $ par token)
const PRICE = {
  input:       3.00 / 1_000_000,
  output:     15.00 / 1_000_000,
  cacheWrite:  3.75 / 1_000_000,
  cacheRead:   0.30 / 1_000_000,
};

let totalCostUSD = 0;

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadDotEnv();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY non définie dans .env');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(role, msg) {
  const tag = {
    STRATEGIST: '🎨', DEVELOPER: '🛠️', REVIEWER: '🔍',
    INTEGRATOR: '🧩', SYSTEM: '⚙️', BUDGET: '💰',
  }[role] || '•';
  console.log(`${tag}  [${role}]  ${msg}`);
}

function budgetLog() {
  const pct = (totalCostUSD / BUDGET_USD * 100).toFixed(1);
  log('BUDGET', `${totalCostUSD.toFixed(3)} $ / ${BUDGET_USD} $ utilisés (${pct}%)`);
}

function assertBudget() {
  if (totalCostUSD >= BUDGET_USD) {
    log('SYSTEM', `⛔ Budget de ${BUDGET_USD} $ atteint. Arrêt.`);
    process.exit(0);
  }
}

function trackUsage(usage) {
  const cost =
    (usage.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
    (usage.cache_read_input_tokens    || 0) * PRICE.cacheRead +
    (usage.input_tokens                || 0) * PRICE.input +
    (usage.output_tokens               || 0) * PRICE.output;
  totalCostUSD += cost;
  return cost;
}

async function callAgent({ system, messages, maxTokens = 2048 }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });
  trackUsage(resp.usage);
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
}

function extractJson(text) {
  // Trouve le premier bloc {...} balance
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Pas de JSON dans la réponse : ' + text.slice(0, 300));
  return JSON.parse(m[0]);
}

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'chantier';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Exécute en parallèle par batch, avec pause entre batches. */
async function runInBatches(items, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    log('SYSTEM', `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${batch.length} agents en parallèle)`);
    const batchResults = await Promise.allSettled(batch.map(worker));
    results.push(...batchResults);
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
    assertBudget();
  }
  return results;
}

// ── Contexte repo ─────────────────────────────────────────────────────────────
function loadRepoContext() {
  const dirs = ['src/systems', 'src/entities', 'src/scenes', 'src/ui', 'src/screens'];
  const files = [];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.js')) files.push(path.join(d, f));
    }
  }
  // CSS inclus également (crucial pour refonte visuelle)
  const cssPath = 'src/ui/cockpit.css';
  if (fs.existsSync(path.join(ROOT, cssPath))) files.push(cssPath);

  // Les 25 fichiers les plus gros
  const sorted = files
    .map(f => ({ f, size: fs.statSync(path.join(ROOT, f)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 25);
  const ctx = {};
  for (const { f } of sorted) ctx[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return ctx;
}

function formatContextForPrompt(ctx) {
  return Object.entries(ctx)
    .map(([p, c]) => `### ${p}\n\`\`\`${p.endsWith('.css') ? 'css' : 'javascript'}\n${c.slice(0, 4000)}\n\`\`\``)
    .join('\n\n');
}

// ── Phase 1 : Stratège Visuel ─────────────────────────────────────────────────
async function strategist(ctxText) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es DIRECTEUR ARTISTIQUE et UX SENIOR pour un jeu idle auto-battler Phaser.js (pixel art + DOM UI).

MISSION : produire un plan de REFONTE VISUELLE ambitieuse qui fasse dire au joueur "il y a eu un vrai boulot, le jeu a changé de dimension".

CONTRAINTES STRICTES :
- Le jeu doit rester jouable et fluide (pas de chute FPS)
- Pas de changement de gameplay, UNIQUEMENT visuel et feel
- Chaque amélioration doit être ISOLÉE (un dev la codera seul sur son diff)
- Privilégier ce qui a un effet "wahou" visible immédiatement

INITIATIVE : propose ${N_CHANTIERS} améliorations DIVERSES réparties sur ces catégories :
- css        : refonte UI DOM (tokens, glows, gradients, typo, hiérarchie, hover)
- vfx        : effets Phaser (particules, flash, shake contextuel, trails)
- animation  : tweens sprites, barres HP animées, portraits, idle
- transition : entre états (spawn, victoire, mort, respawn, wave)
- juicy      : hit-stop, squash/stretch, number popups, recoil
- ambient    : ambiance par biome (teintes, particules fond, bokeh)

INSPIRATION : Balatro, Hades, Vampire Survivors, Slay the Spire. Le feel doit être riche, chaud, tactile.

Pour chaque chantier, produis un OBJET JSON précis avec :
{
  "id": "kebab-case-unique",
  "title": "Titre court (max 50 chars)",
  "pitch": "1 phrase : ce que le joueur verra changer",
  "category": "css|vfx|animation|transition|juicy|ambient",
  "files": ["src/xxx/fichier.js ou css"],
  "difficulty": "easy|medium|hard",
  "impact": "low|medium|high",
  "description": "3-4 phrases détaillées sur QUOI coder : quelle technique, quels paramètres approximatifs (durations, couleurs, eases), quel effet final."
}

Réponds UNIQUEMENT par un JSON valide sans commentaire :
{ "chantiers": [ {...}, {...}, ... ] }

Au moins ${N_CHANTIERS} chantiers. Privilégie impact élevé. Varie les catégories.` },
  ];

  const out = await callAgent({
    system,
    messages: [{ role: 'user', content: `Voici le code du jeu (25 fichiers). Propose ${N_CHANTIERS} chantiers de refonte visuelle.` }],
    maxTokens: 8192,
  });

  const parsed = extractJson(out);
  if (!Array.isArray(parsed.chantiers)) throw new Error('Stratège : pas de tableau "chantiers"');
  return parsed.chantiers;
}

// ── Phase 2 : Developer ───────────────────────────────────────────────────────
async function developer(ctxText, chantier) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es DEVELOPER expert Phaser.js + CSS moderne. Tu implémentes un chantier visuel précis.

Produis UNIQUEMENT un diff unifié applicable via \`git apply\`, au format :
--- a/chemin/fichier.js
+++ b/chemin/fichier.js
@@ -X,Y +A,B @@
 contexte_avant
+ligne ajoutée
-ligne retirée
 contexte_après

Règles :
- Respecte les indentations EXACTES du code existant
- Pas de commentaire hors du diff
- Si plusieurs fichiers : diff multiple dans le même bloc
- Code final lisible, commenté en français, performant
- Utilise les tokens CSS existants (var(--gold), var(--magic), etc.) quand pertinent
- Pour Phaser : utilise tweens chain, particles pool, scene.time.delayedCall
- Pas de refactor hors du scope du chantier` },
  ];

  const out = await callAgent({
    system,
    messages: [{
      role: 'user',
      content: `Chantier à implémenter :\n\n${JSON.stringify(chantier, null, 2)}\n\nProduis le diff complet.`
    }],
    maxTokens: 4096,
  });
  return out;
}

// ── Phase 3 : Reviewer ────────────────────────────────────────────────────────
async function reviewer(ctxText, chantier, patch) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es REVIEWER senior. Tu évalues si le patch implémente fidèlement le chantier décrit.

Critères :
1. Le diff répond-il au chantier (impact visuel réel) ?
2. Format diff valide (pas d'erreur de syntaxe) ?
3. Pas de régression probable (pas de casse du gameplay ou du layout) ?
4. Valeurs esthétiques raisonnables (durations, opacité, couleurs) ?
5. Performance OK (pas de tween infini non nettoyé, particules poolées) ?

Réponds UNIQUEMENT par un JSON strict :
{
  "approved": true|false,
  "quality_score": 1-10,
  "blockers": ["bug critique 1", ...],
  "suggestions": ["amélioration 1", ...],
  "visual_impact": "description courte de ce que le joueur va voir"
}` },
  ];

  const out = await callAgent({
    system,
    messages: [{
      role: 'user',
      content: `Chantier :\n${JSON.stringify(chantier, null, 2)}\n\nDiff à évaluer :\n\`\`\`diff\n${patch.slice(0, 6000)}\n\`\`\``
    }],
    maxTokens: 1024,
  });
  return extractJson(out);
}

// ── Phase 4 : Intégrateur ─────────────────────────────────────────────────────
async function integrator(approvedSummaries) {
  const system = [{ type: 'text', text: `Tu es INTÉGRATEUR. Tu reçois une liste de patches approuvés et tu proposes :
1. Un ordre d'application intelligent (regroupe par catégorie, commence par les CSS/tokens, finis par les effets complexes)
2. Identifie les conflits potentiels (2 patches touchent la même zone)
3. Propose un manifest Markdown qui explique au user quoi appliquer dans quel ordre

Réponds UNIQUEMENT par un JSON strict :
{
  "order": ["id1", "id2", ...],
  "potential_conflicts": [{"ids": ["idA", "idB"], "reason": "..."}],
  "manifest_markdown": "contenu complet du MANIFEST.md en markdown"
}` }];

  const out = await callAgent({
    system,
    messages: [{
      role: 'user',
      content: `Patches approuvés :\n\n${JSON.stringify(approvedSummaries, null, 2)}\n\nProduis l'ordre et le manifest.`
    }],
    maxTokens: 4096,
  });
  return extractJson(out);
}

// ── Orchestrateur ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  VISUAL OVERHAUL — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`  Budget : ${BUDGET_USD} $ max | Cible : ${N_CHANTIERS} chantiers`);
  console.log('══════════════════════════════════════════════════════\n');

  log('SYSTEM', 'Chargement du contexte repo (25 plus gros fichiers)…');
  const ctx = loadRepoContext();
  const ctxText = formatContextForPrompt(ctx);
  log('SYSTEM', `${Object.keys(ctx).length} fichiers, ~${Math.round(ctxText.length / 1000)}k chars (caché)`);

  // ── Phase 1 ──
  log('STRATEGIST', `Analyse stratégique + planification de ${N_CHANTIERS} chantiers…`);
  const chantiers = await strategist(ctxText);
  log('STRATEGIST', `${chantiers.length} chantiers planifiés`);
  budgetLog();
  assertBudget();

  // Persiste le plan brut
  fs.writeFileSync(
    path.join(OUT_DIR, '00-plan-strategist.json'),
    JSON.stringify(chantiers, null, 2)
  );

  // ── Phase 2 ──
  log('DEVELOPER', `Lancement de ${chantiers.length} developers en parallèle (batches de ${BATCH_SIZE})…`);
  const devResults = await runInBatches(chantiers, async (chantier) => {
    const patch = await developer(ctxText, chantier);
    return { chantier, patch };
  });
  const devOk = devResults
    .map((r, i) => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  log('DEVELOPER', `${devOk.length}/${chantiers.length} patches produits`);
  budgetLog();
  assertBudget();

  // ── Phase 3 ──
  log('REVIEWER', `Review des ${devOk.length} patches en parallèle…`);
  const reviewResults = await runInBatches(devOk, async ({ chantier, patch }) => {
    const review = await reviewer(ctxText, chantier, patch);
    return { chantier, patch, review };
  });
  const reviewed = reviewResults
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  const approved = reviewed.filter(r => r.review.approved);
  log('REVIEWER', `${approved.length}/${reviewed.length} patches approuvés`);
  budgetLog();
  assertBudget();

  // ── Sauvegarde des patches individuels ──
  log('SYSTEM', `Écriture des patches dans ${path.relative(ROOT, OUT_DIR)}/`);
  reviewed.forEach(({ chantier, patch, review }, i) => {
    const n = String(i + 1).padStart(2, '0');
    const slug = slugify(chantier.id || chantier.title);
    const status = review.approved ? 'APPROVED' : 'REJECTED';
    const filename = `${n}-${slug}`;
    fs.writeFileSync(path.join(OUT_DIR, `${filename}.patch`), patch);
    fs.writeFileSync(path.join(OUT_DIR, `${filename}.meta.json`), JSON.stringify({ chantier, review, status }, null, 2));
  });

  // ── Phase 4 ──
  const summaries = approved.map(({ chantier, review }) => ({
    id: chantier.id, title: chantier.title, category: chantier.category,
    impact: chantier.impact, difficulty: chantier.difficulty,
    files: chantier.files, visual_impact: review.visual_impact,
  }));

  log('INTEGRATOR', 'Calcul de l\'ordre d\'application + manifest…');
  let manifestContent;
  try {
    const integration = await integrator(summaries);
    manifestContent = integration.manifest_markdown;
  } catch (err) {
    log('SYSTEM', `Intégrateur a échoué (${err.message}) — manifest basique généré`);
    manifestContent = `# Visual Overhaul — Manifest\n\n` +
      approved.map((a, i) => `${i + 1}. **${a.chantier.title}** (${a.chantier.category}) — ${a.review.visual_impact}`).join('\n');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.md'), manifestContent);

  budgetLog();
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  MISSION TERMINÉE`);
  console.log(`  Coût total : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Patches approuvés : ${approved.length}/${chantiers.length}`);
  console.log(`  Sortie : ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`  Lire d'abord : MANIFEST.md`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  console.error(`Budget consommé avant crash : ${totalCostUSD.toFixed(3)} $`);
  process.exit(1);
});
