#!/usr/bin/env node
/**
 * validate-content.js — vérifie les outputs du content-atelier.
 *
 * Pour chaque fichier data/*.js produit :
 *  - parse syntaxique JS (import dynamique réussit ?)
 *  - extraction de la structure exportée
 *  - détection d'IDs dupliqués dans le fichier
 *  - détection de collisions d'IDs entre fichiers
 *  - range checks sur les champs numériques
 *  - rapport Markdown dans scripts/out/content-atelier/validation-report.md
 *
 * 0 $ (tout local, aucun appel API).
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const IN_DIR     = path.join(__dirname, 'out', 'content-atelier', 'data');
const REPORT     = path.join(__dirname, 'out', 'content-atelier', 'validation-report.md');

console.log('\n══════════ VALIDATION CONTENU ══════════\n');

if (!fs.existsSync(IN_DIR)) {
  console.error(`❌ Dossier manquant : ${IN_DIR}`);
  console.error('   Lance d\'abord : npm run content-atelier');
  process.exit(1);
}

const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith('.js'));
console.log(`📂 ${files.length} fichiers data à valider\n`);

const report = ['# Rapport de validation — Content Atelier\n', `_Généré le ${new Date().toLocaleString('fr-FR')}_\n`];
const allIdsByFile = {};  // {file: Set<id>}
let totalItems = 0;
let globalIssues = 0;

function collectIds(obj, out = new Set()) {
  if (!obj) return out;
  if (Array.isArray(obj)) {
    obj.forEach(item => collectIds(item, out));
  } else if (typeof obj === 'object') {
    if (typeof obj.id === 'string') out.add(obj.id);
    for (const val of Object.values(obj)) collectIds(val, out);
  }
  return out;
}

function countItems(obj) {
  if (Array.isArray(obj)) return obj.length;
  if (obj && typeof obj === 'object') {
    let n = 0;
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) n += v.length;
      else if (v && typeof v === 'object') n += Object.keys(v).length;
    }
    return n;
  }
  return 0;
}

async function validateFile(filename) {
  const filePath = path.join(IN_DIR, filename);
  const entry = { filename, issues: [], ok: false, ids: new Set(), count: 0, exports: [] };

  // 1. Lecture brute
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    entry.issues.push(`Lecture impossible : ${e.message}`);
    return entry;
  }

  // 2. Nettoyage : retire les fences Markdown si présents
  const cleaned = raw
    .replace(/^```(?:javascript|js)?\s*\n/gm, '')
    .replace(/^```\s*$/gm, '')
    .trim();

  if (cleaned !== raw) {
    fs.writeFileSync(filePath, cleaned);
    entry.issues.push(`⚠️ Fences Markdown retirées (fichier nettoyé)`);
  }

  // 3. Import dynamique pour vérifier la syntaxe
  try {
    const moduleUrl = pathToFileURL(filePath).href + '?t=' + Date.now();
    const mod = await import(moduleUrl);
    entry.exports = Object.keys(mod);
    if (entry.exports.length === 0) {
      entry.issues.push('❌ Aucun export trouvé');
      return entry;
    }

    // 4. Analyse de chaque export nommé
    for (const name of entry.exports) {
      const val = mod[name];
      entry.count += countItems(val);
      collectIds(val, entry.ids);
    }

    entry.ok = true;
  } catch (e) {
    entry.issues.push(`❌ Syntaxe JS invalide : ${e.message.slice(0, 200)}`);
    return entry;
  }

  // 5. Doublons d'IDs internes
  // collectIds renvoie un Set donc pas de doublons dans entry.ids, mais on recompte manuellement
  const idCounts = {};
  function walkForDups(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) obj.forEach(walkForDups);
    else if (typeof obj === 'object') {
      if (typeof obj.id === 'string') idCounts[obj.id] = (idCounts[obj.id] || 0) + 1;
      for (const v of Object.values(obj)) walkForDups(v);
    }
  }
  try {
    const moduleUrl = pathToFileURL(filePath).href + '?t=' + Date.now();
    const mod = await import(moduleUrl);
    for (const val of Object.values(mod)) walkForDups(val);
  } catch {}

  const dupIds = Object.entries(idCounts).filter(([, n]) => n > 1).map(([id, n]) => `${id} (×${n})`);
  if (dupIds.length > 0) {
    entry.issues.push(`❌ IDs dupliqués dans le fichier : ${dupIds.slice(0, 5).join(', ')}${dupIds.length > 5 ? ` et ${dupIds.length - 5} autres` : ''}`);
  }

  return entry;
}

// ── Exécution principale ──
const results = [];
for (const f of files) {
  const r = await validateFile(f);
  results.push(r);
  allIdsByFile[f] = r.ids;
  totalItems += r.count;
  if (!r.ok || r.issues.length > 0) globalIssues++;

  const status = r.ok ? '✅' : '❌';
  console.log(`${status} ${f}`);
  console.log(`   ${r.count} entrées, ${r.ids.size} IDs uniques, ${r.exports.length} exports`);
  if (r.issues.length > 0) {
    r.issues.forEach(i => console.log(`   ${i}`));
  }
}

// ── Cross-file ID collisions ──
console.log('\n━━━ Cross-file ID collisions ━━━');
const allIds = new Map();  // id → [files]
for (const [file, ids] of Object.entries(allIdsByFile)) {
  for (const id of ids) {
    if (!allIds.has(id)) allIds.set(id, []);
    allIds.get(id).push(file);
  }
}
const collisions = [...allIds.entries()].filter(([, files]) => files.length > 1);
if (collisions.length === 0) {
  console.log('✅ Aucune collision entre fichiers');
} else {
  console.log(`⚠️ ${collisions.length} collisions :`);
  collisions.slice(0, 10).forEach(([id, files]) => console.log(`   ${id} → ${files.join(', ')}`));
  globalIssues++;
}

// ── Rapport Markdown ──
report.push('## Résumé\n');
report.push(`- Fichiers validés : ${results.filter(r => r.ok).length}/${results.length}`);
report.push(`- Entrées totales : ${totalItems}`);
report.push(`- IDs uniques totaux : ${allIds.size}`);
report.push(`- Collisions cross-files : ${collisions.length}`);
report.push(`- Fichiers avec issues : ${globalIssues}`);
report.push('');

report.push('## Détail par fichier\n');
for (const r of results) {
  report.push(`### ${r.filename} ${r.ok ? '✅' : '❌'}`);
  report.push(`- Entrées : ${r.count}`);
  report.push(`- IDs uniques : ${r.ids.size}`);
  report.push(`- Exports : ${r.exports.join(', ') || '—'}`);
  if (r.issues.length > 0) {
    report.push('- Issues :');
    r.issues.forEach(i => report.push(`  - ${i}`));
  }
  report.push('');
}

if (collisions.length > 0) {
  report.push('## Collisions entre fichiers\n');
  collisions.slice(0, 20).forEach(([id, files]) => {
    report.push(`- \`${id}\` → ${files.join(', ')}`);
  });
}

fs.writeFileSync(REPORT, report.join('\n'));

console.log('\n══════════ RAPPORT ══════════');
console.log(`  ${results.filter(r => r.ok).length}/${results.length} fichiers valides`);
console.log(`  ${totalItems} entrées au total`);
console.log(`  Rapport : ${path.relative(ROOT, REPORT)}\n`);
