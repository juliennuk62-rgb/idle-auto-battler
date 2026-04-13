// Monster templates — noms, variants, et sprites par biome.
//
// Chaque entrée de pool peut être :
//   - un string : nom simple, utilise le sprite fallback 'monster' (tkobold.gif)
//   - un objet { name, sprite } : nom + sprite key dédié
//
// Cette dualité permet d'ajouter des sprites biome par biome sans tout
// migrer d'un coup — les biomes sans sprites restent sur le fallback.

export const MONSTER_POOLS = {
  // ── Forêt (waves 1-10) — sprites dédiés ──
  forest: {
    normal: [
      { name: 'Gobelin', sprite: 'gobelin' },
      { name: 'Loup', sprite: 'loup' },
      { name: 'Sanglier', sprite: 'sanglier' },
      { name: 'Araignée', sprite: 'araignee' },
    ],
    boss: { name: 'Roi Gobelin', sprite: 'boss_roi_gobelin' },
  },

  // ── Grottes (waves 11-20) — sprites dédiés ──
  caves: {
    normal: [
      { name: 'Chauve-souris', sprite: 'chauve_souris' },
      { name: 'Troll', sprite: 'troll' },
      { name: 'Slime', sprite: 'slime' },
      { name: 'Rat géant', sprite: 'rat_geant' },
    ],
    boss: { name: 'Troll Ancien', sprite: 'boss_troll_ancien' },
  },

  // ── Ruines (waves 21-30) — boss_pharaon manquant → fallback ──
  ruins: {
    normal: [
      { name: 'Squelette', sprite: 'squelette' },
      { name: 'Momie', sprite: 'momie' },
      { name: 'Sphinx', sprite: 'sphinx' },
      { name: 'Fantôme', sprite: 'fantome' },
    ],
    boss: 'Pharaon Maudit', // fallback tant que boss_pharaon.png manque
  },

  // ── Enfer (waves 31-40) — cerbere, succube, boss_balrog manquants ──
  hell: {
    normal: [
      { name: 'Démon', sprite: 'demon' },
      { name: 'Imp', sprite: 'imp' },
      'Cerbère',  // fallback
      'Succube',  // fallback
    ],
    boss: 'Balrog', // fallback
  },

  // ── Neige (waves 41-50) — yeti, ours_blanc manquants ──
  snow: {
    normal: [
      'Yéti',      // fallback
      'Ours blanc', // fallback
      { name: 'Mage de glace', sprite: 'mage_glace' },
      { name: 'Loup arctique', sprite: 'loup_arctique' },
    ],
    boss: { name: 'Roi des Neiges', sprite: 'boss_roi_neiges' },
  },

  // ── Temple (waves 51-60) — sprites dédiés ──
  temple: {
    normal: [
      { name: 'Gardien', sprite: 'gardien' },
      { name: 'Golem', sprite: 'golem' },
      { name: 'Esprit', sprite: 'esprit' },
      { name: 'Sentinelle', sprite: 'sentinelle' },
    ],
    boss: { name: 'Dragon Ancestral', sprite: 'boss_dragon' },
  },
};

/**
 * Retourne un objet { name, spriteKey, spriteScale } pour un monstre.
 * Les entrées avec sprite dédié utilisent scale 1 (sprites 48px natifs).
 * Les entrées fallback (string) utilisent scale 3 (tkobold.gif 18×24).
 */
export function pickMonster(biomeId, isBoss) {
  const pool = MONSTER_POOLS[biomeId] || MONSTER_POOLS.forest;

  if (isBoss) {
    const boss = pool.boss;
    if (typeof boss === 'string') {
      return { name: boss, spriteKey: 'monster', spriteScale: 3 };
    }
    return { name: boss.name, spriteKey: boss.sprite, spriteScale: 1 };
  }

  const entries = pool.normal;
  const entry = entries[Math.floor(Math.random() * entries.length)];
  if (typeof entry === 'string') {
    return { name: entry, spriteKey: 'monster', spriteScale: 3 };
  }
  return { name: entry.name, spriteKey: entry.sprite, spriteScale: 1 };
}

/**
 * Retourne juste le nom (compat ancienne API).
 */
export function pickMonsterName(biomeId, isBoss) {
  return pickMonster(biomeId, isBoss).name;
}

/**
 * Nombre de monstres pour une vague donnée.
 */
export function monsterCountForWave(wave, bossInterval = 5, divisor = 8, max = 4) {
  if (wave > 0 && wave % bossInterval === 0) return 1;
  return Math.min(max, 1 + Math.floor(Math.max(0, wave - 1) / divisor));
}
