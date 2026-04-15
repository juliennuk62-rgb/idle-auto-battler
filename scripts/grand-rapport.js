#!/usr/bin/env node
/**
 * grand-rapport.js — audit massif multi-agents du projet complet.
 *
 * Phase 1 : Chronologue              (1 agent)   — inventaire du projet
 * Phase 2 : 18 analyseurs spécialisés (18 agents) — analyse par angle
 * Phase 3 : Peer review cross          (4 agents)  — détection contradictions
 * Phase 4 : Devil's advocate           (3 agents)  — challenge yes-manism
 * Phase 5 : Executive + Detailed       (2 agents)  — rapports finaux
 *
 * Total : 28 agents. Budget hard : 5 $.
 * Rate limit : 30k tok/min → batches de 2, pauses 30s.
 *
 * Usage : npm run grand-rapport
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
const BUDGET_USD   = 5.00;
const OUT_DIR      = path.join(__dirname, 'out', 'grand-rapport');

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
fs.mkdirSync(path.join(OUT_DIR, 'analyses'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'peer-reviews'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'devils-advocate'), { recursive: true });

function log(role, msg) {
  const tag = { CHRONO: '📜', ANALYZE: '🔍', REVIEW: '🔄', DEVIL: '😈', FINAL: '📝', SYSTEM: '⚙️', BUDGET: '💰', OK: '✅', FAIL: '❌' }[role] || '•';
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

async function callAgent({ system, messages, maxTokens = 4096 }) {
  const resp = await client.messages.create({ model: MODEL, max_tokens: maxTokens, system, messages });
  trackUsage(resp.usage);
  return resp.content.map(c => c.type === 'text' ? c.text : '').join('');
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

// ── Contexte : code + commits + docs ────────────────────────────────────────
function loadProjectContext() {
  const files = [];

  // Code source principal
  const dirs = ['src/systems', 'src/entities', 'src/scenes', 'src/ui', 'src/screens', 'src/data'];
  for (const d of dirs) {
    const full = path.join(ROOT, d);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.js') || f.endsWith('.md')) files.push(path.join(d, f));
    }
  }

  // index.html, package.json, .gitignore
  for (const f of ['index.html', 'package.json']) {
    if (fs.existsSync(path.join(ROOT, f))) files.push(f);
  }

  // Docs
  const docsDir = path.join(ROOT, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (f.endsWith('.md')) files.push(path.join('docs', f));
    }
  }

  // Les 30 fichiers les plus gros (bornage du prompt)
  const sorted = files
    .map(f => ({ f, size: fs.statSync(path.join(ROOT, f)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 30);

  const ctx = {};
  for (const { f } of sorted) ctx[f] = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return ctx;
}

function formatContextForPrompt(ctx) {
  return Object.entries(ctx)
    .map(([p, c]) => {
      const ext = p.endsWith('.css') ? 'css' : p.endsWith('.md') ? 'markdown' : p.endsWith('.html') ? 'html' : p.endsWith('.json') ? 'json' : 'javascript';
      return `### ${p}\n\`\`\`${ext}\n${c.slice(0, 4000)}\n\`\`\``;
    })
    .join('\n\n');
}

// ── Phase 1 : Chronologue (Markdown libre, plus robuste que JSON) ───────────
async function chronologue(ctxText, commitsText) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es CHRONOLOGUE. Tu as accès au code complet d'un jeu idle auto-battler (Phaser.js + DOM + Firebase) et à l'historique des commits.

Ta mission : produire un inventaire FACTUEL et structuré de tout ce qui a été réalisé dans ce projet. Ne juge pas, ne valorise pas, énumère.

Format Markdown strict, avec ces sections exactes :

## Identité du projet
- Nom :
- Stack :
- Estimation lignes de code :
- Modes de jeu :

## Systèmes principaux
- **NomSystem** — rôle court (statut: live|dormant|wip, complexité 1-5)
- (10-15 entrées)

## Contenu
- Héros : N
- Monstres : N
- Items : live N, dormant M
- Achievements : N
- Missions : N
- Talents : N
- Biomes : 6
- Bosses : live N, dormant M

## Features LIVE
- (liste courte)

## Features DORMANT
- (liste courte)

## Commits récents (15-20)
- hash — message

## Signaux de dette technique
- (observations factuelles)

## Infrastructure cloud
- Auth :
- Save :
- Real-time :

Reste FACTUEL. Pas d'analyse, juste l'état des lieux. Réponds par du Markdown direct, sans fence globale.` },
  ];

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici l'historique git récent :\n${commitsText}\n\nProduis l'inventaire Markdown complet.` }],
    maxTokens: 4096,
  });
}

// ── Phase 2 : 18 analyseurs spécialisés ──────────────────────────────────────
const ANALYZERS = [
  { id: 'architect', label: 'Architecte Code', focus: `Évalue la qualité STRUCTURELLE du code : patterns (singleton, observer), découpage modules, SOLID, couplage, cohesion. Cite 5 forces et 5 faiblesses concrètes avec exemples de fichiers. Note /10 sur la "maintenabilité".` },
  { id: 'tech-lead', label: 'Tech Lead', focus: `Identifie la DETTE TECHNIQUE : TODOs non-fait, code smells, duplication, god objects, tests absents. Priorise ce qui doit être refactoré URGENT (rouge) vs PLUS TARD (orange) vs OK. Donne 10 items précis avec fichier:ligne approximative.` },
  { id: 'game-designer', label: 'Game Designer', focus: `Analyse le GAMEPLAY : boucles de rétention, progression (gacha, prestige, talents), courbe de difficulté, "moments marquants". Qu'est-ce qui est fun ? Qu'est-ce qui est plat ? Verdict sur la capacité à tenir 10h+ d'un joueur.` },
  { id: 'ux-designer', label: 'UX/UI Designer', focus: `Critique l'ERGONOMIE : hiérarchie visuelle, feedback, lisibilité, pattern de navigation, onboarding. Trouve 5 frictions majeures pour un nouveau joueur. Comparaison implicite avec des benchmarks (Balatro, Vampire Survivors, etc.).` },
  { id: 'product-manager', label: 'Product Manager', focus: `Évalue la PRIORISATION : le dev a-t-il travaillé sur les bonnes choses ? Quels features sont over-engineered, lesquels sont sous-investis ? Quelle ROADMAP pour les 4 prochaines semaines ? Applique le framework RICE si possible.` },
  { id: 'perf-engineer', label: 'Performance Engineer', focus: `Traque les risques PERF : boucles non pool, leaks mémoire, re-renders DOM inutiles, Phaser objects pas détruits, tweens infinis. Analyse quand ça PEUT commencer à pépier (wave 50 ? 100 ? inventaire 500 items ?). 5 optimisations concrètes.` },
  { id: 'security', label: 'Security Auditor', focus: `Audit SÉCURITÉ : Firebase rules, auth flow, données sensibles exposées, XSS via innerHTML (cherche les endroits), secrets commits, cloudSave vulnerabilities. Note le risque sur une échelle 1-10 et donne 3 fix prioritaires.` },
  { id: 'qa', label: 'QA Engineer', focus: `Identifie les BUGS POTENTIELS et edge cases non couverts : états null, race conditions async (save en parallèle), séquences atypiques (double-click, quit pendant combat, save load corrompu). 10 bugs les plus probables avec repro.` },
  { id: 'retention', label: 'Retention Analyst', focus: `Analyse les POINTS DE SORTIE probables : à quelle wave le joueur abandonne ? Quelle action rebute ? Où sont les vides de progression ? Quel "hook" ramène ? Propose 3 hooks de retention supplémentaires adaptés au scope actuel.` },
  { id: 'balance', label: 'Balance Economist', focus: `Audit ÉQUILIBRAGE : courbe de stats (HP/ATK), taux gacha, coût des items, économie soul/gems/or. Y a-t-il des exploits évidents ? Des trucs trop faibles que personne n'utiliserait ? 5 déséquilibres à corriger.` },
  { id: 'scalability', label: 'Scalability Architect', focus: `Ce qui CRAQUE à 100 joueurs / 10k items / 1000 combats/jour : Firestore quotas, localStorage limits, bundle size, DOM virtualization, performance leaderboards. Score /10 de scalabilité + 3 bottlenecks.` },
  { id: 'narrative', label: 'Narrative Director', focus: `Cohérence LORE & TON : le jeu raconte-t-il quelque chose ? Les biomes ont-ils une identité ? Les héros sont-ils mémorables ? La copywriting est-elle alignée ? 5 propositions pour renforcer l'identité narrative sans reprendre toute l'écriture.` },
  { id: 'a11y', label: 'Accessibility Engineer', focus: `AUDIT A11Y : contraste, keyboard nav, aria-labels, focus rings, screen reader, reduced-motion, tactile (touch ok ?), daltonisme. Score WCAG approximatif. 5 fix rapides pour gagner 80% des gains.` },
  { id: 'i18n', label: 'Internationalization Reviewer', focus: `Le jeu est FR mais pensé pour l'international ? Hardcoded strings, format des nombres, dates, directions de lecture, fontes non-latines. Coût estimé de la traduction en EN/ES/DE. Faut-il un i18n maintenant ou plus tard ?` },
  { id: 'community', label: 'Community Manager', focus: `Qu'est-ce qui est PARTAGEABLE ? Discord, screenshots, mèmes émergents, rivalités entre 5-10 amis. Le leaderboard va-t-il créer de l'engagement ? 5 propositions pour rendre le jeu "commentable sur Discord le soir".` },
  { id: 'privacy', label: 'Data Privacy Officer', focus: `RGPD / DONNÉES : le jeu collecte quoi ? Firebase stocke quoi ? Consentement ? Droit à l'oubli ? Logs trop verbeux ? Cookies Google Sign-In ? 3 corrections prioritaires pour être "clean" devant un ami privacy-conscious.` },
  { id: 'mobile', label: 'Mobile Dev Reviewer', focus: `Le jeu tourne sur MOBILE ? Touch events, responsive breakpoints, perf sur CPU modestes, taille de texte, zones cliquables, viewport meta. Ce qui est cassé en mobile actuellement + 5 fix prioritaires.` },
  { id: 'launch', label: 'Launch Checklist', focus: `Est-ce prêt pour 10 nouveaux testeurs DEMAIN ? Onboarding clair ? Save robuste ? Bug-free sur les 30 premières minutes ? Fun au bout de 5 minutes ? Donne 10 items de check-list avec STATUS (✅/⚠️/❌) et justification.` },
];

async function analyzer({ id, label, focus }, ctxText, chronoMd) {
  const system = [
    { type: 'text', text: ctxText, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Tu es ${label} SENIOR pour un jeu idle auto-battler. Tu analyses le projet avec honnêteté brutale — pas de yes-manism, pas de politesse inutile. Identifie les vrais problèmes et cite des fichiers/lignes spécifiques quand tu peux.

Inventaire du projet (pour contexte) :
${chronoMd.slice(0, 3500)}

TON ANGLE D'ANALYSE : ${focus}

Format de sortie en Markdown (~600-800 mots) :
## [Titre synthétique de ton verdict en 5-8 mots]

**Note globale : X/10** (justifiée en 1 phrase)

### Forces majeures
- (3-5 points concrets avec exemples de fichiers)

### Faiblesses critiques
- (3-5 points concrets avec fichiers concernés et impact)

### Recommandations priorisées
1. [URGENT] Action 1 avec estimation d'effort
2. [IMPORTANT] Action 2
3. [NICE-TO-HAVE] Action 3

### Le verdict honnête
(2-3 phrases sans filtrage : ce qui t'impressionne ET ce qui t'inquiète)` },
  ];

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Fais ton analyse ${label} du projet.` }],
    maxTokens: 3000,
  });
}

// ── Phase 3 : Peer review cross-agents ───────────────────────────────────────
const PEER_REVIEW_GROUPS = [
  { id: 'tech', label: 'Trio Technique', members: ['architect', 'tech-lead', 'perf-engineer', 'scalability'] },
  { id: 'design', label: 'Trio Design', members: ['game-designer', 'ux-designer', 'narrative'] },
  { id: 'qa-safety', label: 'Trio Sécurité/QA', members: ['security', 'qa', 'privacy'] },
  { id: 'strategy', label: 'Trio Stratégie', members: ['product-manager', 'retention', 'balance', 'community', 'launch'] },
];

async function peerReview({ id, label, members }, analysisResults) {
  const memberReports = members
    .map(mid => analysisResults.find(r => r.id === mid))
    .filter(Boolean)
    .map(r => `### ${r.label}\n${r.content.slice(0, 2000)}`)
    .join('\n\n---\n\n');

  const system = [{ type: 'text', text: `Tu es META-REVIEWER ${label}. Tu lis les rapports de tes confrères sur le même projet et tu détectes :
1. CONTRADICTIONS entre les analyses
2. ALIGNEMENTS forts (si tout le monde dit X, c'est probablement vrai)
3. ANGLES MORTS (ce qu'aucun n'a abordé)
4. NUANCES (untel voit A comme faible, un autre comme force — qui a raison ?)

Réponds en Markdown concis (400 mots) :
## Synthèse ${label}

### Consensus fort (unanimité ou presque)
### Contradictions à résoudre
### Angles morts collectifs
### Recommandation synthèse (3 actions unifiées)` }];

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici les rapports des membres de ton groupe :\n\n${memberReports}\n\nFais ta synthèse méta.` }],
    maxTokens: 2048,
  });
}

// ── Phase 4 : Devil's Advocate ───────────────────────────────────────────────
const DEVILS = [
  { id: 'yes-manism', label: 'Détecteur de Yes-manism', focus: `Les 18 analyses précédentes sont-elles sincères ou trop douces ? Identifie 5 affirmations qui sonnent "optimistes par politesse". Requalifie-les en version brutalement honnête.` },
  { id: 'priorities', label: 'Challenger de Priorités', focus: `Les recommandations "URGENT" des analyseurs sont-elles vraiment urgentes ? Y a-t-il du "symbolic work" (refactor pour le plaisir) vs "actual impact" (retention joueur) ? Rééquilibre en termes de ROI réel pour 5-10 testeurs d'amis.` },
  { id: 'blind-spots', label: 'Chasseur d\'Angles Morts', focus: `Qu'est-ce qu'AUCUN des 18 analystes n'a abordé ? Ce qui pourrait tuer le projet silencieusement ? Motivation du dev sur 3 mois, scope creep, écart entre fun imaginé et fun réel, risque de burn-out, etc. 5 angles morts majeurs.` },
];

async function devilsAdvocate({ id, label, focus }, allReports) {
  const reportsBlob = allReports.map(r => `### ${r.label}\n${r.content.slice(0, 1500)}`).join('\n\n---\n\n');

  const system = [{ type: 'text', text: `Tu es DEVIL'S ADVOCATE — ${label}. Ta mission : être DÉPLAISANT mais utile. Ne flatte pas. Secoue.

${focus}

Format : Markdown (~500 mots) avec un ton direct, presque accusateur. Cite les analystes trop complaisants quand tu les trouves.` }];

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici tous les rapports des 18 analystes :\n\n${reportsBlob}\n\nJoue ton rôle.` }],
    maxTokens: 2048,
  });
}

// ── Phase 5 : Rapports finaux ────────────────────────────────────────────────
async function executiveSummary(chronoMd, analysisResults, peerReviews, devils) {
  const system = [{ type: 'text', text: `Tu es RÉDACTEUR EXECUTIVE. Tu produis un résumé de 5 pages maximum pour un lecteur qui n'a PAS le temps de tout lire.

Structure imposée en Markdown :

# Grand Rapport — Idle Auto-Battler
## TL;DR (5 lignes max)
## Note globale du projet : X/10 (avec explication de la note)
## Les 5 points les plus importants à savoir
## Ce qui est VRAIMENT bon dans ce projet
## Ce qui est VRAIMENT problématique
## Top 3 actions URGENTES (avec ROI estimé)
## Top 3 opportunités CACHÉES
## Le verdict brutal (1 paragraphe sincère)

Utilise des chiffres quand possible. Cite des fichiers. Ne répète pas bêtement les analyses : synthétise.` }];

  const payload = [
    '# Inventaire\n' + chronoMd.slice(0, 4000),
    '# 18 Analyses\n' + analysisResults.map(a => `## ${a.label}\n${a.content.slice(0, 1500)}`).join('\n\n'),
    '# 4 Peer Reviews\n' + peerReviews.map(p => `## ${p.label}\n${p.content.slice(0, 1200)}`).join('\n\n'),
    '# 3 Devils\n' + devils.map(d => `## ${d.label}\n${d.content.slice(0, 1200)}`).join('\n\n'),
  ].join('\n\n---\n\n');

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici toutes les données :\n\n${payload.slice(0, 35000)}\n\nProduis le rapport executive complet.` }],
    maxTokens: 4096,
  });
}

async function detailedReport(chronoMd, analysisResults, peerReviews, devils, exec) {
  const system = [{ type: 'text', text: `Tu es RÉDACTEUR SENIOR. Tu produis un rapport DÉTAILLÉ de 20-30 pages Markdown qui consolide tout ce qui a été produit. Tu ne répètes pas tout bêtement : tu organises, structures, hiérarchises.

Structure imposée :

# Grand Rapport Détaillé — Idle Auto-Battler
_Audit multi-agents par 24 perspectives_

## 1. Inventaire du projet
## 2. Analyse technique (architecture, perf, scalability, security)
## 3. Analyse design (gameplay, UX, narrative)
## 4. Analyse produit (PM, retention, balance, community, launch)
## 5. Analyse transverse (a11y, i18n, privacy, mobile, QA)
## 6. Contradictions entre analyses + résolution
## 7. Les verdicts "Devil's Advocate" (brutalement honnêtes)
## 8. Roadmap consolidée (Q2 2026)
   - Semaine 1-2 : actions URGENTES
   - Mois 1-2 : chantiers IMPORTANTS
   - Trimestre : VISION
## 9. Ce qui serait une erreur de faire
## 10. Annexes : notes des 18 analystes

Ton riche, factuel, sincère. Cite des fichiers. Utilise des tableaux, listes, encadrés.` }];

  const payload = [
    '# Inventaire\n' + chronoMd.slice(0, 5000),
    '# Executive Summary (pour référence)\n' + exec.slice(0, 3000),
    '# 18 Analyses détaillées\n' + analysisResults.map(a => `## ${a.label}\n${a.content.slice(0, 1800)}`).join('\n\n'),
    '# Peer Reviews\n' + peerReviews.map(p => `## ${p.label}\n${p.content.slice(0, 1500)}`).join('\n\n'),
    '# Devils Advocate\n' + devils.map(d => `## ${d.label}\n${d.content.slice(0, 1500)}`).join('\n\n'),
  ].join('\n\n---\n\n');

  return callAgent({
    system,
    messages: [{ role: 'user', content: `Voici toutes les données consolidées :\n\n${payload.slice(0, 45000)}\n\nProduis le rapport détaillé complet.` }],
    maxTokens: 8192,
  });
}

// ── Chargement des commits ───────────────────────────────────────────────────
function loadCommitsText() {
  try {
    const { execSync } = require('child_process');
    return execSync('git log --oneline -20', { cwd: ROOT }).toString();
  } catch {
    return 'Commits indisponibles';
  }
}

// ── Orchestrateur ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  GRAND RAPPORT — ${new Date().toLocaleString('fr-FR')}`);
  console.log(`  Budget hard : ${BUDGET_USD} $ | Agents : 28 (18 analystes + 4 peer + 3 devils + 2 final + 1 chrono)`);
  console.log('══════════════════════════════════════════════════════\n');

  // Contexte
  log('SYSTEM', 'Chargement du code source, docs et commits…');
  const ctx = loadProjectContext();
  const ctxText = formatContextForPrompt(ctx);
  const commitsText = loadCommitsText();
  log('SYSTEM', `${Object.keys(ctx).length} fichiers, ~${Math.round(ctxText.length / 1000)}k chars (cache)`);

  // Phase 1 — Chronologue (Markdown)
  log('CHRONO', 'Inventaire global du projet…');
  const chronoMd = await chronologue(ctxText, commitsText);
  fs.writeFileSync(path.join(OUT_DIR, '01-chronologue.md'), chronoMd);
  log('CHRONO', `Inventaire prêt (${chronoMd.length} chars)`);
  budgetLog();

  // Phase 2 — 18 analyseurs
  log('ANALYZE', `Lancement des ${ANALYZERS.length} analyseurs…`);
  const analysisRaw = await runInBatches(ANALYZERS, async (cfg) => {
    const content = await analyzer(cfg, ctxText, chronoMd);
    return { id: cfg.id, label: cfg.label, content };
  }, 'ANALYSE');

  const analysisResults = analysisRaw
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  for (const a of analysisResults) {
    fs.writeFileSync(path.join(OUT_DIR, 'analyses', `${a.id}.md`), `# ${a.label}\n\n${a.content}`);
  }
  log('ANALYZE', `${analysisResults.length}/${ANALYZERS.length} analyses produites`);
  budgetLog();

  // Phase 3 — Peer reviews
  log('REVIEW', 'Peer reviews cross-angle…');
  const peerReviewsRaw = await runInBatches(PEER_REVIEW_GROUPS, async (group) => {
    const content = await peerReview(group, analysisResults);
    return { id: group.id, label: group.label, content };
  }, 'PEER REVIEW');

  const peerReviews = peerReviewsRaw
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  for (const p of peerReviews) {
    fs.writeFileSync(path.join(OUT_DIR, 'peer-reviews', `${p.id}.md`), `# ${p.label}\n\n${p.content}`);
  }
  log('REVIEW', `${peerReviews.length}/${PEER_REVIEW_GROUPS.length} peer reviews produites`);
  budgetLog();

  // Phase 4 — Devil's advocate
  log('DEVIL', 'Devil\'s advocate round…');
  const devilsRaw = await runInBatches(DEVILS, async (cfg) => {
    const content = await devilsAdvocate(cfg, [...analysisResults, ...peerReviews]);
    return { id: cfg.id, label: cfg.label, content };
  }, 'DEVILS');

  const devils = devilsRaw
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
  for (const d of devils) {
    fs.writeFileSync(path.join(OUT_DIR, 'devils-advocate', `${d.id}.md`), `# ${d.label}\n\n${d.content}`);
  }
  log('DEVIL', `${devils.length}/${DEVILS.length} devils produits`);
  budgetLog();

  // Phase 5 — Rapports finaux
  log('FINAL', 'Executive summary…');
  const execSummary = await executiveSummary(chronoMd, analysisResults, peerReviews, devils);
  fs.writeFileSync(path.join(OUT_DIR, '04-EXECUTIVE-SUMMARY.md'), execSummary);
  budgetLog();

  log('FINAL', 'Rapport détaillé…');
  const detailed = await detailedReport(chronoMd, analysisResults, peerReviews, devils, execSummary);
  fs.writeFileSync(path.join(OUT_DIR, '05-RAPPORT-FINAL.md'), detailed);
  budgetLog();

  // Stats finales
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  GRAND RAPPORT TERMINÉ`);
  console.log(`  Coût total : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Analyses   : ${analysisResults.length}/${ANALYZERS.length}`);
  console.log(`  Peer rvws  : ${peerReviews.length}/${PEER_REVIEW_GROUPS.length}`);
  console.log(`  Devils     : ${devils.length}/${DEVILS.length}`);
  console.log(`  Sortie     : ${path.relative(ROOT, OUT_DIR)}/`);
  console.log(`  Lire d'abord : 04-EXECUTIVE-SUMMARY.md`);
  console.log(`  Rapport complet : 05-RAPPORT-FINAL.md`);
  console.log(`\n  💡 Génère le PDF : python scripts/gen-rapport-pdf.py`);
  console.log('══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  console.error(`Budget consommé : ${totalCostUSD.toFixed(3)} $`);
});
