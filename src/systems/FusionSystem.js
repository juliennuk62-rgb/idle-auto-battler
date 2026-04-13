// Système de fusion — fonctions pures, zéro dépendance Phaser.
//
// Règles :
// - 3 unités de MÊME classe et MÊME grade → 1 unité de classe identique, grade+1, niveau 1.
// - L'XP accumulée dans les 3 unités fusionnées est PERDUE (trade-off du rush).
// - Aucune fusion possible au grade max (MAX_GRADE = 8).
//
// L'API opère sur des "unit specs" (objets plats avec { id, class, grade, level, xp })
// plutôt que sur des instances Fighter — c'est volontairement découplé pour
// pouvoir tester la logique sans monter une scène Phaser.

import { BALANCE } from '../data/balance.js';
import { MAX_GRADE } from '../data/grades.js';

/**
 * Vérifie qu'un trio d'unités est fusable.
 * Retourne { ok: true } ou { ok: false, reason: '...' }.
 */
export function canFuse(units) {
  if (!Array.isArray(units)) return { ok: false, reason: 'not an array' };
  if (units.length !== BALANCE.fusion.cost) {
    return { ok: false, reason: `need exactly ${BALANCE.fusion.cost} units, got ${units.length}` };
  }
  const first = units[0];
  if (!first) return { ok: false, reason: 'empty slot' };

  for (const u of units) {
    if (!u) return { ok: false, reason: 'empty slot' };
    if (u.class !== first.class) {
      return { ok: false, reason: `class mismatch (${u.class} vs ${first.class})` };
    }
    if (u.grade !== first.grade) {
      return { ok: false, reason: `grade mismatch (${u.grade} vs ${first.grade})` };
    }
  }

  if (first.grade >= MAX_GRADE) {
    return { ok: false, reason: `already at max grade (${MAX_GRADE})` };
  }

  return { ok: true };
}

/**
 * Fusionne 3 unités en une nouvelle. Le caller est responsable de retirer
 * les 3 unités fusionnées de sa structure (roster, teamA, etc.) après coup.
 * Retourne le spec de la nouvelle unité OU null si la fusion est invalide.
 */
export function fuse(units) {
  const check = canFuse(units);
  if (!check.ok) return null;
  const [a] = units;
  return {
    class: a.class,
    grade: a.grade + 1,
    level: 1,
    xp: 0,
    // id est laissé à la charge du caller (Fighter auto-incrémente)
  };
}

/**
 * Cherche dans un tableau de specs un trio fusable — utile pour une UI
 * "auto-fuse" ou pour un debug shortcut. Retourne le tableau de 3 unités
 * trouvées OU null.
 */
export function findFusableTrio(units) {
  // Indexe par clé "class:grade". Premier bucket qui contient 3+ = gagné.
  const buckets = new Map();
  for (const u of units) {
    if (!u) continue;
    if (u.grade >= MAX_GRADE) continue;
    const key = `${u.class}:${u.grade}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(u);
  }
  for (const trio of buckets.values()) {
    if (trio.length >= BALANCE.fusion.cost) {
      return trio.slice(0, BALANCE.fusion.cost);
    }
  }
  return null;
}
