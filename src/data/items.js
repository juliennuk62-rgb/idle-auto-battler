// Système d'items — templates, raretés, sets d'équipement, enchantements.
//
// Chaque biome a un set de 3 pièces (arme + armure + accessoire).
// Les items sont générés via generateItem(biome, wave) qui roule la rareté,
// pioche un template, et applique des enchantements aléatoires.

// ─── Raretés ────────────────────────────────────────────────────────────────

export const RARITIES = [
  { id: 'common',    name: 'Commun',      color: '#9ca3af', weight: 60, statMult: 1.0, enchants: 0 },
  { id: 'uncommon',  name: 'Peu commun',  color: '#22c55e', weight: 25, statMult: 1.5, enchants: 1 },
  { id: 'rare',      name: 'Rare',        color: '#3b82f6', weight: 10, statMult: 2.0, enchants: 1 },
  { id: 'epic',      name: 'Épique',      color: '#a855f7', weight: 4,  statMult: 3.0, enchants: 2 },
  { id: 'legendary', name: 'Légendaire',  color: '#f97316', weight: 1,  statMult: 5.0, enchants: 2 },
  { id: 'mythic',    name: 'Mythique',    color: '#ff6b9d', weight: 0,  statMult: 8.0, enchants: 3 },
];

export const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));

export function getRarity(id) {
  return RARITIES.find(r => r.id === id) || RARITIES[0];
}

// ─── Enchantements possibles ────────────────────────────────────────────────

export const ENCHANT_POOL = [
  { id: 'atk_flat',      name: '+{v} ATK',           stat: 'atk',   mode: 'flat',    min: 2,  max: 20 },
  { id: 'hp_flat',       name: '+{v} HP',            stat: 'hp',    mode: 'flat',    min: 5,  max: 50 },
  { id: 'atk_percent',   name: '+{v}% ATK',          stat: 'atk',   mode: 'percent', min: 3,  max: 15 },
  { id: 'hp_percent',    name: '+{v}% HP',           stat: 'hp',    mode: 'percent', min: 3,  max: 15 },
  { id: 'speed_percent', name: '+{v}% vitesse',      stat: 'speed', mode: 'percent', min: 2,  max: 10 },
  { id: 'gold_percent',  name: '+{v}% or trouvé',    stat: 'gold',  mode: 'percent', min: 5,  max: 25 },
  { id: 'xp_percent',    name: '+{v}% XP',           stat: 'xp',    mode: 'percent', min: 5,  max: 20 },
  { id: 'heal_power',    name: '+{v} soin',          stat: 'heal',  mode: 'flat',    min: 3,  max: 15 },
];

// ─── Sets d'équipement (1 par biome) ────────────────────────────────────────

export const SETS = {
  forest: { name: 'Set Forêt',   bonus2: { hp_percent: 10 },  bonus3: { atk_percent: 20 } },
  caves:  { name: 'Set Grottes', bonus2: { hp_percent: 15 },  bonus3: { heal_received: 25 } },
  ruins:  { name: 'Set Ruines',  bonus2: { xp_percent: 10 },  bonus3: { atk_percent: 15 } },
  hell:   { name: 'Set Enfer',   bonus2: { atk_percent: 15 }, bonus3: { atk_percent: 20 } },
  snow:   { name: 'Set Neige',   bonus2: { speed_percent: 10 }, bonus3: { hp_percent: 20 } },
  temple: { name: 'Set Temple',  bonus2: { gold_percent: 20 }, bonus3: { atk_percent: 25 } },
};

// ─── Templates d'items (3 par biome = 18 set pieces) ────────────────────────

// Icônes par TYPE (pas par template) — une icône unique et claire par slot.
// Résout le problème d'emojis qui se ressemblent entre eux.
export const TYPE_ICONS = {
  weapon: '⚔',
  armor: '🛡',
  accessory: '💎',
};

