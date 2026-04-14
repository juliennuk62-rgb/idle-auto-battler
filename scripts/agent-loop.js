#!/usr/bin/env node
/**
 * agent-loop.js — orchestrateur multi-agents autonome.
 *
 * 3 agents qui dialoguent pour implémenter une tâche :
 *   1. Planner   : décompose la tâche en étapes concrètes
 *   2. Developer : écrit le code qui correspond
 *   3. Reviewer  : critique, propose des corrections
 *
 * Boucle Developer ↔ Reviewer jusqu'à validation ou N itérations.
 * À la fin, produit un fichier .patch dans scripts/out/ que tu review
 * à la main avant de l'appliquer.
 *
 * Usage :
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node scripts/agent-loop.js "Ajouter un tracker items_equipped dans ItemSystem.equip()"
 *
 * Coût estimé : ~0,30-0,80 € par run selon complexité (Sonnet 4.5).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

const MODEL      = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 3;              // cycles Developer↔Reviewer max
const OUT_DIR    = path.join(__dirname, 'out');

// ── Chargement .env (si présent, utile pour ne pas retaper la clé à chaque run) ──
// Lit un fichier .env simple : KEY=VALUE par ligne, ignore les # commentaires et lignes vides.
// Les variables d'environnement déjà définies NE sont PAS écrasées (priorité au shell).
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  // Retire le BOM UTF-8 si présent (Notepad Windows l'ajoute parfois)
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Retire les guillemets s'ils entourent la valeur
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // ⚠️ .env a la priorité sur les variables d'environnement système
    // (évite les conflits avec une ancienne clé set/setx dans Windows)
    process.env[key] = value;
  }
}
loadDotEnv();

// ── Init ──────────────────────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY non définie.');
  console.error('   Option 1 (recommandée) : crée un fichier .env à la racine avec :');
  console.error('     ANTHROPIC_API_KEY=sk-ant-ta-nouvelle-cle');
  console.error('   Option 2 : exporte la variable dans ton terminal avant de lancer.');
  process.exit(1);
}
const task = process.argv.slice(2).join(' ').trim();
if (!task) {
  console.error('❌ Usage : node scripts/agent-loop.js "description de la tâche"');
  process.exit(1);
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(role, msg) {
  const tag = { PLANNER: '🧭', DEVELOPER: '🛠️', REVIEWER: '🔍', SYSTEM: '⚙️' }[role] || '•';
  console.log(`\n${tag}  [${role}]  ${msg}`);
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

/** Lit les fichiers sources pertinents (cap à 20 pour coût). */
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
  // On ne passe que les 20 plus gros pour garder le context bornable
  const sorted = files
    .map(f => ({ f, size: fs.statSync(path.join(ROOT, f)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);
  const ctx = {};
  for (const { f } of sorted) ctx[f] = readFileSafe(path.join(ROOT, f)) || '';
  return ctx;
}

function formatContextForPrompt(ctx) {
  return Object.entries(ctx)
    .map(([p, c]) => `### ${p}\n\`\`\`javascript\n${c.slice(0, 3500)}\n\`\`\``)
    .join('\n\n');
}

async function callAgent({ system, messages, maxTokens = 2048 }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
}

// ── Agent 1 : Planner ─────────────────────────────────────────────────────────
async function planner(task, ctxText) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es PLANNER pour un jeu Phaser idle auto-battler.
Analyse la tâche et décompose-la en étapes concrètes.
Réponds UNIQUEMENT en JSON valide, rien d'autre :
{
  "summary": "1 phrase",
  "files_to_modify": ["chemin/relatif/file1.js", ...],
  "steps": [{"file": "...", "change": "description courte"}],
  "risk": "low|medium|high",
  "estimated_lines": 12
}` },
  ];
  const out = await callAgent({
    system,
    messages: [{ role: 'user', content: `Tâche : ${task}` }],
    maxTokens: 1024,
  });
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Planner a produit du non-JSON : ' + out.slice(0, 200));
  return JSON.parse(match[0]);
}

// ── Agent 2 : Developer ───────────────────────────────────────────────────────
async function developer(task, plan, ctxText, previousCritique = null) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es DEVELOPER. Tu écris le code qui implémente exactement le plan reçu.
Produis UNIQUEMENT un diff unifié applicable avec git apply, au format :
--- a/chemin/fichier.js
+++ b/chemin/fichier.js
@@ -X,Y +A,B @@
   contexte_avant
+  ligne ajoutée
-  ligne retirée
   contexte_après

Pas d'explication hors du diff. Respecte les indentations EXACTES du code existant.` },
  ];
  const userContent = previousCritique
    ? `Tâche : ${task}\n\nPlan :\n${JSON.stringify(plan, null, 2)}\n\n⚠️ Critique du reviewer (prends-la en compte) :\n${previousCritique}`
    : `Tâche : ${task}\n\nPlan :\n${JSON.stringify(plan, null, 2)}`;
  return callAgent({
    system,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 4096,
  });
}

