// dungeonConfig.js — Constantes du système de combat tour par tour en donjon.
// Grille, PA/PM par classe, scaling stats, formules de dégâts.

export const GRID = {
  cols: 10,
  rows: 8,
  cellSize: 43,   // réduit de 10% (était 48)
  originX: 135,   // centré : (800 - 10*43) / 2 = 135
  originY: 55,    // espace pour la timeline DOM au-dessus
};

// PA / PM / Initiative par classe de héros
export const CLASS_STATS = {
  warrior: { pa: 6, pm: 3, initiative: 20 },
  archer:  { pa: 6, pm: 4, initiative: 35 },
  mage:    { pa: 7, pm: 3, initiative: 25 },
  healer:  { pa: 6, pm: 3, initiative: 30 },
};

// Tiers de donjon (1 par biome)
export const DUNGEON_TIERS = {
  forest: 1,
  caves:  2,
  ruins:  3,
  hell:   4,
  snow:   5,
  temple: 6,
};

// Scaling des mobs
export const SCALING = {
  baseHp: 80,
  baseAtk: 12,
  hpGrowthPerTier: 1.5,    // baseHp × 1.5^(tier-1)
  atkGrowthPerTier: 1.4,   // baseAtk × 1.4^(tier-1)
  roomMultipliers: [1.0, 1.2, 1.4, 1.6, 2.0], // salle 1→5
  bossHpMult: 5.0,
  bossAtkMult: 2.0,
};

// Formule de dégâts
export const DAMAGE = {
  varianceMin: 0.90,
  varianceMax: 1.10,
  defendReduction: 0.30,  // +30% réduction dégâts en défense
};

// Structure d'un donjon
export const DUNGEON_ROOMS = 5; // 4 salles + 1 boss

// Choix entre salles
export const ROOM_CHOICES = {
  healPercent: 0.40,  // 40% HP max
};

// Récompenses
export const REWARDS = {
  goldPerRoom: 30,
  goldPerKill: 5,
  completionGold: 500,
  completionGems: 10,
};

// Couleurs pour l'UI de la grille
export const GRID_COLORS = {
  cellBorder: 0x2d2d4a,
  cellFill: 0x1a1a2e,
  cellHover: 0x252541,
  moveRange: 0x3b82f6,      // bleu
  attackRange: 0xef4444,     // rouge
  aoePreview: 0xf97316,     // orange
  healRange: 0x22c55e,      // vert
  pathHighlight: 0x60a5fa,  // bleu clair
  selectedUnit: 0xfbbf24,   // doré
  terrainWall: 0x555555,
  terrainHole: 0x0a0a0a,
  terrainFire: 0xff4422,
  terrainIce: 0x88ccff,
  terrainTrap: 0x8b5cf6,
};

// Terrain types
export const TERRAIN = {
  normal: { walkable: true, losBlocking: false, moveCost: 1 },
  wall: { walkable: false, losBlocking: true, moveCost: Infinity },
  hole: { walkable: false, losBlocking: false, moveCost: Infinity },
  fire: { walkable: true, losBlocking: false, moveCost: 1, damagePercent: 15 },
  ice: { walkable: true, losBlocking: false, moveCost: 2 },
  trap: { walkable: true, losBlocking: false, moveCost: 1, hidden: true },
  glyph: { walkable: true, losBlocking: false, moveCost: 1, damageFlat: 0 },
};