export const ITEM_TEMPLATES = [
  // Forêt
  { id: 'forest_sword',  name: 'Lame Sylvestre',     type: 'weapon',    set: 'forest', baseStat: { atk: 5 },  tier: 1 },
  { id: 'forest_armor',  name: 'Plastron de Chêne',  type: 'armor',     set: 'forest', baseStat: { hp: 15 },  tier: 1 },
  { id: 'forest_access', name: 'Amulette Verte',     type: 'accessory', set: 'forest', baseStat: { hp: 8 },   tier: 1 },
  // Grottes
  { id: 'caves_sword',   name: 'Masse de Pierre',    type: 'weapon',    set: 'caves',  baseStat: { atk: 7 },  tier: 2 },
  { id: 'caves_armor',   name: 'Bouclier Cristal',   type: 'armor',     set: 'caves',  baseStat: { hp: 20 },  tier: 2 },
  { id: 'caves_access',  name: 'Anneau Troglodyte',  type: 'accessory', set: 'caves',  baseStat: { hp: 10 },  tier: 2 },
  // Ruines
  { id: 'ruins_sword',   name: 'Khépesh Maudit',     type: 'weapon',    set: 'ruins',  baseStat: { atk: 10 }, tier: 3 },
  { id: 'ruins_armor',   name: 'Armure du Sphinx',    type: 'armor',     set: 'ruins',  baseStat: { hp: 28 },  tier: 3 },
  { id: 'ruins_access',  name: 'Scarabée d\'Or',     type: 'accessory', set: 'ruins',  baseStat: { hp: 14 },  tier: 3 },
  // Enfer
  { id: 'hell_sword',    name: 'Lame Infernale',     type: 'weapon',    set: 'hell',   baseStat: { atk: 14 }, tier: 4 },
  { id: 'hell_armor',    name: 'Cape de Cendres',    type: 'armor',     set: 'hell',   baseStat: { hp: 35 },  tier: 4 },
  { id: 'hell_access',   name: 'Orbe Démoniaque',    type: 'accessory', set: 'hell',   baseStat: { atk: 8 },  tier: 4 },
  // Neige
  { id: 'snow_sword',    name: 'Hache de Givre',     type: 'weapon',    set: 'snow',   baseStat: { atk: 18 }, tier: 5 },
  { id: 'snow_armor',    name: 'Robe de Glace',      type: 'armor',     set: 'snow',   baseStat: { hp: 45 },  tier: 5 },
  { id: 'snow_access',   name: 'Pendentif Arctique', type: 'accessory', set: 'snow',   baseStat: { hp: 22 },  tier: 5 },
  // Temple
  { id: 'temple_sword',  name: 'Épée Sacrée',        type: 'weapon',    set: 'temple', baseStat: { atk: 24 }, tier: 6 },
  { id: 'temple_armor',  name: 'Égide Céleste',      type: 'armor',     set: 'temple', baseStat: { hp: 60 },  tier: 6 },
  { id: 'temple_access', name: 'Relique Ancienne',   type: 'accessory', set: 'temple', baseStat: { atk: 14 }, tier: 6 },
];

// ─── Génération d'items ─────────────────────────────────────────────────────

/**
 * Génère un UID garanti unique — timestamp + random. Plus JAMAIS de collision.
 */
