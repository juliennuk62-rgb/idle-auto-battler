// Pool de héros invocables — 20 héros (5 par classe × 4 raretés).
// Les héros REMPLACENT les unités de base. Un SSR Guerrier est directement
// meilleur qu'une Recrue. statMult s'applique sur les stats de base de la classe.

export const HERO_RARITIES = {
  R:   { name: 'Rare',        color: '#3b82f6', mult: 1.2, rate: 70, passifs: 0 },
  SR:  { name: 'Super Rare',  color: '#a855f7', mult: 1.5, rate: 20, passifs: 0 },
  SSR: { name: 'SSR',         color: '#fbbf24', mult: 2.0, rate: 8,  passifs: 1 },
  UR:  { name: 'Ultra Rare',  color: '#ef4444', mult: 3.0, rate: 2,  passifs: 2 },
};

export const HEROES = [
  // ── WARRIORS ──────────────────────────────────────────────
  { id: 'garde_royal',      name: 'Garde Royal',        class: 'warrior', rarity: 'R',   lore: 'Fidèle protecteur du royaume.' },
  { id: 'centurion',        name: 'Centurion',          class: 'warrior', rarity: 'R',   lore: 'Vétéran de mille batailles.' },
  { id: 'chevalier_noir',   name: 'Chevalier Noir',     class: 'warrior', rarity: 'SR',  lore: 'Son armure absorbe la lumière.' },
  { id: 'paladin_celeste',  name: 'Paladin Céleste',    class: 'warrior', rarity: 'SSR', lore: 'Béni par les dieux de la guerre.',
    passifs: [{ id: 'aura_hp', name: '+20% HP alliés', desc: 'Tous les alliés gagnent 20% HP max', effect: { teamHpPercent: 20 } }] },
  { id: 'dieu_guerre',      name: 'Dieu de la Guerre',  class: 'warrior', rarity: 'UR',  lore: 'La légende incarnée.',
    passifs: [
      { id: 'immortel', name: 'Immortel', desc: 'Invincible 2s quand HP <10%', effect: { lastStand: true } },
      { id: 'taunt_perm', name: 'Provocation', desc: 'Attire tous les ennemis en permanence', effect: { permanentTaunt: true } },
    ] },

  // ── ARCHERS ───────────────────────────────────────────────
  { id: 'chasseur',          name: 'Chasseur',           class: 'archer',  rarity: 'R',   lore: 'Traque sa proie sans relâche.' },
  { id: 'eclaireur',        name: 'Éclaireur',          class: 'archer',  rarity: 'R',   lore: 'Ses yeux voient tout.' },
  { id: 'ranger_elite',     name: 'Ranger d\'Élite',    class: 'archer',  rarity: 'SR',  lore: 'Chaque flèche trouve sa cible.' },
  { id: 'tireur_elite',     name: 'Tireur d\'Élite',    class: 'archer',  rarity: 'SSR', lore: 'Une balle, un ennemi.',
    passifs: [{ id: 'perce_armure', name: 'Perce-armure', desc: 'Ignore 30% des défenses', effect: { armorPen: 30 } }] },
  { id: 'artemis',          name: 'Artémis',            class: 'archer',  rarity: 'UR',  lore: 'La déesse chasseresse elle-même.',
    passifs: [
      { id: 'triple_tir', name: 'Triple tir', desc: 'Tire 3 projectiles par attaque', effect: { multiShot: 3 } },
      { id: 'crit_fatal', name: 'Crit fatal', desc: '+100% dégâts critiques', effect: { critDmgBonus: 100 } },
    ] },

  // ── MAGES ─────────────────────────────────────────────────
  { id: 'apprenti_mystique', name: 'Apprenti Mystique', class: 'mage',    rarity: 'R',   lore: 'Curieux et téméraire.' },
  { id: 'pyromancien',      name: 'Pyromancien',        class: 'mage',    rarity: 'R',   lore: 'Le feu est son ami.' },
  { id: 'archimage',        name: 'Archimage',          class: 'mage',    rarity: 'SR',  lore: 'Maître de tous les éléments.' },
  { id: 'seigneur_elements',name: 'Seigneur des Éléments', class: 'mage', rarity: 'SSR', lore: 'Feu et glace obéissent à sa volonté.',
    passifs: [{ id: 'dual_element', name: 'Dual élément', desc: 'AoE brûle ET gèle en alternance', effect: { dualElement: true } }] },
  { id: 'merlin',           name: 'Merlin',             class: 'mage',    rarity: 'UR',  lore: 'L\'enchanteur originel.',
    passifs: [
      { id: 'charge_rapide', name: 'Charge rapide', desc: 'Ultime charge 2× plus vite', effect: { ultChargeBonus: 100 } },
      { id: 'aoe_supreme', name: 'AoE suprême', desc: 'AoE fait ×5 ATK', effect: { aoeMult: 5 } },
    ] },

  // ── HEALERS ───────────────────────────────────────────────
  { id: 'acolyte_sacre',    name: 'Acolyte Sacré',      class: 'healer',  rarity: 'R',   lore: 'Dévoué à la guérison.' },
  { id: 'druide',           name: 'Druide',             class: 'healer',  rarity: 'R',   lore: 'La nature est son remède.' },
  { id: 'pretresse',        name: 'Prêtresse',          class: 'healer',  rarity: 'SR',  lore: 'Sa lumière guérit les blessures.' },
  { id: 'ange_gardien',     name: 'Ange Gardien',       class: 'healer',  rarity: 'SSR', lore: 'Veille sur chaque allié.',
    passifs: [{ id: 'revive', name: 'Résurrection', desc: 'Revit 1 allié mort par combat', effect: { autoRevive: true } }] },
  { id: 'deesse_vie',       name: 'Déesse de la Vie',   class: 'healer',  rarity: 'UR',  lore: 'La mort elle-même la craint.',
    passifs: [
      { id: 'heal_dmg', name: 'Soin offensif', desc: 'Les soins infligent aussi 50% en dégâts', effect: { healDamage: 50 } },
      { id: 'revive_inf', name: 'Résurrection infinie', desc: 'Revit tous les alliés morts', effect: { infiniteRevive: true } },
    ] },
];

/**
 * Retourne un héros par son ID.
 */
export function getHero(heroId) {
  return HEROES.find(h => h.id === heroId) || null;
}

/**
 * Retourne la config de rareté d'un héros.
 */
export function getHeroRarity(hero) {
  return HERO_RARITIES[hero.rarity] || HERO_RARITIES.R;
}

/**
 * Retourne tous les héros d'une classe.
 */
export function getHeroesByClass(className) {
  return HEROES.filter(h => h.class === className);
}
