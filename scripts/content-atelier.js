#!/usr/bin/env node
/**
 * content-atelier.js — one-shot de génération de contenu massif.
 *
 * 8 agents en parallèle qui produisent du contenu data exploitable,
 * + peer review croisé, + validation locale, + consolidation MANIFEST.
 *
 * Coût cible : ~1.5 $ (hard cap à 5 $).
 * Rate limit safe : batches de 2 agents, pause 30s.
 *
 * Usage : npm run content-atelier
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────
const MODEL        = 'claude-sonnet-4-5-20250929';
const BATCH_SIZE   = 2;          // pour rester sous 30k tok/min
const BATCH_DELAY  = 30_000;     // 30 secondes entre batches
const BUDGET_USD   = 5.00;       // hard cap
const OUT_DIR      = path.join(__dirname, 'out', 'content-atelier');

const PRICE = {
  input:      3.00 / 1_000_000,
  output:    15.00 / 1_000_000,
  cacheWrite: 3.75 / 1_000_000,
  cacheRead:  0.30 / 1_000_000,
};

let totalCostUSD = 0;

// ── .env loader ──
function loadDotEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, 'utf8');
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
  console.error('❌ ANTHROPIC_API_KEY manquante');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'data'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'reviews'), { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(role, msg) {
  const tag = { AUDIT: '📋', GEN: '🎨', REVIEW: '🔍', CONSOLID: '📦', SYSTEM: '⚙️', BUDGET: '💰', OK: '✅', FAIL: '❌' }[role] || '•';
  console.log(`${tag}  [${role}]  ${msg}`);
}

function trackUsage(u) {
  const cost =
    (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
    (u.cache_read_input_tokens     || 0) * PRICE.cacheRead +
    (u.input_tokens                || 0) * PRICE.input +
    (u.output_tokens               || 0) * PRICE.output;
  totalCostUSD += cost;
  return cost;
}

function budgetLog() {
  const pct = (totalCostUSD / BUDGET_USD * 100).toFixed(1);
  log('BUDGET', `${totalCostUSD.toFixed(3)} $ / ${BUDGET_USD} $ (${pct}%)`);
}

function assertBudget() {
  if (totalCostUSD >= BUDGET_USD) {
    log('SYSTEM', `⛔ Budget ${BUDGET_USD} $ atteint. Arrêt.`);
    throw new Error('BUDGET_EXCEEDED');
  }
}

async function callAgent({ system, messages, maxTokens = 4096 }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });
  trackUsage(resp.usage);
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractJson(text) {
  // Essai 1 : tout le texte est du JSON
  try { return JSON.parse(text); } catch {}
  // Essai 2 : bloc entre ``` (avec ou sans json)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // Essai 3 : premier { ... } balancé
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch {}
  }
  // Essai 4 : premier [ ... ] balancé
  const firstA = text.indexOf('[');
  const lastA = text.lastIndexOf(']');
  if (firstA >= 0 && lastA > firstA) {
    try { return JSON.parse(text.slice(firstA, lastA + 1)); } catch {}
  }
  throw new Error('JSON invalide : ' + text.slice(0, 300));
}

async function runInBatches(items, worker, label) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    log('SYSTEM', `${label} — batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} (${batch.length} agents)`);
    const batchResults = await Promise.allSettled(batch.map(worker));
    results.push(...batchResults);
    budgetLog();
    try { assertBudget(); } catch { break; }
    if (i + BATCH_SIZE < items.length) {
      log('SYSTEM', `Pause ${BATCH_DELAY / 1000}s (rate limit)…`);
      await sleep(BATCH_DELAY);
    }
  }
  return results;
}

// ── Contexte : lit les data existants du jeu ──────────────────────────────────
function loadExistingData() {
  const files = ['heroes.js', 'items.js', 'missions.js', 'talents.js', 'monsters.js', 'biomes.js', 'balance.js', 'grades.js'];
  const data = {};
  for (const f of files) {
    const full = path.join(ROOT, 'src', 'data', f);
    if (fs.existsSync(full)) data[f] = fs.readFileSync(full, 'utf8');
  }
  return data;
}

function formatDataForPrompt(data) {
  return Object.entries(data)
    .map(([f, c]) => `### src/data/${f}\n\`\`\`javascript\n${c.slice(0, 5000)}\n\`\`\``)
    .join('\n\n');
}

// ── Définition des 8 thèmes de génération ─────────────────────────────────────
const THEMES = [
  {
    id: 'lore',
    label: 'Loremaster',
    file: 'lore.js',
    brief: `Produis un objet JavaScript exporté qui contient :
- heroBios: objet { heroId: { fullName, title, birthplace, origin (paragraphe 60-80 mots), personality, signatureQuote } } pour les 20 héros listés dans heroes.js
- biomeLore: objet { biomeId: { oldName, history (80-100 mots), inhabitants, famousEvent } } pour les 6 biomes
- worldTimeline: array de 10 événements marquants [{ year, title, description }]
- legends: 5 légendes courtes du monde { id, title, text (50-70 mots) }

Format final : \`export const LORE = { heroBios, biomeLore, worldTimeline, legends };\``,
    outputType: 'js-module',
  },
  {
    id: 'items-epic',
    label: 'Item Designer',
    file: 'items-extended.js',
    brief: `Produis 50 items au format de items.js existant :
- 20 items ÉPIQUES (rarity: 'epic')
- 20 items LÉGENDAIRES (rarity: 'legendary')
- 10 items MYTHIQUES (rarity: 'mythic' — nouveau tier)

Chaque item : { id (unique kebab-case), name, rarity, slot (weapon|armor|trinket|accessory), level (1-50), stats (hp/atk/critRate/critDmg/dodge selon pertinence), effect (texte 20 mots max décrivant un bonus unique), flavor (phrase lore 15 mots max) }.

IDs préfixés : 'epic_xxx', 'leg_xxx', 'myth_xxx'. Balance : epics = +20% stats vs rares, legendary = +50%, mythic = +100% mais très rares.

Format final : \`export const ITEMS_EXTENDED = [ {...}, {...} ];\``,
    outputType: 'js-module',
  },
  {
    id: 'missions',
    label: 'Mission Writer',
    file: 'missions-extended.js',
    brief: `Produis 80 missions variées au format de missions.js existant :
- 30 daily (type: 'daily', reset quotidien) : kill N monstres, dépenser N or, gagner N xp, etc.
- 30 weekly (type: 'weekly', reset hebdo) : finir N vagues, battre N boss, trouver N items rares
- 20 seasonal (type: 'seasonal') : objectifs long terme avec récits narratifs courts

Chaque mission : { id (unique), type, label (titre), description (1 phrase d'ambiance), target (number), tracker (kills|gold|boss_kills|wave_reached|items_equipped|prestige|...), reward: { gold, gems, xp } }.

Balance : daily donne 100-500 or, weekly 500-2000 or + 10 gemmes, seasonal 2000+ or + item rare garanti.

Format final : \`export const MISSIONS_EXTENDED = [ {...}, {...} ];\``,
    outputType: 'js-module',
  },
  {
    id: 'talents',
    label: 'Talent Master',
    file: 'talents-trees.js',
    brief: `Produis 4 arbres de talents complets (un par classe : warrior, archer, mage, healer). Chaque arbre = 7 nœuds × 4 tiers (28 talents par arbre = 112 total).

Format par talent : { id (unique), class, tier (1-4), nodeIndex (0-6), name, description, cost (points de talent, 1-3), effect: { stat: value } (hp_mult, atk_mult, crit_rate, etc.), prerequisites (array d'IDs talents) }.

Les tiers 1 débloquent sans prerequisite. Tier 2 requiert 1 talent du tier 1. Etc. Mix de boosts passifs et d'effets actifs. Thème cohérent par classe (warrior = tank/rage, archer = crit/range, mage = aoe/burn, healer = support/shield).

Format final : \`export const TALENTS_TREES = { warrior: [...], archer: [...], mage: [...], healer: [...] };\``,
    outputType: 'js-module',
  },
  {
    id: 'achievements',
    label: 'Achievement Builder',
    file: 'achievements-v2.js',
    brief: `Produis 40 achievements supplémentaires au format du système actuel (trackers : kills, boss_kills, total_gold, max_wave, items_equipped, heroes_owned, dungeon_clears, full_sets, prestiges, infinite_wave).

Chaque achievement : { id (unique), name, description, tracker, threshold (number), reward: { gold, gems } }.

Thèmes : combat (10), collection (10), prestige/long-terme (10), absurdes/comiques (10). Ex: "Le Collectionneur", "Mort 100 fois", "Sans jamais perdre un héros", "1 million d'or en banque".

Format final : \`export const ACHIEVEMENTS_V2 = [ {...}, {...} ];\``,
    outputType: 'js-module',
  },
  {
    id: 'balance',
    label: 'Balance Auditor',
    file: 'balance-tables.js',
    brief: `Produis les tables d'équilibrage complètes :
- heroStatsByGrade: { [grade]: { hpMult, atkMult, speedMult } } pour grades 1-5
- levelCurves: { xpToNext: fonction ou tableau pour niveaux 1-100, goldPerWave: tableau, lootDropRate: tableau }
- gachaPity: { rrPity, srPity, ssrPity, urPity, rateUps }
- prestigeFormula: { soulPointsFromWave: formula, soulPointsCost: { talent1, talent2, ... } }

Format final : \`export const BALANCE_TABLES = { heroStatsByGrade, levelCurves, gachaPity, prestigeFormula };\` + commentaires JSDoc qui expliquent les choix.`,
    outputType: 'js-module',
  },
  {
    id: 'bosses',
    label: 'Boss Designer',
    file: 'bosses-extended.js',
    brief: `Produis 12 boss uniques avec mécaniques spéciales (différents des monstres existants dans monsters.js). 2 boss par biome (6 biomes × 2).

Chaque boss : { id, name, biome, triggerWave, hp, atk, mechanics: [ {id, name, trigger (hp_threshold|turn|periodic), effect (summon|aoe|buff|phase_change), description (20 mots) } ], dialogueIntro (phrase dramatique), dialogueDefeat (phrase mémorable) }.

Mécaniques variées : enrage à 50% HP, summon adds, phase changes, AOE télégraphé, buffs d'alliés.

Format final : \`export const BOSSES_EXTENDED = [ {...}, {...} ];\``,
    outputType: 'js-module',
  },
  {
    id: 'events',
    label: 'Event Scripter',
    file: 'events-calendar.js',
    brief: `Produis 15 événements temporaires scénarisés :
- 6 saisonniers (Halloween, Noël, Pâques, Été, Printemps, Automne)
- 5 chronoweek (mini-events hebdo aléatoires)
- 4 événements spéciaux (double XP weekend, lucky drops, boss rush, etc.)

Chaque événement : { id, name, type (seasonal|chronoweek|special), duration (hours), startTrigger (date_range|random|manual), modifiers: [ {type, value, description} ], uniqueReward (un item/héros/cosmétique exclusif), lore (petit récit 40-60 mots).

Ex : Halloween → spawn monstres fantômes, drop rate citrouilles ×5, obtient skin "Commandant Sorcier" exclusif.

Format final : \`export const EVENTS_CALENDAR = [ {...}, {...} ];\``,
    outputType: 'js-module',
  },
];

// ── Phase 1 : Audit ───────────────────────────────────────────────────────────
async function phaseAudit(dataText) {
  log('AUDIT', 'Lecture des data files + établissement du brief global…');
  const system = [
    { type: 'text', text: dataText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es AUDITEUR de contenu. Tu vois les data du jeu. Ton but : produire un brief court et factuel qui servira aux 8 générateurs.
Structure ton output en JSON strict :
{
  "game_feel": "2 phrases qui capturent l'ambiance du jeu (fantasy dark, auto-battler, etc.)",
  "existing_ids_to_avoid": ["hero_id_1", "item_id_1", ...],
  "naming_conventions": "conventions kebab-case observées",
  "tone_of_voice": "3 adjectifs"
}` },
  ];
  const out = await callAgent({
    system,
    messages: [{ role: 'user', content: 'Analyse et produis le brief JSON.' }],
    maxTokens: 1024,
  });
  return extractJson(out);
}

// ── Phase 2 : Génération ──────────────────────────────────────────────────────
async function generateTheme(theme, dataText, auditBrief) {
  const system = [
    { type: 'text', text: dataText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es ${theme.label} pour un jeu idle auto-battler fantasy.

BRIEF GLOBAL :
${JSON.stringify(auditBrief, null, 2)}

TA MISSION :
${theme.brief}

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT par du code JavaScript valide, sans markdown, sans prose
- Tous les IDs doivent être uniques dans ton output ET ne pas collider avec les IDs existants listés dans le brief
- Respecte strictement le format demandé et les conventions (kebab-case, etc.)
- Contenu cohérent avec le tone_of_voice du brief`},
  ];
  return callAgent({
    system,
    messages: [{ role: 'user', content: `Produis le contenu complet pour "${theme.label}". Réponds par le module JavaScript exporté.` }],
    maxTokens: 8192,
  });
}

// ── Phase 3 : Peer review ─────────────────────────────────────────────────────
async function peerReview(theme, content, otherThemeSummaries, dataText) {
  const system = [
    { type: 'text', text: dataText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es REVIEWER. Tu évalues un output de contenu produit par un autre agent.

Critères :
1. Syntaxe JS valide (peut être importée telle quelle)
2. IDs uniques dans le fichier (pas de doublons)
3. Cohérence interne (champs présents, valeurs dans des plages raisonnables)
4. Cohérence narrative avec le reste du contenu (pas contradictoire avec les autres thèmes)
5. Équilibrage raisonnable (pas d'items cassés OP)

Réponds en JSON strict :
{
  "score": 1-10,
  "approved": true|false,
  "issues": ["bug 1", "bug 2"],
  "suggestions": ["suggestion 1"],
  "one_line_summary": "ce qui a été produit en 1 phrase"
}` },
  ];

  const userContent = `Content à reviewer (thème ${theme.label}) :
\`\`\`javascript
${content.slice(0, 6000)}
\`\`\`

Autres thèmes produits (résumés) :
${otherThemeSummaries}

Produis ton review JSON.`;

  return callAgent({
    system,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: 1024,
  });
}

// ── Phase 4 : Consolidation (MANIFEST) ────────────────────────────────────────
async function consolidate(results) {
  const system = [{ type: 'text', text: `Tu es CONSOLIDATEUR. Tu reçois la liste des contenus produits + leurs reviews et tu produis un MANIFEST Markdown qui :
1. Liste chaque fichier produit avec son score de review et son résumé
2. Propose un ordre d'intégration dans le code (du plus safe au plus impactant)
3. Identifie les dépendances entre fichiers (ex: achievements a besoin des trackers déjà en place)
4. Liste les actions à faire côté code pour intégrer (par fichier : "importer dans X", "ajouter au registre Y")

Réponds par le Markdown complet, sans ajouter de guillemets autour.` }];

  const items = results.map(r => `- **${r.theme.label}** (${r.theme.file}) : score ${r.review?.score || '?'}/10, ${r.review?.one_line_summary || 'aucun résumé'}${r.review?.issues?.length ? '. Issues: ' + r.review.issues.join('; ') : ''}`).join('\n');

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Contenus produits :\n${items}\n\nProduis le MANIFEST Markdown.` }],
    maxTokens: 2048,
  });
}

// ── Orchestrateur ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  CONTENT ATELIER — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`  Budget hard : ${BUDGET_USD} $ | Thèmes : ${THEMES.length}`);
  console.log('══════════════════════════════════════════════════════\n');

  // Charge les data existants
  log('SYSTEM', 'Chargement des data files existants…');
  const existingData = loadExistingData();
  const dataText = formatDataForPrompt(existingData);
  log('SYSTEM', `${Object.keys(existingData).length} fichiers data chargés (${Math.round(dataText.length / 1000)}k chars)`);

  // Phase 1 — Audit
  let auditBrief;
  try {
    auditBrief = await phaseAudit(dataText);
    log('AUDIT', `Brief établi (${Object.keys(auditBrief).length} clés)`);
    fs.writeFileSync(path.join(OUT_DIR, 'audit-brief.json'), JSON.stringify(auditBrief, null, 2));
  } catch (e) {
    log('FAIL', `Audit failed: ${e.message}`);
    auditBrief = { game_feel: 'fantasy idle auto-battler', existing_ids_to_avoid: [], naming_conventions: 'kebab-case', tone_of_voice: 'sombre, héroïque, mystérieux' };
  }
  budgetLog();

  // Phase 2 — Génération parallèle
  log('GEN', `Lancement de ${THEMES.length} générateurs en parallèle (batches de ${BATCH_SIZE})…`);
  const genResults = await runInBatches(THEMES, async (theme) => {
    const content = await generateTheme(theme, dataText, auditBrief);
    const outPath = path.join(OUT_DIR, 'data', theme.file);
    fs.writeFileSync(outPath, content);
    return { theme, content, outPath };
  }, 'GÉNÉRATION');

  const produced = genResults
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  log('GEN', `${produced.length}/${THEMES.length} contenus produits`);
  budgetLog();

  if (produced.length === 0) {
    log('FAIL', 'Aucun contenu produit — arrêt');
    return;
  }

  // Phase 3 — Peer review croisé
  // Chaque agent review le travail du SUIVANT dans la liste (wraparound).
  log('REVIEW', `Peer review croisé (${produced.length} reviews)…`);
  const summaries = produced.map(p => `[${p.theme.label}] : ${p.content.split('\n')[0].slice(0, 80)}`).join('\n');

  const reviewResults = await runInBatches(produced, async ({ theme, content }, idx) => {
    const review = await peerReview(theme, content, summaries, dataText);
    const parsed = extractJson(review);
    fs.writeFileSync(path.join(OUT_DIR, 'reviews', `${theme.id}-review.json`), JSON.stringify(parsed, null, 2));
    return { theme, review: parsed };
  }, 'REVIEW');

  // Merge reviews avec produced
  const withReviews = produced.map((p, i) => {
    const r = reviewResults[i];
    return {
      theme: p.theme,
      content: p.content,
      outPath: p.outPath,
      review: r?.status === 'fulfilled' ? r.value.review : null,
    };
  });

  // Phase 4 — Consolidation
  log('CONSOLID', 'Génération du MANIFEST final…');
  try {
    const manifest = await consolidate(withReviews);
    fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.md'), manifest);
  } catch (e) {
    log('FAIL', `Consolidation failed: ${e.message}. Manifest basique écrit.`);
    const basic = '# MANIFEST — Content Atelier\n\n' + withReviews.map(w => `- **${w.theme.label}** (${w.theme.file}) — score ${w.review?.score || '?'}/10`).join('\n');
    fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.md'), basic);
  }

  // ── Rapport final ──
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  MISSION TERMINÉE`);
  console.log(`  Coût total : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Contenus produits : ${produced.length}/${THEMES.length}`);
  console.log(`  Reviews effectuées : ${reviewResults.filter(r => r.status === 'fulfilled').length}/${produced.length}`);
  console.log(`  Sortie : ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`  Lire : MANIFEST.md + data/*.js + reviews/*.json`);
  console.log(`\n  💡 Étape suivante : lance "npm run validate-content" pour vérifier la syntaxe/IDs/schémas`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  console.error(`Budget consommé : ${totalCostUSD.toFixed(3)} $`);
});