function makeUid() {
  return `i_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Nettoie un inventaire chargé : déduplique les UIDs, régénère si conflit.
 */
export function deduplicateInventory(inventory) {
  const seen = new Set();
  for (const item of inventory) {
    if (!item.uid || seen.has(item.uid)) {
      item.uid = makeUid(); // régénère un UID unique
    }
    seen.add(item.uid);
  }
  return inventory;
}

/**
 * Roule une rareté pondérée. waveShift décale les poids vers les raretés
 * supérieures (chaque 10 waves, les poids des communs baissent).
 */
export function rollRarity(waveShift = 0) {
  const shifted = RARITIES.map((r, i) => {
    let w = r.weight;
    if (i === 0) w = Math.max(10, w - waveShift * 5); // common shrinks
    if (i >= 2)  w += waveShift * 2; // rare+ grows
    return { ...r, w };
  });
  const total = shifted.reduce((s, r) => s + r.w, 0);
  let roll = Math.random() * total;
  for (const r of shifted) {
    roll -= r.w;
    if (roll <= 0) return r;
  }
  return shifted[0];
}

/**
 * Génère un enchantement aléatoire. La value est scalée par la rareté.
 */
function rollEnchant(rarityMult) {
  const pool = ENCHANT_POOL;
  const template = pool[Math.floor(Math.random() * pool.length)];
  const range = template.max - template.min;
  const value = Math.round(template.min + Math.random() * range * Math.min(1, rarityMult / 3));
  return {
    id: template.id,
    stat: template.stat,
    mode: template.mode,
    value,
    label: template.name.replace('{v}', String(value)),
  };
}

/**
 * Génère un item complet depuis un biome et une wave.
 * Retourne un objet item instance (pas un template).
 */
export function generateItem(biomeId, wave) {
  // Filtre les templates du biome (ou fallback forest).
  const biomeTpls = ITEM_TEMPLATES.filter(t => t.set === biomeId);
  const templates = biomeTpls.length > 0 ? biomeTpls : ITEM_TEMPLATES.filter(t => t.set === 'forest');
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Rareté avec shift basé sur la wave.
  const waveShift = Math.floor(wave / 10);
  const rarity = rollRarity(waveShift);

  // Enchantements (Uncommon+ seulement).
  const enchants = [];
  const maxEnchants = rarity.enchants;
  for (let i = 0; i < maxEnchants; i++) {
    if (i === 0 || Math.random() < 0.5) { // 2nd enchant = 50% chance
      enchants.push(rollEnchant(rarity.statMult));
    }
  }

  return {
    uid: makeUid(),
    templateId: template.id,
    name: template.name,
    type: template.type,
    set: template.set,
    icon: TYPE_ICONS[template.type] || '?',
    tier: template.tier,
    rarity: rarity.id,
    rarityColor: rarity.color,
    rarityName: rarity.name,
    // Stats finales = base × rareté mult.
    stats: {
      atk: Math.round((template.baseStat.atk || 0) * rarity.statMult),
      hp:  Math.round((template.baseStat.hp || 0)  * rarity.statMult),
    },
    enchants,
    equippedOn: null, // fighter id ou null
  };
}

/**
 * Génère un item depuis un coffre. Force le biome et une rareté minimum.
 * @param {string} biomeId — biome du coffre
 * @param {number} minRarityIdx — index min dans RARITIES (0=common, 1=uncommon, 2=rare...)
 */
export function generateFromChest(biomeId, minRarityIdx = 0) {
  const biomeTpls = ITEM_TEMPLATES.filter(t => t.set === biomeId);
  const templates = biomeTpls.length > 0 ? biomeTpls : ITEM_TEMPLATES.filter(t => t.set === 'forest');
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Roule une rareté, mais re-roll si en dessous du minimum garanti.
  let rarity = rollRarity(2); // waveShift=2 pour un meilleur loot de coffre
  let rarityIdx = RARITY_INDEX[rarity.id] ?? 0;
  if (rarityIdx < minRarityIdx) {
    rarity = RARITIES[minRarityIdx];
  }

  const enchants = [];
  const maxEnchants = rarity.enchants;
  for (let i = 0; i < maxEnchants; i++) {
    if (i === 0 || Math.random() < 0.5) {
      enchants.push(rollEnchant(rarity.statMult));
    }
  }

  return {
    uid: makeUid(),
    templateId: template.id,
    name: template.name,
    type: template.type,
    set: template.set,
    icon: TYPE_ICONS[template.type] || '?',
    tier: template.tier,
    rarity: rarity.id,
    rarityColor: rarity.color,
    rarityName: rarity.name,
    stats: {
      atk: Math.round((template.baseStat.atk || 0) * rarity.statMult),
      hp:  Math.round((template.baseStat.hp || 0)  * rarity.statMult),
    },
    enchants,
    equippedOn: null,
  };
}

/**
 * Calcule la valeur de vente en or d'un item.
 */
export function sellValue(item) {
  const rarityIdx = RARITY_INDEX[item.rarity] ?? 0;
  const base = (item.stats.atk + item.stats.hp) * (rarityIdx + 1);
  return Math.max(1, Math.round(base * 2 + item.tier * 5));
}

/**
 * Calcule les bonus de set pour un fighter qui a ces items équipés.
 * Retourne { atk_percent, hp_percent, ... } ou {} si pas de bonus.
 */
export function computeSetBonus(equippedItems) {
  const setCounts = {};
  for (const item of equippedItems) {
    if (item && item.set) {
      setCounts[item.set] = (setCounts[item.set] || 0) + 1;
    }
  }
  const bonuses = {};
  for (const [setId, count] of Object.entries(setCounts)) {
    const set = SETS[setId];
    if (!set) continue;
    if (count >= 2) Object.assign(bonuses, set.bonus2);
    if (count >= 3) Object.assign(bonuses, set.bonus3);
  }
  return bonuses;
}
