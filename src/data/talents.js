// Talent trees — 4 classes × 3 branches × 3 tiers.
// Coût : tier 1 = 1pt, tier 2 = 2pts, tier 3 = 3pts.
// Maxer 1 branche = 6pts. Avec 9pts (L10), on peut spécialiser 1 branche + 3pts d'une autre.

export const TALENT_TREES = {
  warrior: {
    name: 'Guerrier',
    branches: [
      {
        id: 'tank', name: 'Tank', icon: '🛡', color: '#3b82f6',
        tiers: [
          { id: 'w_tank_1', name: '+15% HP',            cost: 1, effect: { hpPercent: 15 } },
          { id: 'w_tank_2', name: '-10% dégâts reçus',  cost: 2, effect: { dmgReduction: 10 } },
          { id: 'w_tank_3', name: 'Bouclier absorbant',  cost: 3, effect: { shield: 10 }, desc: 'Absorbe 10% max HP en début de combat' },
        ],
      },
      {
        id: 'dps', name: 'DPS', icon: '⚔', color: '#ef4444',
        tiers: [
          { id: 'w_dps_1', name: '+15% ATK',            cost: 1, effect: { atkPercent: 15 } },
          { id: 'w_dps_2', name: '+10% vitesse',         cost: 2, effect: { speedPercent: 10 } },
          { id: 'w_dps_3', name: 'Double frappe',        cost: 3, effect: { doubleStrike: 20 }, desc: '20% chance de frapper 2 fois' },
        ],
      },
      {
        id: 'support', name: 'Support', icon: '💚', color: '#22c55e',
        tiers: [
          { id: 'w_sup_1', name: '+20% heal reçu',       cost: 1, effect: { healReceived: 20 } },
          { id: 'w_sup_2', name: 'Aura +10% HP alliés', cost: 2, effect: { auraHp: 10 }, desc: 'Tous les alliés gagnent 10% HP' },
          { id: 'w_sup_3', name: 'Résurrection',         cost: 3, effect: { resurrect: true }, desc: 'Revit 1 fois par combat à 30% HP' },
        ],
      },
    ],
  },

  archer: {
    name: 'Archer',
    branches: [
      {
        id: 'sniper', name: 'Sniper', icon: '🎯', color: '#f97316',
        tiers: [
          { id: 'a_snp_1', name: '+20% ATK',             cost: 1, effect: { atkPercent: 20 } },
          { id: 'a_snp_2', name: '+50px portée',          cost: 2, effect: { rangeBonus: 50 } },
          { id: 'a_snp_3', name: 'Exécution',             cost: 3, effect: { execute: 25 }, desc: '×2 dégâts si cible <25% HP' },
        ],
      },
      {
        id: 'rapid', name: 'Rapide', icon: '⚡', color: '#fbbf24',
        tiers: [
          { id: 'a_rap_1', name: '+15% vitesse',          cost: 1, effect: { speedPercent: 15 } },
          { id: 'a_rap_2', name: 'Multi-tir',             cost: 2, effect: { multiTarget: 2 }, desc: 'Touche 2 cibles par attaque' },
          { id: 'a_rap_3', name: 'Barrage',               cost: 3, effect: { ultHits: 5 }, desc: 'Ultime tire 5 fois au lieu de 3' },
        ],
      },
      {
        id: 'utility', name: 'Utilité', icon: '💰', color: '#a855f7',
        tiers: [
          { id: 'a_utl_1', name: '+25% or trouvé',        cost: 1, effect: { goldPercent: 25 } },
          { id: 'a_utl_2', name: '+25% XP',               cost: 2, effect: { xpPercent: 25 } },
          { id: 'a_utl_3', name: 'Flèche poison',         cost: 3, effect: { poison: 20 }, desc: 'Réduit ATK ennemi de 20%' },
        ],
      },
    ],
  },

  mage: {
    name: 'Mage',
    branches: [
      {
        id: 'fire', name: 'Feu', icon: '🔥', color: '#ef4444',
        tiers: [
          { id: 'm_fir_1', name: '+20% ATK AoE',         cost: 1, effect: { atkPercent: 20 } },
          { id: 'm_fir_2', name: 'Brûlure',              cost: 2, effect: { burn: 5 }, desc: '5% HP/s pendant 3s après chaque hit' },
          { id: 'm_fir_3', name: 'Météore ×4',           cost: 3, effect: { ultMult: 4 }, desc: 'Ultime fait ×4 ATK au lieu de ×3' },
        ],
      },
      {
        id: 'ice', name: 'Glace', icon: '❄', color: '#60a5fa',
        tiers: [
          { id: 'm_ice_1', name: '-10% vit. ennemis',    cost: 1, effect: { enemySlow: 10 } },
          { id: 'm_ice_2', name: '15% freeze 1s',         cost: 2, effect: { freeze: 15 }, desc: '15% chance de geler 1s à chaque hit' },
          { id: 'm_ice_3', name: 'Blizzard',             cost: 3, effect: { blizzard: true }, desc: 'AoE ralentit tous les ennemis 30%' },
        ],
      },
      {
        id: 'arcane', name: 'Arcane', icon: '🟣', color: '#a855f7',
        tiers: [
          { id: 'm_arc_1', name: 'Charge ultime +30%',   cost: 1, effect: { ultCharge: 30 } },
          { id: 'm_arc_2', name: '+15% pénétration',      cost: 2, effect: { magicPen: 15 } },
          { id: 'm_arc_3', name: 'Bouclier arcane',       cost: 3, effect: { arcaneShield: true }, desc: 'Absorbe 1 hit fatal par combat' },
        ],
      },
    ],
  },

  healer: {
    name: 'Soigneur',
    branches: [
      {
        id: 'holy', name: 'Sacré', icon: '✨', color: '#fbbf24',
        tiers: [
          { id: 'h_hol_1', name: '+25% puissance soin',  cost: 1, effect: { healPower: 25 } },
          { id: 'h_hol_2', name: 'Overheal → bouclier', cost: 2, effect: { overhealShield: true }, desc: 'Le surplus de soin devient un bouclier' },
          { id: 'h_hol_3', name: 'Résurrection',         cost: 3, effect: { resurrectAlly: true }, desc: 'Revit 1 allié mort par combat' },
        ],
      },
      {
        id: 'nature', name: 'Nature', icon: '🌿', color: '#22c55e',
        tiers: [
          { id: 'h_nat_1', name: 'Regen passive 2%/5s', cost: 1, effect: { teamRegen: 2 }, desc: 'Tous les alliés régénèrent 2% HP toutes les 5s' },
          { id: 'h_nat_2', name: '+20% heal équipe',     cost: 2, effect: { teamHealBoost: 20 } },
          { id: 'h_nat_3', name: 'Bénédiction +',        cost: 3, effect: { ultBoost: 30 }, desc: 'Ultime donne aussi +30% HP max temporaire' },
        ],
      },
      {
        id: 'discipline', name: 'Discipline', icon: '⚔', color: '#ef4444',
        tiers: [
          { id: 'h_dis_1', name: 'Soins = 30% dégâts',  cost: 1, effect: { healDamage: 30 }, desc: 'Chaque soin inflige aussi 30% en dégâts' },
          { id: 'h_dis_2', name: '+15% ATK équipe',      cost: 2, effect: { teamAtk: 15 } },
          { id: 'h_dis_3', name: 'Intervention divine',  cost: 3, effect: { divineIntervention: true }, desc: 'Annule 1 mort d\'allié par combat' },
        ],
      },
    ],
  },
};

/**
 * Retourne l'arbre de talents d'une classe.
 */
export function getTalentTree(className) {
  return TALENT_TREES[className] || null;
}

/**
 * Calcule le coût total d'un tier (1/2/3).
 */
export function tierCost(tier) {
  return tier; // tier 1 = 1pt, tier 2 = 2pts, tier 3 = 3pts
}
