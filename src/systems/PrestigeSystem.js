// PrestigeSystem — méta-progression par reset. Gère les fragments d'âme
// gagnés à chaque prestige, le catalogue de bonus permanents, et les
// multiplicateurs qui s'appliquent au gameplay après achat.
//
// Persistance propre (clé localStorage séparée du SaveSystem principal)
// pour survivre aux resets du prestige. Le SaveSystem.clear() ne touche
// pas la clé prestige.

import { BALANCE } from '../data/balance.js';

const PRESTIGE_KEY = 'idle_autobattler_prestige';

// Catalogue de bonus permanents. Chaque bonus a un id unique, un coût
// en fragments, un type (gold_mult, hp_mult, atk_mult, start_grade) et
// une valeur. Les multiplicateurs sont additifs entre eux.
const BONUSES = [
  {
    id: 'gold_25',
    name: '+25% Or',
    desc: 'Tous les gains d\'or augmentent de 25%.',
    cost: 2,
    type: 'gold_mult',
    value: 0.25,
  },
  {
    id: 'gold_50',
    name: '+50% Or',
    desc: 'Tous les gains d\'or augmentent de 50% (cumulable avec +25%).',
    cost: 5,
    type: 'gold_mult',
    value: 0.50,
  },
  {
    id: 'hp_15',
    name: '+15% HP',
    desc: 'Toutes les unités alliées gagnent 15% de points de vie.',
    cost: 3,
    type: 'hp_mult',
    value: 0.15,
  },
  {
    id: 'atk_15',
    name: '+15% ATK',
    desc: 'Toutes les unités alliées gagnent 15% de dégâts.',
    cost: 3,
    type: 'atk_mult',
    value: 0.15,
  },
  {
    id: 'start_grade2',
    name: 'Soldat de départ',
    desc: 'Commencez chaque run avec un guerrier grade 2 au lieu de grade 1.',
    cost: 5,
    type: 'start_grade',
    value: 2,
  },
];

export class PrestigeSystemImpl {
  constructor() {
    this.data = this._load();
  }

  // ---------------------------------------------------------------------------
  // Persistance (clé propre, séparée du SaveSystem principal)
  // ---------------------------------------------------------------------------

  _load() {
    try {
      const raw = localStorage.getItem(PRESTIGE_KEY);
      if (raw) return { ...this._defaults(), ...JSON.parse(raw) };
    } catch (e) {}
    return this._defaults();
  }

  _defaults() {
    return {
      prestigeCount: 0,
      purchasedBonuses: [],
    };
  }

  _save() {
    try {
      localStorage.setItem(PRESTIGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // Fragments
  // ---------------------------------------------------------------------------

  computeFragments(maxWave) {
    const div = BALANCE.prestige.fragment_divisor;
    return Math.max(0, Math.floor(maxWave / div));
  }

  // ---------------------------------------------------------------------------
  // Bonus catalogue
  // ---------------------------------------------------------------------------

  getAllBonuses() {
    return BONUSES;
  }

  getAvailableBonuses() {
    return BONUSES.filter((b) => !this.data.purchasedBonuses.includes(b.id));
  }

  getPurchasedBonuses() {
    return BONUSES.filter((b) => this.data.purchasedBonuses.includes(b.id));
  }

  /**
   * Achète un bonus. Le caller doit vérifier et déduire les fragments
   * depuis ResourceSystem AVANT d'appeler cette méthode.
   * Retourne true si l'achat est accepté.
   */
  buyBonus(bonusId) {
    const bonus = BONUSES.find((b) => b.id === bonusId);
    if (!bonus) return false;
    if (this.data.purchasedBonuses.includes(bonusId)) return false;
    this.data.purchasedBonuses.push(bonusId);
    this._save();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Multipliers (lus par Fighter et CombatSystem)
  // ---------------------------------------------------------------------------

  getGoldMultiplier() {
    return (
      1 +
      this.getPurchasedBonuses()
        .filter((b) => b.type === 'gold_mult')
        .reduce((sum, b) => sum + b.value, 0)
    );
  }

  getHpMultiplier() {
    return (
      1 +
      this.getPurchasedBonuses()
        .filter((b) => b.type === 'hp_mult')
        .reduce((sum, b) => sum + b.value, 0)
    );
  }

  getAtkMultiplier() {
    return (
      1 +
      this.getPurchasedBonuses()
        .filter((b) => b.type === 'atk_mult')
        .reduce((sum, b) => sum + b.value, 0)
    );
  }

  getStartingGrade() {
    const bonus = this.getPurchasedBonuses().find((b) => b.type === 'start_grade');
    return bonus ? bonus.value : 1;
  }

  // ---------------------------------------------------------------------------
  // Prestige — le reset
  // ---------------------------------------------------------------------------

  /**
   * Exécute le prestige. Retourne le nombre de fragments gagnés.
   * Le caller est responsable de :
   *   1. Ajouter les fragments au ResourceSystem
   *   2. Appeler TelemetrySystem.onPrestige()
   *   3. Effacer le SaveSystem principal
   *   4. Reloader la page
   */
  prestige(maxWave) {
    const fragments = this.computeFragments(maxWave);
    this.data.prestigeCount += 1;
    this._save();
    return { fragments, prestigeCount: this.data.prestigeCount };
  }

  get prestigeCount() {
    return this.data.prestigeCount;
  }

  /**
   * Reset complet du prestige (debug / hard reset).
   */
  clearAll() {
    this.data = this._defaults();
    try {
      localStorage.removeItem(PRESTIGE_KEY);
    } catch (e) {}
  }
}

export const PrestigeSystem = new PrestigeSystemImpl();
