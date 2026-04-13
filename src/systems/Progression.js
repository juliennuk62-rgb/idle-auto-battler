// Fonctions pures de progression — XP curve, reward par wave, calcul de
// stats selon le niveau. Zéro dépendance Phaser / ResourceSystem / Fighter.
// Tout lit les formules depuis balance.js.
//
// L'objectif est d'avoir un module testable en isolation et réutilisable
// côté UI (afficher "il te manque X XP pour L5") ou côté analytics sans
// instancier un Fighter.

import { BALANCE } from '../data/balance.js';

/**
 * XP gagné en tuant un monstre à une wave donnée.
 * Appliqué à chaque allié vivant (XP partagé — chaque membre de l'équipe
 * reçoit le montant complet, pas une fraction divisée).
 */
export function computeXpReward(wave) {
  const cfg = BALANCE.xp;
  const waveIdx = Math.max(0, wave - 1);
  let xp = cfg.per_kill_base * Math.pow(cfg.growth, waveIdx);

  const isBoss = wave > 0 && wave % BALANCE.wave.boss_interval === 0;
  if (isBoss) xp *= cfg.boss_mult;

  return Math.max(1, Math.round(xp));
}

/**
 * XP requise pour passer du niveau `level` au niveau `level + 1`.
 * Retourne Infinity si `level` est déjà le niveau max (impossible de monter).
 */
export function xpToNextLevel(level) {
  const cfg = BALANCE.xp;
  if (level >= cfg.max_level) return Infinity;
  return cfg.per_level_base * level;
}

/**
 * XP cumulé depuis L1 jusqu'au début du niveau `level`. Pratique pour
 * calculer un progrès global affichable dans l'UI.
 */
export function totalXpForLevel(level) {
  const cfg = BALANCE.xp;
  const capped = Math.min(level, cfg.max_level);
  let total = 0;
  for (let i = 1; i < capped; i++) {
    total += cfg.per_level_base * i;
  }
  return total;
}

/**
 * Stats effectives d'une unité à un niveau donné à partir de ses base stats.
 * Utilisé à chaque level-up pour recalculer maxHp et atk. Suppose grade 1 —
 * pour les grades supérieurs, voir statsForGradeLevel().
 *
 * @param {Object} base - { hp, atk } — valeurs de référence au niveau 1
 * @param {number} level
 * @returns {{ hp: number, atk: number }}
 */
export function statsForLevel(base, level) {
  const cfg = BALANCE.xp;
  const mult = level - 1;
  return {
    hp: Math.round(base.hp * Math.pow(cfg.hp_per_level, mult)),
    atk: Math.round(base.atk * Math.pow(cfg.atk_per_level, mult)),
  };
}

/**
 * Stats complètes combinant grade et niveau.
 *   stat = base × grade_stat_mult^(grade-1) × per_level^(level-1)
 *
 * Exemple avec grade_stat_mult=2.5, hp_per_level=1.10 :
 *   grade 1 L1  → ×1
 *   grade 1 L10 → ×2.36
 *   grade 2 L1  → ×2.5     (+6% vs grade 1 L10)
 *   grade 2 L10 → ×5.90
 *   grade 8 L10 → ×1442
 *
 * @param {Object} base - { hp, atk } au grade 1 L1
 * @param {number} grade
 * @param {number} level
 */
export function statsForGradeLevel(base, grade, level) {
  const cfg = BALANCE.xp;
  const gradeMult = Math.pow(cfg.grade_stat_mult, Math.max(0, grade - 1));
  const levelMult = Math.max(0, level - 1);
  return {
    hp: Math.round(base.hp * gradeMult * Math.pow(cfg.hp_per_level, levelMult)),
    atk: Math.round(base.atk * gradeMult * Math.pow(cfg.atk_per_level, levelMult)),
  };
}
