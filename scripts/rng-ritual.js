#!/usr/bin/env node
/**
 * rng-ritual.js — one-shot massif "Le Rituel du RNG".
 *
 * 17 agents qui conçoivent la refonte cinématique de tous les moments RNG :
 *   - Opening narratif
 *   - Invocations (gacha) spectaculaires
 *   - Loot drops hiérarchisés par rareté
 *   - Crits cinématiques
 *   - Pity tension
 *   - Lucky streak detection
 *   - Narrator RNG (300+ lignes)
 *   - Chest reveal
 *   - Mythic tier (nouveau tier au-dessus d'UR)
 *   - Stats storyteller
 *   - Sound design briefs
 *   - Camera choreographer
 *   - Rare drop mini-cinema
 *   - Character reveal speech
 *   - Jackpot mode
 *
 * Budget hard : 4.50 $. Rate limit safe : batches de 2, pauses 30s.
 *
 * Usage : npm run rng-ritual
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

const MODEL        = 'claude-sonnet-4-5-20250929';
const BATCH_SIZE   = 2;
const BATCH_DELAY  = 30_000;
const BUDGET_USD   = 4.50;
const OUT_DIR      = path.join(__dirname, 'out', 'rng-ritual');

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
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'agents'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'code-snippets'), { recursive: true });

function log(role, msg) {
  const tag = { AUDIT: '🔍', AGENT: '🎰', CONSOL: '📦', SYSTEM: '⚙️', BUDGET: '💰', OK: '✅', FAIL: '❌' }[role] || '•';
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

async function callAgent({ system, messages, maxTokens = 5000 }) {
  const resp = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages });
  trackUsage(resp.usage);
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

// ── Contexte : focalisé sur les fichiers RNG-related ──
function loadRngContext() {
  const files = [
    'src/systems/GachaSystem.js',
    'src/systems/ItemSystem.js',
    'src/systems/CombatSystem.js',
    'src/systems/ResourceSystem.js',
    'src/data/heroes.js',
    'src/data/items.js',
    'src/data/balance.js',
    'src/scenes/CombatScene.js',
    'src/entities/Fighter.js',
    'src/screens/SummonScreen.js',
    'src/screens/ChestShopScreen.js',
    'src/ui/FloatingDamage.js',
    'src/ui/WaveBanner.js',
  ];
  const ctx = {};
  for (const f of files) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) ctx[f] = fs.readFileSync(full, 'utf8');
  }
  return ctx;
}

function formatContextForPrompt(ctx) {
  return Object.entries(ctx)
    .map(([p, c]) => `### ${p}\n\`\`\`javascript\n${c.slice(0, 5000)}\n\`\`\``)
    .join('\n\n');
}

// ── Phase 1 : Auditeur RNG ────────────────────────────────────────────────────
async function auditor(ctxText) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es AUDITEUR RNG. Tu scan le code existant et tu cartographies TOUS les moments RNG du jeu.

Produis un Markdown structuré :

## Moments RNG identifiés
Pour chaque moment, un bloc :
### [Nom du moment]
- **Fichier** : chemin + fonction
- **Type** : invocation | loot | crit | pity | streak | drop | autre
- **Fréquence** : très rare | rare | commun | très commun
- **Feedback actuel** : ce qu'il se passe actuellement (visuel, audio, logique)
- **Potentiel cinématique (1-10)** : note du sous-investissement visuel

## Synthèse
- Nombre total de moments RNG
- Top 5 des moments SOUS-INVESTIS (ceux où il y a le plus à gagner)
- Top 3 des moments déjà bien traités` },
  ];
  return callAgent({
    system,
    messages: [{ role: 'user', content: `Fais l'audit RNG complet du projet.` }],
    maxTokens: 3000,
  });
}

// ── Phase 2 : 15 agents spécialisés ───────────────────────────────────────────
const RNG_AGENTS = [
  {
    id: 'opening-cinematique',
    label: 'Opening Cinematique',
    brief: `Conçois l'OPENING NARRATIF du jeu (first-time experience).
Livrable :
1. Un texte d'ouverture en 5 scènes (chaque scène ~80 mots max, progression dramatique)
2. Un choix moral à la fin qui n'impacte rien mécaniquement mais qui marque le joueur (3 options)
3. Une ambiance sonore suggérée par scène (juste la description, pas le son)
4. Le nom du Commandant est demandé après la scène 3
5. Du code Phaser pseudocode pour la transition (fade, slide, typewriter effect)
Ton : fantasy dark, poétique, mémorable.`,
  },
  {
    id: 'invocation-director',
    label: 'Invocation Director',
    brief: `Redesigne complètement l'écran d'invocation (gacha pull). Livrable :
1. Séquence cinématique détaillée pour un pull single (~2.5s) :
   - 0.0s : press button, écran assombri
   - 0.2s : carte qui tombe au centre, face cachée
   - 0.6s : carte vibre/pulse (anticipation)
   - 1.2s : révélation couleur rareté via burst de particules
   - 1.5s : flip de carte (3D effect)
   - 2.0s : nom du héros apparaît (typewriter)
   - 2.5s : passable (tap to dismiss)
2. Variantes par rareté (R court, SR classique, SSR dramatique, UR épique)
3. Séquence pour pull x10 (~8s)
4. Code Phaser concret (tweens chain, particle config, exact easings)
5. Liste de 10 easings cinématiques à utiliser (Back.Out, Elastic, etc.)`,
  },
  {
    id: 'loot-drop-showman',
    label: 'Loot Drop Showman',
    brief: `Designe les animations de drop d'items par rareté. Livrable :
1. Pour chaque rareté (common, uncommon, rare, epic, legendary, mythic) :
   - Animation d'apparition (durée, easing)
   - Particles associés (nombre, couleur, vitesse)
   - Effet sonore suggéré
   - Durée totale
2. Gradient de spectacle (common = discret, mythic = 5s de show)
3. Code Phaser pour emission de particules + beam of light vertical
4. Trigger condition : dropdown depuis le top de l'écran sur le sprite loot`,
  },
  {
    id: 'crit-show',
    label: 'Crit Show',
    brief: `Designe le feedback d'un COUP CRITIQUE cinématique. Livrable :
1. Séquence cinématique (~300ms) :
   - Hit-stop 80ms
   - Zoom camera ×1.15
   - Vignette rouge
   - Screen crack (effet pixel art)
   - Texte "CRITIQUE!" animé (scale 0→1.4→1, rotation ±5°, couleur gold)
   - Particles rouge/orange
2. Variantes pour crit modéré (20%) et crit massif (10%)
3. Code Phaser complet (timeline)
4. Considération : ne pas spammer si trop de crits (throttle à 1 show per second max)`,
  },
  {
    id: 'pity-tension',
    label: 'Pity Tension',
    brief: `Designe l'expérience de TENSION CROISSANTE quand le pity s'approche. Livrable :
1. UX quand pity actuel = 80%, 90%, 95%, 99%, 100% :
   - Jauge visuelle qui vibre
   - Narrateur qui teaser ("Les étoiles s'alignent...")
   - Musique qui monte
   - Screen tint gradual (subtile)
2. "Pity break" cinematic quand déclenché (~3s de build-up avant révélation)
3. Code : logique de progression + triggers visuels
4. 10 phrases de narrateur à échantillonner à 80%/90%/95%/99%/100%`,
  },
  {
    id: 'lucky-streak',
    label: 'Lucky Streak Detector',
    brief: `Designe la détection et le feedback de STREAK DE CHANCE. Livrable :
1. Logique de détection :
   - 2 SR+ d'affilée = "Main chanceuse"
   - 3 SR+ d'affilée = "Coup de chance"
   - 2 SSR d'affilée = "Favori des dieux"
   - 1 UR + 1 SSR = "Grâce divine"
2. Feedback visuel pour chaque trigger (animations, badges)
3. Narrateur dédié (20 phrases)
4. Historique visible "Ta plus grande streak : 3 SR+"
5. Code JS pour la détection + storage`,
  },
  {
    id: 'narrator-rng',
    label: 'Narrator RNG',
    brief: `Produis 300 LIGNES DE NARRATION contextuelle pour tous les events RNG. Répartis :
- 50 lignes : pull commun (R normal) — ton discret, parfois moqueur
- 40 lignes : pull peu commun (SR)
- 30 lignes : pull rare (SSR) — ton révérencieux
- 20 lignes : pull mythique (UR+) — ton épique, dramatique
- 30 lignes : pull consécutif nul (5+ R d'affilée) — compassion ou moquerie
- 30 lignes : streak de chance
- 30 lignes : pity break
- 30 lignes : loot commun
- 20 lignes : loot légendaire+
- 20 lignes : crit important
Format JS : \`export const NARRATOR_LINES = { pullCommon: [...], pullSR: [...], ... };\`
Chaque ligne <15 mots, poétique ou drôle. Ton cohérent avec un narrateur omniscient mystérieux.`,
  },
  {
    id: 'chest-reveal',
    label: 'Chest Reveal',
    brief: `Designe l'animation d'ouverture des COFFRES (rewards). Livrable :
1. Séquence par tier de coffre (bronze, argent, or, diamant) :
   - Arrivée du coffre au centre
   - Vibration (anticipation)
   - Couvercle qui s'ouvre
   - Lueur qui sort
   - Items révélés un par un (1s entre chaque)
   - Crescendo sonore
2. Durée totale par tier (3s bronze → 10s diamant)
3. Code Phaser complet`,
  },
  {
    id: 'mythic-tier',
    label: 'Mythic Tier',
    brief: `Designe un NOUVEAU TIER "MYTHIC" au-dessus d'UR (taux 1/10000 = 0.01%). Livrable :
1. Intégration dans GachaSystem : rates, pity, couleur (or rosé iridescent)
2. Cinématique d'invocation Mythic (~5s) :
   - Écran devient noir
   - Silence total 0.5s
   - Fissure horizontale apparaît
   - Lueur dorée intense
   - Silhouette monte depuis la fissure
   - Révélation lente (6s totalement)
   - Fond blanc éblouissant
   - Nom en calligraphie
3. Design de 3 héros Mythic (pas de nom, juste concepts) : "le Premier", "l'Oublié", "l'Interlude"
4. Code JS pour extension GachaSystem`,
  },
  {
    id: 'stats-storyteller',
    label: 'Stats Storyteller',
    brief: `Transforme les STATS gacha en NARRATION. Livrable :
1. 30 phrases paramétrées qui transforment les données en récit :
   - "Ta chance est de {pct}%, plus haute que {X}% des Commandants"
   - "Ton pire pull date d'il y a {days} jours"
   - "{hero.name} t'est apparu après {N} tentatives"
2. Module JS \`export function narrate(stats)\` qui prend les stats et renvoie une phrase
3. Écran "Destin" qui affiche 3-5 de ces phrases de manière narrative
4. Concept de "Livre de ton Destin" consultable`,
  },
  {
    id: 'sound-brief',
    label: 'Sound Design Brief',
    brief: `Produis 100 BRIEFS SONORES précis (pas de prod audio — juste les specs). Livrable :
1. Pour chaque event RNG, un brief :
   - Event : "Pull SR révélé"
   - Durée : 400ms
   - Fréquence : 440Hz → 880Hz
   - Timbre : cristallin, celestial
   - Layers : 1 pad + 2 chimes
   - Reference : "comme le son de Zelda quand tu trouves un cristal"
2. 100 briefs au total (50 invocations, 20 loot, 20 crit, 10 ambient)
3. Organisation par catégorie
4. Format : table Markdown pour facilité de commande à un sound designer`,
  },
  {
    id: 'camera-choreographer',
    label: 'Camera Choreographer',
    brief: `Librairie de MOUVEMENTS CAMÉRA Phaser pour tous les events RNG. Livrable :
1. 20 séquences caméra complètes avec code Phaser :
   - Zoom critique (1.0 → 1.15 → 1.0 en 250ms)
   - Shake pull UR (intensity 0.02, 600ms)
   - Flash mythic (white alpha 1 → 0 en 800ms)
   - Pan vers item drop
   - etc.
2. Matrix visuelle : Event × Zoom × Shake × Flash
3. Anti-motion-sickness : guidelines (max shake 0.02, max zoom ×1.2)`,
  },
  {
    id: 'rare-drop-cinema',
    label: 'Rare Drop Mini-Cinema',
    brief: `Designe une MINI-CINÉMATIQUE 3s qui se déclenche quand un item mythic+ drop. Livrable :
1. Séquence détaillée :
   - 0.0s : ralenti global (timeScale 0.3)
   - 0.3s : écran s'assombrit
   - 0.5s : item apparait au centre, rotation lente
   - 1.5s : glow intensifie
   - 2.0s : texte "ARTÉFACT DIVIN DÉCOUVERT"
   - 2.5s : particles burst
   - 3.0s : retour normal + item dans inventaire
2. Logique trigger (rarity check)
3. Code Phaser complet
4. Variantes pour "ARME PROHIBÉE", "RELIQUE MAUDITE", "FRAGMENT D'ÉTOILE"`,
  },
  {
    id: 'character-reveal-speech',
    label: 'Character Reveal Speech',
    brief: `Une PHRASE DE PRÉSENTATION par héros, dite au moment de l'invocation. Livrable :
1. 20 phrases, une par héros du roster actuel (Paladin Céleste, Artémis, Merlin, etc.)
2. <15 mots par phrase, mémorables, marquent l'identité du perso
3. Format module JS : \`export const REVEAL_SPEECHES = { "paladin_celeste": "...", ... };\`
4. 5 phrases alternatives pour les R (pour éviter la lassitude)
5. Intégration Phaser : typewriter effect après le reveal visuel`,
  },
  {
    id: 'jackpot-mode',
    label: 'Jackpot Mode',
    brief: `Designe un MODE JACKPOT ULTRA-RARE (1/50000 pulls). Livrable :
1. Déclencheur aléatoire (0.002%)
2. Séquence cinématique 10s :
   - Écran explose en feux d'artifice
   - Musique "EL DORADO"
   - 5 items légendaires+ simultanés
   - 1 héros SSR+ offert
   - Titre "JACKPOT DIVIN" en énorme
   - Persistence : ce moment est enregistré dans le profil "Tu as vécu le Jackpot le X/Y/Z"
3. Achievement dédié permanent
4. Code logique + sequence Phaser
5. Considération éthique : doit arriver uniquement sur pull payant (cohérence économique)`,
  },
];

async function agentWorker(ctxText, auditMd, agent) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es ${agent.label} — expert en game feel et cinématique RNG.

AUDIT DU PROJET (pour contexte) :
${auditMd.slice(0, 3000)}

TA MISSION :
${agent.brief}

Format : Markdown riche avec :
- Titre principal H1
- Sections H2/H3 bien organisées
- Blocs de code Phaser/JS concrets (langage : javascript)
- Tableaux si pertinent
- Ton direct, technique mais vivant

Reponds par ton rapport complet, ~800-1200 mots.` },
  ];
  return callAgent({
    system,
    messages: [{ role: 'user', content: `Produis ton rapport ${agent.label}.` }],
    maxTokens: 5000,
  });
}

// ── Phase 3 : Consolidateur ──────────────────────────────────────────────────
async function consolidator(auditMd, agentOutputs) {
  const summaries = agentOutputs.map(a => `## ${a.label}\n${a.content.slice(0, 1500)}`).join('\n\n---\n\n');

  const system = [{ type: 'text', text: `Tu es MAÎTRE DE CÉRÉMONIE — consolidateur senior.

Ton rôle :
1. Lire les 15 rapports des agents spécialisés
2. Produire un MANIFEST final en Markdown qui :
   - Liste chaque livrable avec son scope et impact estimé
   - Propose un ORDRE D'INTÉGRATION priorisé (safe→complexe)
   - Identifie les DÉPENDANCES entre features
   - Liste les fichiers du jeu à MODIFIER ou CRÉER
   - Fournit une ROADMAP d'intégration en 3 phases (semaine 1, semaine 2-3, mois 2)

Format Markdown clair, orienté action. ~1500 mots.` }];

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici l'audit initial :\n\n${auditMd.slice(0, 3000)}\n\n---\n\nVoici les 15 rapports des agents :\n\n${summaries}\n\nProduis le MANIFEST.` }],
    maxTokens: 4096,
  });
}

// ── Orchestrateur ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  LE RITUEL DU RNG — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`  Budget hard : ${BUDGET_USD} $ | Agents : 17 (1 audit + 15 agents + 1 consolid.)`);
  console.log('══════════════════════════════════════════════════════\n');

  log('SYSTEM', 'Chargement du code RNG-related…');
  const ctx = loadRngContext();
  const ctxText = formatContextForPrompt(ctx);
  log('SYSTEM', `${Object.keys(ctx).length} fichiers, ~${Math.round(ctxText.length / 1000)}k chars (cache)`);

  // Phase 1
  log('AUDIT', 'Cartographie des moments RNG…');
  const auditMd = await auditor(ctxText);
  fs.writeFileSync(path.join(OUT_DIR, '01-audit.md'), auditMd);
  log('AUDIT', `Audit prêt (${auditMd.length} chars)`);
  budgetLog();

  // Phase 2
  log('AGENT', `Lancement des ${RNG_AGENTS.length} agents spécialisés…`);
  const results = await runInBatches(RNG_AGENTS, async (agent) => {
    const content = await agentWorker(ctxText, auditMd, agent);
    return { id: agent.id, label: agent.label, content };
  }, 'AGENT');

  const successful = results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);

  for (const a of successful) {
    fs.writeFileSync(path.join(OUT_DIR, 'agents', `${a.id}.md`), `# ${a.label}\n\n${a.content}`);

    // Extraction des blocs de code JS en snippets séparés
    const codeBlocks = [...a.content.matchAll(/```(?:javascript|js)\n([\s\S]*?)```/g)];
    if (codeBlocks.length > 0) {
      const snippets = codeBlocks.map((m, i) => `// === Snippet ${i + 1} (from ${a.label}) ===\n${m[1].trim()}`).join('\n\n');
      fs.writeFileSync(path.join(OUT_DIR, 'code-snippets', `${a.id}.js`), snippets);
    }
  }
  log('AGENT', `${successful.length}/${RNG_AGENTS.length} rapports produits`);
  budgetLog();

  // Phase 3
  log('CONSOL', 'Consolidation finale (MANIFEST)…');
  try {
    const manifest = await consolidator(auditMd, successful);
    fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.md'), manifest);
    log('CONSOL', `MANIFEST écrit (${manifest.length} chars)`);
  } catch (e) {
    log('FAIL', `Consolidation a échoué : ${e.message}`);
    const basic = `# MANIFEST — Rituel du RNG\n\n` + successful.map(a => `## ${a.label}\n- Fichier : ${a.id}.md`).join('\n\n');
    fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.md'), basic);
  }
  budgetLog();

  // Rapport final
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RITUEL TERMINÉ`);
  console.log(`  Coût : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Agents : ${successful.length}/${RNG_AGENTS.length}`);
  console.log(`  Sortie : ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`  Lire : MANIFEST.md + agents/*.md`);
  console.log(`\n  💡 Génère le PDF : npm run rng-pdf`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  console.error(`Budget consommé : ${totalCostUSD.toFixed(3)} $`);
});
