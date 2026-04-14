#!/usr/bin/env node
/**
 * apply-fixed.js — applique les patches réparés (visual-overhaul-fixed/).
 *
 * Usage :
 *   npm run apply-fixed            # dry-run
 *   npm run apply-fixed -- --apply # applique
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const IN_DIR     = path.join(__dirname, 'out', 'visual-overhaul-fixed');

const DO_APPLY = process.argv.includes('--apply');

console.log(`\n══════ APPLY FIXED PATCHES ${DO_APPLY ? '🚀 MODE APPLY' : '🔍 DRY-RUN'} ══════\n`);

if (!fs.existsSync(IN_DIR)) {
  console.log(`❌ Dossier ${path.relative(ROOT, IN_DIR)} inexistant. Lance d'abord : npm run patch-fixer`);
  process.exit(1);
}

const patches = fs.readdirSync(IN_DIR)
  .filter(f => f.endsWith('.patch') && /^\d+-/.test(f))
  .sort();

console.log(`${patches.length} patches réparés à traiter\n`);

let ok = 0, fail = 0;
for (const [i, filename] of patches.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const full = path.join(IN_DIR, filename);
  try {
    execSync(`git apply ${DO_APPLY ? '' : '--check'} "${full}"`, { cwd: ROOT, stdio: 'pipe' });
    console.log(`✅ ${n}  ${filename.replace('.patch', '')}  — ${DO_APPLY ? 'appliqué' : 'applicable'}`);
    ok++;
  } catch (err) {
    const msg = err.stderr?.toString().trim().split('\n')[0] || 'erreur';
    console.log(`❌ ${n}  ${filename.replace('.patch', '')}  — ${msg.slice(0, 80)}`);
    fail++;
  }
}

console.log(`\n══════ RÉSUMÉ ══════`);
console.log(`  ${ok} ${DO_APPLY ? 'appliqués' : 'applicables'} / ${fail} en échec\n`);

if (!DO_APPLY && ok > 0) {
  console.log(`💡 Pour appliquer pour de vrai : npm run apply-fixed -- --apply\n`);
}
if (DO_APPLY && ok > 0) {
  console.log(`💡 Pour voir les changements : git diff`);
  console.log(`💡 Pour annuler tout        : git checkout .\n`);
}