// ── Agent 3 : Reviewer ────────────────────────────────────────────────────────
async function reviewer(task, plan, patch, ctxText) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es REVIEWER. Tu évalues un diff produit par le Developer.
Vérifie : 1) le diff applique réellement le plan, 2) pas de bug évident, 3) respect des conventions du projet, 4) pas de régression évidente.

Réponds en JSON strict :
{
  "approved": true|false,
  "blockers": ["problème critique 1", ...],
  "suggestions": ["amélioration facultative", ...]
}

Si "approved" est true, les blockers doivent être vides.` },
  ];
  const out = await callAgent({
    system,
    messages: [{ role: 'user', content: `Tâche : ${task}\n\nPlan :\n${JSON.stringify(plan, null, 2)}\n\nDiff produit :\n\`\`\`diff\n${patch}\n\`\`\`` }],
    maxTokens: 1024,
  });
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Reviewer a produit du non-JSON : ' + out.slice(0, 200));
  return JSON.parse(match[0]);
}

// ── Orchestrateur ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Multi-agent dev loop — ${new Date().toLocaleString('fr-FR')}`);
  console.log('══════════════════════════════════════════════════════');
  log('SYSTEM', `Tâche : ${task}`);

  log('SYSTEM', 'Chargement du contexte repo…');
  const ctx     = loadRepoContext();
  const ctxText = formatContextForPrompt(ctx);
  const ctxSize = Math.round(ctxText.length / 1000);
  log('SYSTEM', `${Object.keys(ctx).length} fichiers chargés (~${ctxSize}k chars, cachés pour réduire les coûts)`);

  log('PLANNER', 'Décomposition de la tâche…');
  const plan = await planner(task, ctxText);
  log('PLANNER', `Plan (risque ${plan.risk}) :\n  Résumé    : ${plan.summary}\n  Fichiers  : ${plan.files_to_modify.join(', ')}\n  Étapes    : ${plan.steps.length}`);
  if (plan.risk === 'high') {
    log('SYSTEM', '⛔ Risque élevé — arrêt. Review manuel recommandé.');
    process.exit(2);
  }

  let patch = '';
  let critique = null;
  let approved = false;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    log('DEVELOPER', `Round ${round}/${MAX_ROUNDS} — génération du diff…`);
    patch = await developer(task, plan, ctxText, critique);
    log('DEVELOPER', `${patch.split('\n').length} lignes de diff produites`);

    log('REVIEWER', 'Analyse du diff…');
    const review = await reviewer(task, plan, patch, ctxText);
    if (review.approved && review.blockers.length === 0) {
      log('REVIEWER', `✅ Approuvé. Suggestions : ${review.suggestions.length || 0}`);
      approved = true;
      break;
    } else {
      critique = `Blockers :\n- ${review.blockers.join('\n- ')}${review.suggestions.length ? '\n\nSuggestions :\n- ' + review.suggestions.join('\n- ') : ''}`;
      log('REVIEWER', `❌ Rejeté. ${review.blockers.length} blocker(s). On reboucle.`);
    }
  }

  if (!approved) {
    log('SYSTEM', `⚠️ Non approuvé après ${MAX_ROUNDS} rounds. Patch produit quand même pour review humain.`);
  }

  // ── Sortie ──
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const patchPath  = path.join(OUT_DIR, `${stamp}.patch`);
  const reportPath = path.join(OUT_DIR, `${stamp}.md`);
  fs.writeFileSync(patchPath, patch);
  fs.writeFileSync(reportPath,
    `# Multi-agent dev loop report\n\n**Tâche** : ${task}\n\n**Approuvé** : ${approved ? '✅' : '⚠️ NON — à reviewer à la main'}\n\n## Plan\n\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\`\n\n## Patch\n\n\`\`\`diff\n${patch}\n\`\`\`\n`
  );

  log('SYSTEM', `📄 Patch  → ${path.relative(ROOT, patchPath)}`);
  log('SYSTEM', `📄 Report → ${path.relative(ROOT, reportPath)}`);
  log('SYSTEM', `\nPour appliquer : git apply "${path.relative(ROOT, patchPath)}"`);
  log('SYSTEM', `Pour annuler  : (rien à annuler — le patch n'a pas été appliqué)`);
}

main().catch(err => {
  console.error('\n❌ Erreur orchestrateur :', err.message);
  process.exit(1);
});
