// TalentSystem — gère les points de talent par fighter, l'allocation et les bonus.
// Les allocations sont stockées par fighter ID : { fighterId: [talentId, ...] }
// Persisté dans localStorage (et sync cloud).

import { TALENT_TREES, tierCost } from '../data/talents.js';

const STORAGE_KEY = 'idle_autobattler_talents';

export class TalentSystemImpl {
  constructor() {
    this.allocations = {}; // { fighterId: ['w_tank_1', 'w_tank_2', ...] }
    this._load();
  }

  // ─── Points ─────────────────────────────────────────────────────────

  /**
   * Points de talent total pour un fighter (= level - 1, car L1 = 0 points).
   */
  totalPoints(fighter) {
    return Math.max(0, (fighter.level || 1) - 1);
  }

  /**
   * Points déjà dépensés par un fighter.
   */
  spentPoints(fighterId) {
    const alloc = this.allocations[fighterId] || [];
    let spent = 0;
    for (const talentId of alloc) {
      const info = this._findTalent(talentId);
      if (info) spent += tierCost(info.tierIndex + 1);
    }
    return spent;
  }

  /**
   * Points disponibles pour un fighter.
   */
  availablePoints(fighter) {
    return this.totalPoints(fighter) - this.spentPoints(fighter.id);
  }

  // ─── Allocation ─────────────────────────────────────────────────────

  /**
   * Vérifie si un talent est achetable par un fighter.
   */
  canBuy(fighter, talentId) {
    const info = this._findTalent(talentId);
    if (!info) return false;
    if (info.tree !== fighter.class) return false;

    const alloc = this.allocations[fighter.id] || [];
    if (alloc.includes(talentId)) return false; // déjà acheté

    // Vérifie le prérequis (tier précédent de la même branche).
    if (info.tierIndex > 0) {
      const prevTalent = info.branch.tiers[info.tierIndex - 1];
      if (!alloc.includes(prevTalent.id)) return false;
    }

    // Vérifie les points disponibles.
    const cost = tierCost(info.tierIndex + 1);
    if (this.availablePoints(fighter) < cost) return false;

    return true;
  }

  /**
   * Achète un talent. Retourne true si succès.
   */
  buy(fighter, talentId) {
    if (!this.canBuy(fighter, talentId)) return false;
    if (!this.allocations[fighter.id]) this.allocations[fighter.id] = [];
    this.allocations[fighter.id].push(talentId);
    this._save();
    return true;
  }

  /**
   * Réinitialise les talents d'un fighter. Retourne true si réussi.
   */
  reset(fighterId) {
    this.allocations[fighterId] = [];
    this._save();
    return true;
  }

  /**
   * Vérifie si un talent est acheté par un fighter.
   */
  hasTalent(fighterId, talentId) {
    return (this.allocations[fighterId] || []).includes(talentId);
  }

  /**
   * Retourne les talents achetés par un fighter.
   */
  getAllocated(fighterId) {
    return [...(this.allocations[fighterId] || [])];
  }

  // ─── Calcul des modificateurs combinés ──────────────────────────────

  /**
   * Retourne un objet avec tous les bonus cumulés d'un fighter.
   * Utilisé par Fighter._recomputeStats().
   */
  getModifiers(fighterId, className) {
    const alloc = this.allocations[fighterId] || [];
    const tree = TALENT_TREES[className];
    if (!tree) return {};

    const mods = {};
    for (const talentId of alloc) {
      for (const branch of tree.branches) {
        for (const tier of branch.tiers) {
          if (tier.id === talentId && tier.effect) {
            for (const [key, value] of Object.entries(tier.effect)) {
              if (typeof value === 'number') {
                mods[key] = (mods[key] || 0) + value;
              } else {
                mods[key] = value; // boolean flags
              }
            }
          }
        }
      }
    }
    return mods;
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  _findTalent(talentId) {
    for (const [className, tree] of Object.entries(TALENT_TREES)) {
      for (const branch of tree.branches) {
        for (let i = 0; i < branch.tiers.length; i++) {
          if (branch.tiers[i].id === talentId) {
            return { tree: className, branch, tierIndex: i, tier: branch.tiers[i] };
          }
        }
      }
    }
    return null;
  }

  // ─── Persistance ────────────────────────────────────────────────────

  _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allocations)); } catch(e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.allocations = JSON.parse(raw);
    } catch(e) { this.allocations = {}; }
  }

  serialize() { return { ...this.allocations }; }
  restore(data) { if (data) this.allocations = data; this._save(); }
}

export const TalentSystem = new TalentSystemImpl();
