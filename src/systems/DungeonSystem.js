// DungeonSystem — gère le run roguelike (état, buffs, cartes, floors).
// Singleton pur JS. Le run est transitoire (pas persisté — on recommence à chaque entrée).

import { BALANCE } from '../data/balance.js';

// ─── Pool de cartes de choix ────────────────────────────────────────────────

const CARD_POOL = [
  { id: 'rage',       name: 'Rage',          icon: '⚔',  category: 'offensif', desc: '+25% ATK pour tout le run',        effect: { atkPercent: 25 } },
  { id: 'celerity',   name: 'Célérité',      icon: '⚡',  category: 'offensif', desc: '+20% vitesse d\'attaque',          effect: { speedPercent: 20 } },
  { id: 'precision',  name: 'Précision',     icon: '🎯',  category: 'offensif', desc: '+50 px portée ranged',             effect: { rangeBonus: 50 } },
  { id: 'fortify',    name: 'Fortification', icon: '🛡',  category: 'défensif', desc: '+25% HP max (heal inclus)',        effect: { hpPercent: 25 } },
  { id: 'regen',      name: 'Régénération',  icon: '💚',  category: 'défensif', desc: 'Heal 50% de tous les alliés',      effect: { healAllPercent: 50 } },
  { id: 'shield',     name: 'Bouclier',      icon: '🔰',  category: 'défensif', desc: '-15% dégâts reçus',               effect: { dmgReduction: 15 } },
  { id: 'treasure',   name: 'Trésor',        icon: '💎',  category: 'loot',     desc: 'Drop un item garanti',            effect: { guaranteedDrop: true } },
  { id: 'goldrain',   name: 'Pluie d\'or',   icon: '◆',   category: 'loot',     desc: '+200% or prochain étage',         effect: { goldMult: 3 } },
  { id: 'darkpact',   name: 'Pacte sombre',  icon: '💀',  category: 'risque',   desc: '+40% ATK mais -30% HP max',       effect: { atkPercent: 40, hpPercent: -30 } },
  { id: 'doublebet',  name: 'Double ou rien',icon: '🎲',  category: 'risque',   desc: 'Ennemis ×2 mais loot ×3',         effect: { enemyMult: 2, lootMult: 3 } },
  { id: 'resurrect',  name: 'Résurrection',  icon: '✨',  category: 'spécial',  desc: '1 allié mort revit à 50% HP',     effect: { resurrect: true } },
  { id: 'ultready',   name: 'Ultime prêt',   icon: '🔥',  category: 'spécial',  desc: 'Toutes les jauges ultimes pleines', effect: { fillUltimates: true } },
];

const CAT_COLORS = {
  offensif: '#ef4444',
  défensif: '#3b82f6',
  loot: '#fbbf24',
  risque: '#a855f7',
  spécial: '#22c55e',
};

export class DungeonSystemImpl {
  constructor() {
    this.active = false;
    this.floor = 0;
    this.totalFloors = BALANCE.dungeon.totalFloors;
    this.activeBuffs = [];  // cartes choisies
    this.lootCollected = [];
    this.goldEarned = 0;
    this._nextGoldMult = 1;
    this._nextEnemyMult = 1;
    this._nextLootMult = 1;
  }

  // ─── Run lifecycle ──────────────────────────────────────────────────

  startRun() {
    this.active = true;
    this.floor = 0;
    this.activeBuffs = [];
    this.lootCollected = [];
    this.goldEarned = 0;
    this._nextGoldMult = 1;
    this._nextEnemyMult = 1;
    this._nextLootMult = 1;
  }

  isRunActive() { return this.active; }
  getCurrentFloor() { return this.floor; }
  getActiveBuffs() { return [...this.activeBuffs]; }

