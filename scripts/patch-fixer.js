#!/usr/bin/env node
/**
 * patch-fixer.js — répare les patches cassés du visual-overhaul.
 *
 * Pour chaque patch qui ne s'applique pas :
 *   1. Charge les VRAIS fichiers cibles (complets, pas tronqués)
 *   2. Envoie à un agent : "voici le patch voulu + le vrai fichier, corrige les numéros
 *      de ligne et le contexte pour que git apply l'accepte"
 *   3. Nouveau patch propre dans scripts/out/visual-overhaul-fixed/
 *
 * Coût estimé : ~2 $ pour 15 patches.
 *
 * Usage :
 *   npm run patch-fixer
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const IN_DIR     = path.join(__dirname, 'out', 'visual-overhaul');
const OUT_DIR    = path.join(__dirname, 'out', 'visual-overhaul-fixed');

const MODEL      = 'claude-sonnet-4-5-20250929';
const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 1500;
const BUDGET_USD = 2.50; // marge sur les 2,70$ restants

const PRICE = {
  input:  3.00 / 1_000_000,
  output: 15.00 / 1_000_000,
  cacheWrite: 3.75 / 1_000_000,
  cacheRead: 0.30 / 1_000_000,
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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(role, msg) {
  const tag = { FIXER: '🔧', SYSTEM: '⚙️', BUDGET: '💰', OK: '✅', FAIL: '❌' }[role] || '•';
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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractFilesFromPatch(patch) {
  const files = new Set();
  for (const line of patch.split('\n')) {
    const m = line.match(/^---\s+a\/(.+)$/) || line.match(/^\+\+\+\s+b\/(.+)$/);
    if (m) files.add(m[1].trim());
  }
  return [...files];
}

function cleanMarkdownWrap(text) {
  // Retire les ```diff et ``` résiduels
  let out = text
    .replace(/^```(?:diff|patch)?\s*\n/gm, '')
    .replace(/^```\s*$/gm, '')
    .trim();
  // Garde tout à partir du premier "--- a/"
  const i = out.indexOf('--- a/');
  if (i > 0) out = out.slice(i);
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

async function fixOnePatch({ filename, brokenPatch, targetFiles, meta }) {
  // Charge les fichiers cibles complets
  const fileContents = {};
  for (const tf of targetFiles) {
    const full = path.join(ROOT, tf);
    if (!fs.existsSync(full)) {
      return { filename, ok: false, error: `fichier cible introuvable : ${tf}` };
    }
    fileContents[tf] = fs.readFileSync(full, 'utf8');
  }

  const filesBlock = Object.entries(fileContents)
    .map(([p, c]) => `### FICHIER ACTUEL : ${p} (${c.split('\n').length} lignes)\n\`\`\`\n${c}\n\`\`\``)
    .join('\n\n');

  const system = `Tu es un expert git/patch. Tu reçois :
1. Un patch "intention" qui décrit les changements VOULUS (mais avec des numéros de ligne probablement faux)
2. Le contenu EXACT et complet du ou des fichiers à modifier

Ton job : produire un patch unified diff VALIDE qui applique les mêmes changements sémantiques, mais avec :
- Numéros de ligne exacts basés sur le fichier réel
- Contexte avant/après qui correspond au VRAI contenu
- Hunks séparés proprement

Règles absolues :
- Réponds UNIQUEMENT par le diff brut, sans fences Markdown, sans prose autour
- Format : --- a/chemin ... +++ b/chemin ... @@ -X,Y +A,B @@
- Respecte les indentations EXACTES (tabs vs espaces) du fichier réel
- Si le code du patch d'intention fait référence à une méthode/zone qui n'existe pas dans le vrai fichier, adapte intelligemment (ex. choisis la méthode la plus proche sémantiquement)
- N'ajoute pas de modifications qui ne sont pas dans le patch d'intention
- Si vraiment impossible d'appliquer, réponds par "IMPOSSIBLE: <raison courte>"`;

  const user = `CHANTIER : ${meta?.chantier?.title || filename}
Description : ${meta?.chantier?.description || 'voir patch'}

PATCH D'INTENTION (numéros de ligne potentiellement faux) :
\`\`\`diff
${brokenPatch}
\`\`\`

${filesBlock}

Produis le patch corrigé et valide.`;

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
    });
    trackUsage(resp.usage);
    const text = resp.content.map(c => c.type === 'text' ? c.text : '').join('');

    if (text.trim().startsWith('IMPOSSIBLE:')) {
      return { filename, ok: false, error: text.trim() };
    }

    const fixed = cleanMarkdownWrap(text);

    // Écriture
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, fixed);

    // Test immédiat avec git apply --check
    try {
      execSync(`git apply --check "${outPath}"`, { cwd: ROOT, stdio: 'pipe' });
      return { filename, ok: true, outPath };
    } catch (err) {
      const msg = err.stderr?.toString().split('\n')[0] || 'apply-check failed';
      return { filename, ok: false, error: msg, outPath };
    }
  } catch (err) {
    return { filename, ok: false, error: `api-error: ${err.message}` };
  }
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  PATCH-FIXER — budget ${BUDGET_USD} $`);
  console.log('══════════════════════════════════════════════════════\n');

  // Liste les patches approuvés uniquement (exclut les .cleaned déjà créés)
  const patches = fs.readdirSync(IN_DIR)
    .filter(f => f.endsWith('.patch') && !f.endsWith('.cleaned.patch') && /^\d+-/.test(f))
    .sort();

  log('SYSTEM', `${patches.length} patches à réparer`);

  // Charge les meta pour filtrer les approved
  const items = [];
  for (const filename of patches) {
    const metaPath = path.join(IN_DIR, filename.replace('.patch', '.meta.json'));
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
    if (meta && meta.status !== 'APPROVED') {
      log('SYSTEM', `Skip ${filename} (${meta.status})`);
      continue;
    }
    const brokenPatch = fs.readFileSync(path.join(IN_DIR, filename), 'utf8');
    const cleaned = cleanMarkdownWrap(brokenPatch);
    const targetFiles = extractFilesFromPatch(cleaned);
    if (targetFiles.length === 0) {
      log('SYSTEM', `Skip ${filename} (pas de fichiers cibles détectés)`);
      continue;
    }
    items.push({ filename, brokenPatch: cleaned, targetFiles, meta });
  }

  log('SYSTEM', `${items.length} patches à traiter (approved + fichiers identifiés)`);

  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    log('SYSTEM', `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);
    const batchResults = await Promise.allSettled(batch.map(fixOnePatch));
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value);
      else results.push({ filename: '?', ok: false, error: r.reason?.message });
    }
    log('BUDGET', `${totalCostUSD.toFixed(3)} $ / ${BUDGET_USD} $ (${(totalCostUSD / BUDGET_USD * 100).toFixed(1)}%)`);
    if (totalCostUSD >= BUDGET_USD) {
      log('SYSTEM', '⛔ Budget atteint, arrêt du traitement');
      break;
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }

  // Résumé
  const ok   = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log('\n══════ RÉSUMÉ ══════');
  console.log(`  ${ok} réparés ✅  /  ${fail} échecs ❌  /  ${results.length} total`);
  console.log(`  Coût : ${totalCostUSD.toFixed(3)} $ (~${(totalCostUSD * 0.92).toFixed(2)} €)`);
  console.log(`  Sortie : ${path.relative(ROOT, OUT_DIR)}/\n`);

  if (fail > 0) {
    console.log('Échecs détaillés :');
    for (const r of results.filter(r => !r.ok)) {
      console.log(`  ❌ ${r.filename}: ${r.error}`);
    }
  }

  if (ok > 0) {
    console.log(`\n💡 Pour appliquer les patches réparés :`);
    console.log(`     npm run apply-fixed`);
  }
}

main().catch(err => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});
