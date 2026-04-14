#!/usr/bin/env node
/**
 * apply-patches.js — nettoie et applique les patches du visual-overhaul.
 *
 * Retire les wrappers Markdown (```diff / ```) et applique via git apply.
 * Mode dry-run par défaut pour vérifier avant d'appliquer.
 *
 * Usage :
 *   npm run apply-patches            # dry-run : liste ce qui s'appliquerait
 *   npm run apply-patches -- --apply # applique vraiment
 *   npm run apply-patches -- --only 1,3,5,7 # seulement certains numéros
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const IN_DIR     = path.join(__dirname, 'out', 'visual-overhaul');

const args = process.argv.slice(2);
const DO_APPLY = args.includes('--apply');
const onlyIdx  = args.find(a => a.startsWith('--only'));
const only     = onlyIdx
  ? args[args.indexOf(onlyIdx) + 1]?.split(',').map(n => parseInt(n, 10)) || []
  : null;

function cleanPatch(content) {
  // Retire les wrappers ```diff au début et ``` à la fin, ainsi que tout texte avant le premier diff
  let cleaned = content
    .replace(/^```(?:diff)?\s*\n/gm, '')    // lignes commençant par ```diff
    .replace(/^```\s*$/gm, '')               // lignes fermantes ```
    .trim();

  // S'assure que ça commence par "--- a/"
  const startIdx = cleaned.indexOf('--- a/');
  if (startIdx > 0) cleaned = cleaned.slice(startIdx);

  // Ajoute un newline final si manquant (git apply en a besoin)
  if (!cleaned.endsWith('\n')) cleaned += '\n';
  return cleaned;
}

function listPatches() {
  return fs.readdirSync(IN_DIR)
    .filter(f => f.endsWith('.patch') && /^\d+-/.test(f))
    .sort();
}

// Ordre officiel recommandé par l'Intégrateur (voir MANIFEST.md)
const RECOMMENDED_ORDER = [
  '01-glow-progression-bars',
  '08-ultimate-charge-glow',
  '09-card-hover-lift',
  '19-equipment-slot-shine',
  '10-biome-color-overlay',
  '11-wave-banner-slide-in',
  '13-unit-idle-bob',
  '07-floating-damage-arc',
  '02-particle-hit-impact',
  '03-hit-stop-critical',
  '05-shake-screen-boss-spawn',
  '17-item-drop-beam',
  '22-levelup-star-burst',
  '14-respawn-portal-effect',
  '23-resource-counter-pulse',
];

console.log(`\n══════ APPLY PATCHES ${DO_APPLY ? '🚀 MODE APPLY' : '🔍 DRY-RUN'} ══════\n`);

const allPatches = listPatches();
const orderedPatches = RECOMMENDED_ORDER
  .map(base => allPatches.find(p => p.startsWith(base)))
  .filter(Boolean);

const toProcess = only
  ? orderedPatches.filter((_, i) => only.includes(i + 1))
  : orderedPatches;

console.log(`${toProcess.length} patches à traiter (ordre Intégrateur)\n`);

let ok = 0, fail = 0;
for (const [i, filename] of toProcess.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const src = path.join(IN_DIR, filename);
  const raw = fs.readFileSync(src, 'utf8');
  const cleaned = cleanPatch(raw);

  // Écrit une version nettoyée à côté
  const cleanPath = path.join(IN_DIR, filename.replace('.patch', '.cleaned.patch'));
  fs.writeFileSync(cleanPath, cleaned);

  if (!DO_APPLY) {
    // Dry-run : git apply --check
    try {
      execSync(`git apply --check "${cleanPath}"`, { cwd: ROOT, stdio: 'pipe' });
      console.log(`✅ ${n}  ${filename.replace('.patch', '')}  — applicable`);
      ok++;
    } catch (err) {
      const msg = err.stderr?.toString().trim().split('\n')[0] || 'erreur inconnue';
      console.log(`❌ ${n}  ${filename.replace('.patch', '')}  — ${msg.slice(0, 80)}`);
      fail++;
    }
  } else {
    try {
      execSync(`git apply "${cleanPath}"`, { cwd: ROOT, stdio: 'pipe' });
      console.log(`✅ ${n}  ${filename.replace('.patch', '')}  — appliqué`);
      ok++;
    } catch (err) {
      const msg = err.stderr?.toString().trim().split('\n')[0] || 'erreur inconnue';
      console.log(`❌ ${n}  ${filename.replace('.patch', '')}  — ${msg.slice(0, 80)}`);
      fail++;
    }
  }
}

console.log(`\n══════ RÉSUMÉ ══════`);
console.log(`  ${ok} applicables / ${fail} en échec / ${toProcess.length} total`);
if (!DO_APPLY && ok > 0) {
  console.log(`\n💡 Pour appliquer pour de vrai :`);
  console.log(`     npm run apply-patches -- --apply`);
  console.log(`\n💡 Pour appliquer seulement certains (numéros de ligne du résumé) :`);
  console.log(`     npm run apply-patches -- --apply --only 1,3,5`);
}
if (DO_APPLY && fail > 0) {
  console.log(`\n⚠️ ${fail} patches ont échoué. Vérifie le diff à la main dans scripts/out/visual-overhaul/`);
}
console.log('');