  /**
   * Prépare le prochain étage. Retourne les infos pour lancer le combat.
   */
  nextFloor() {
    this.floor++;
    const cfg = BALANCE.dungeon;
    const isBoss = this.floor === cfg.finalBossFloor;
    const isMiniBoss = this.floor === cfg.miniBossFloor;

    // Scaling des monstres par étage.
    let hpMult = Math.pow(cfg.scalingPerFloor, this.floor - 1);
    let atkMult = hpMult;
    if (isBoss) { hpMult *= cfg.finalBossHpMult; atkMult *= cfg.finalBossAtkMult; }
    else if (isMiniBoss) { hpMult *= cfg.miniBossHpMult; atkMult *= cfg.miniBossAtkMult; }

    // Nombre de monstres.
    let count = Math.floor(Math.random() * (cfg.monstersPerFloor.max - cfg.monstersPerFloor.min + 1)) + cfg.monstersPerFloor.min;
    if (isBoss || isMiniBoss) count = 1; // boss = seul
    count = Math.round(count * this._nextEnemyMult);
    this._nextEnemyMult = 1; // reset

    return {
      floor: this.floor,
      totalFloors: this.totalFloors,
      isBoss,
      isMiniBoss,
      hpMult,
      atkMult,
      monsterCount: Math.max(1, count),
      goldMult: this._nextGoldMult,
      lootMult: this._nextLootMult,
    };
  }

  /**
   * Appelé après un étage réussi. Gagne de l'or et prépare les cartes.
   */
  completeFloor(goldFromCombat) {
    const mult = this._nextGoldMult;
    this.goldEarned += Math.round((BALANCE.dungeon.goldPerFloor + goldFromCombat) * mult);
    this._nextGoldMult = 1;
    this._nextLootMult = 1;
  }

  /**
   * Tire 3 cartes aléatoires du pool (sans doublons avec les buffs actifs permanents).
   */
  drawCards() {
    const permanentIds = this.activeBuffs.filter(b => !b._oneShot).map(b => b.id);
    const available = CARD_POOL.filter(c => !permanentIds.includes(c.id));
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(c => ({ ...c, catColor: CAT_COLORS[c.category] || '#888' }));
  }

  /**
   * Applique la carte choisie.
   */
  applyCard(card) {
    // Effets one-shot (pas stockés comme buff permanent).
    if (card.effect.healAllPercent) { card._oneShot = true; }
    if (card.effect.fillUltimates) { card._oneShot = true; }
    if (card.effect.resurrect) { card._oneShot = true; }
    if (card.effect.guaranteedDrop) { card._oneShot = true; }

    // Effets sur le prochain étage seulement.
    if (card.effect.goldMult) { this._nextGoldMult = card.effect.goldMult; card._oneShot = true; }
    if (card.effect.enemyMult) { this._nextEnemyMult = card.effect.enemyMult; card._oneShot = true; }
    if (card.effect.lootMult) { this._nextLootMult = card.effect.lootMult; card._oneShot = true; }

    this.activeBuffs.push(card);
  }

  /**
   * Retourne les multiplicateurs totaux des buffs actifs pour le combat.
   */
  getCombatModifiers() {
    let atkPercent = 0, hpPercent = 0, speedPercent = 0, dmgReduction = 0, rangeBonus = 0;
    for (const buff of this.activeBuffs) {
      if (buff.effect.atkPercent) atkPercent += buff.effect.atkPercent;
      if (buff.effect.hpPercent) hpPercent += buff.effect.hpPercent;
      if (buff.effect.speedPercent) speedPercent += buff.effect.speedPercent;
      if (buff.effect.dmgReduction) dmgReduction += buff.effect.dmgReduction;
      if (buff.effect.rangeBonus) rangeBonus += buff.effect.rangeBonus;
    }
    return { atkPercent, hpPercent, speedPercent, dmgReduction, rangeBonus };
  }

  endRun(victory) {
    this.active = false;
    const result = {
      victory,
      floorsCleared: this.floor,
      totalFloors: this.totalFloors,
      goldEarned: this.goldEarned + (victory ? BALANCE.dungeon.completionGold : 0),
      buffsUsed: this.activeBuffs.length,
    };
    this.activeBuffs = [];
    return result;
  }
}

export const DungeonSystem = new DungeonSystemImpl();
