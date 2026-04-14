#!/usr/bin/env node
/**
 * content-finisher.js — reprend les 3 fichiers tronqués par le content-atelier
 * et les régénère en splittant chaque thème en sous-appels plus petits,
 * pour éviter la limite max_tokens=8192 qui avait causé la troncature.
 *
 * Split :
 *   lore.js           → 2 appels (bios héros / biomes+timeline+légendes)
 *   missions-extended → 3 appels (daily / weekly / seasonal)
 *   talents-trees     → 4 appels (1 par classe)
 *
 * Total : 9 sous-appels, cout cible ~0.60 $, budget hard 1.50 $.
 *
 * Usage : npm run content-finisher
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const OUT_DIR    = path.join(__dirname, 'out', 'content-atelier', 'data');

const MODEL        = 'claude-sonnet-4-5-20250929';
const BATCH_SIZE   = 2;
const BATCH_DELAY  = 30_000;
const BUDGET_USD   = 1.50;

const PRICE = {
  input:      3.00 / 1_000_000,
  output:    15.00 / 1_000_000,
  cacheWrite: 3.75 / 1_000_000,
  cacheRead:  0.30 / 1_000_000,
};

let totalCostUSD = 0;

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

function log(role, msg) {
  const tag = { FINISH: '🔧', BUDGET: '💰', OK: '✅', FAIL: '❌', SYSTEM: '⚙️' }[role] || '•';
  console.log(`${tag}  [${role}]  ${msg}`);
}

function trackUsage(u) {
  const cost =
    (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
    (u.cache_read_input_tokens     || 0) * PRICE.cacheRead +
    (u.input_tokens                || 0) * PRICE.input +
    (u.output_tokens               || 0) * PRICE.output;
  totalCostUSD += cost;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callAgent({ system, messages, maxTokens = 6000 }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  });
  trackUsage(resp.usage);
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
}

function cleanOutput(text) {
  // Retire les fences Markdown
  let out = text
    .replace(/^```(?:javascript|js|json)?\s*\n/gm, '')
    .replace(/^```\s*$/gm, '')
    .trim();
  return out;
}

// ── Configuration des sub-tasks par thème cassé ──────────────────────────────
const TASKS = [
  // ── LORE.JS ──
  {
    theme: 'lore',
    subtask: 'heroBios',
    maxTokens: 6000,
    prompt: `Produis uniquement un objet JavaScript \`heroBios\` avec les bios de 20 héros.
Format strict (sans commentaires, sans fence Markdown) :
const heroBios = {
  "hero_id_1": { fullName, title, birthplace, origin, personality, signatureQuote },
  // ... 19 autres
};
Les champs origin et personality font 40-60 mots chacun. signatureQuote = 1 phrase mémorable.
IDs : utilise des identifiants cohérents (warrior_paladin_01, archer_ranger_01, mage_pyromancer_01, healer_priestess_01, etc. — 5 par classe, 4 classes = 20 héros).
Réponds avec UNIQUEMENT la déclaration const heroBios = {...};`,
  },
  {
    theme: 'lore',
    subtask: 'worldAndLegends',
    maxTokens: 4000,
    prompt: `Produis 3 constantes JavaScript :
1. const biomeLore = { "forest"|"caves"|"ruins"|"hell"|"snow"|"temple": { oldName, history (80 mots), inhabitants, famousEvent } }
2. const worldTimeline = [ { year, title, description (30 mots) }, ... ] — 10 événements
3. const legends = [ { id, title, text (50 mots) }, ... ] — 5 légendes
Réponds avec les 3 constantes à la suite, rien d'autre, pas de fence Markdown.`,
  },
  // ── MISSIONS-EXTENDED.JS ──
  {
    theme: 'missions-extended',
    subtask: 'daily',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const missionsDaily\` contenant 30 missions quotidiennes.
Format strict par item : { id (unique kebab-case préfixé daily_), type: 'daily', label, description (1 phrase), target (number), tracker (parmi : kills, gold_earned, boss_kills, wave_reached, items_equipped, heroes_owned), reward: { gold, gems, xp } }.
Balance : daily donne 100-500 or, 1-3 gemmes, 50-200 xp.
Réponds par \`const missionsDaily = [...];\` uniquement, pas de fence Markdown.`,
  },
  {
    theme: 'missions-extended',
    subtask: 'weekly',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const missionsWeekly\` contenant 30 missions hebdomadaires.
Format par item : { id (unique kebab-case préfixé weekly_), type: 'weekly', label, description (1 phrase), target (number), tracker, reward: { gold, gems, xp } }.
Balance : weekly donne 500-2000 or, 10-30 gemmes, 300-800 xp.
Trackers : kills, boss_kills, wave_reached, items_equipped, heroes_owned, gold_earned, dungeon_clears.
Réponds par \`const missionsWeekly = [...];\` uniquement, pas de fence Markdown.`,
  },
  {
    theme: 'missions-extended',
    subtask: 'seasonal',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const missionsSeasonal\` contenant 20 missions saisonnières avec descriptions narratives courtes.
Format : { id (kebab-case préfixé seasonal_), type: 'seasonal', label, description (1-2 phrases d'ambiance), target (number), tracker, reward: { gold, gems, xp } }.
Balance : seasonal donne 2000-10000 or, 50-200 gemmes, 1000-3000 xp.
Réponds par \`const missionsSeasonal = [...];\` uniquement, pas de fence Markdown.`,
  },
  // ── TALENTS-TREES.JS ──
  {
    theme: 'talents-trees',
    subtask: 'warriorTree',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const warriorTree\` contenant 28 talents warrior (7 nœuds × 4 tiers).
Format par item : { id (préfixé w_), class: 'warrior', tier (1-4), nodeIndex (0-6), name, description, cost (1-3 points), effect: { hp_mult|atk_mult|crit_rate|crit_dmg|defense_mult: value (fraction 0.05-0.3) }, prerequisites (array d'IDs) }.
Thème : tank, rage, défense, absorption. Tier 1 = aucun prerequisite, chaque tier suivant requiert au moins 1 talent du tier précédent.
Réponds par \`const warriorTree = [...];\` uniquement, pas de fence Markdown.`,
  },
  {
    theme: 'talents-trees',
    subtask: 'archerTree',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const archerTree\` contenant 28 talents archer (7 nœuds × 4 tiers).
Format : { id (préfixé a_), class: 'archer', tier, nodeIndex, name, description, cost, effect (crit_rate, crit_dmg, range_mult, multi_shot_chance, etc.), prerequisites }.
Thème : crit, portée, multi-coup, précision.
Réponds par \`const archerTree = [...];\` uniquement, pas de fence Markdown.`,
  },
  {
    theme: 'talents-trees',
    subtask: 'mageTree',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const mageTree\` contenant 28 talents mage (7 nœuds × 4 tiers).
Format : { id (préfixé m_), class: 'mage', tier, nodeIndex, name, description, cost, effect (aoe_mult, burn_dot, mana_regen, spell_crit, etc.), prerequisites }.
Thème : AoE, sorts, brûlure, contrôle.
Réponds par \`const mageTree = [...];\` uniquement, pas de fence Markdown.`,
  },
  {
    theme: 'talents-trees',
    subtask: 'healerTree',
    maxTokens: 6000,
    prompt: `Produis un array JavaScript \`const healerTree\` contenant 28 talents healer (7 nœuds × 4 tiers).
Format : { id (préfixé h_), class: 'healer', tier, nodeIndex, name, description, cost, effect (heal_mult, shield_value, buff_duration, revive_hp_pct, etc.), prerequisites }.
Thème : soin, bouclier, buffs, résurrection.
Réponds par \`const healerTree = [...];\` uniquement, pas de fence Markdown.`,
  },
];

// ── Exécution ────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  CONTENT FINISHER — budget hard ${BUDGET_USD} $`);
  console.log(`  ${TASKS.length} sub-tasks à traiter`);
  console.log('══════════════════════════════════════════════════════\n');

  const resultsByTheme = {};

  // Exécute en batches de 2 avec pause
  for (let i = 0; i < TASKS.length; i += BATCH_SIZE) {
    const batch = TASKS.slice(i, i + BATCH_SIZE);
    log('SYSTEM', `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TASKS.length / BATCH_SIZE)} (${batch.length} agents)`);

    const batchResults = await Promise.allSettled(batch.map(async (task) => {
      const system = [{ type: 'text', text: `Tu es un générateur de contenu pour un jeu idle auto-battler fantasy. Tu produis du JavaScript valide, sans fence Markdown, sans prose. Le code doit être syntaxiquement complet et parsable.` }];
      const content = await callAgent({
        system,
        messages: [{ role: 'user', content: task.prompt }],
        maxTokens: task.maxTokens,
      });
      return { task, content: cleanOutput(content) };
    }));

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        const { task, content } = r.value;
        if (!resultsByTheme[task.theme]) resultsByTheme[task.theme] = [];
        resultsByTheme[task.theme].push({ subtask: task.subtask, content });
        log('OK', `${task.theme} / ${task.subtask} : ${content.length} chars`);
      } else {
        log('FAIL', `${r.reason?.message || '?'}`);
      }
    }

    const pct = (totalCostUSD / BUDGET_USD * 100).toFixed(1);
    log('BUDGET', `${totalCostUSD.toFixed(3)} $ / ${BUDGET_USD} $ (${pct}%)`);

    if (totalCostUSD >= BUDGET_USD) {
      log('SYSTEM', '⛔ Budget atteint, arrêt');
      break;
    }

    if (i + BATCH_SIZE < TASKS.length) {
      log('SYSTEM', `Pause ${BATCH_DELAY / 1000}s (rate limit)…`);
      await sleep(BATCH_DELAY);
    }
  }

  // ── Assemblage des fichiers finaux ──
  log('SYSTEM', '\nAssemblage des fichiers finaux…');

  // LORE : heroBios + worldAndLegends
  if (resultsByTheme.lore) {
    const parts = resultsByTheme.lore;
    const heroBios = parts.find(p => p.subtask === 'heroBios')?.content || '';
    const worldAndLegends = parts.find(p => p.subtask === 'worldAndLegends')?.content || '';
    const merged = `// Généré par content-finisher.js\n\n${heroBios}\n\n${worldAndLegends}\n\nexport const LORE = { heroBios, biomeLore, worldTimeline, legends };\n`;
    fs.writeFileSync(path.join(OUT_DIR, 'lore.js'), merged);
    log('OK', `lore.js assemblé (${merged.length} chars)`);
  }

  // MISSIONS : daily + weekly + seasonal
  if (resultsByTheme['missions-extended']) {
    const parts = resultsByTheme['missions-extended'];
    const daily    = parts.find(p => p.subtask === 'daily')?.content    || 'const missionsDaily = [];';
    const weekly   = parts.find(p => p.subtask === 'weekly')?.content   || 'const missionsWeekly = [];';
    const seasonal = parts.find(p => p.subtask === 'seasonal')?.content || 'const missionsSeasonal = [];';
    const merged = `// Généré par content-finisher.js\n\n${daily}\n\n${weekly}\n\n${seasonal}\n\nexport const MISSIONS_EXTENDED = [...missionsDaily, ...missionsWeekly, ...missionsSeasonal];\n`;
    fs.writeFileSync(path.join(OUT_DIR, 'missions-extended.js'), merged);
    log('OK', `missions-extended.js assemblé (${merged.length} chars)`);
  }

  // TALENTS : 4 classes
  if (resultsByTheme['talents-trees']) {
    const parts = resultsByTheme['talents-trees'];
    const w = parts.find(p => p.subtask === 'warriorTree')?.content || 'const warriorTree = [];';
    const a = parts.find(p => p.subtask === 'archerTree')?.content  || 'const archerTree = [];';
    const m = parts.find(p => p.subtask === 'mageTree')?.content    || 'const mageTree = [];';
    const h = parts.find(p => p.subtask === 'healerTree')?.content  || 'const healerTree = [];';
    const merged = `// Généré par content-finisher.js\n\n${w}\n\n${a}\n\n${m}\n\n${h}\n\nexport const TALENTS_TREES = { warrior: warriorTree, archer: archerTree, mage: mageTree, healer: healerTree };\n`;
    fs.writeFileSync(path.join(OUT_DIR, 'talents-trees.js'), merged);
    log('OK', `talents-trees.js assemblé (${merged.length} chars)`);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  FINISHER TERMINÉ`);
  console.log(`  Coût : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Fichiers régénérés : ${Object.keys(resultsByTheme).length}`);
  console.log(`\n  💡 Relance "npm run validate-content" pour confirmer les 8/8`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  console.error(`Budget consommé : ${totalCostUSD.toFixed(3)} $`);
});
