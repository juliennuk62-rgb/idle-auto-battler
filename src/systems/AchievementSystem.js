// AchievementSystem — 20 achievements avec tracking automatique.
// Chaque achievement a un prédicat vérifié à chaque tick.
// Récompenses : or, gemmes, fragments.

import { ResourceSystem } from './ResourceSystem.js';

const STORAGE_KEY = 'idle_autobattler_achievements';

const ACHIEVEMENTS = [
  // ── Débutant ──
  { id: 'first_blood',    name: 'Premier Sang',       desc: 'Tuez votre premier monstre',          icon: '🗡', tracker: 'kills',        target: 1,      reward: { gold: 50 },     tier: 'bronze' },
  { id: 'wave_5',         name: 'Échauffement',       desc: 'Atteignez la vague 5',                icon: '🌊', tracker: 'max_wave',     target: 5,      reward: { gold: 100 },    tier: 'bronze' },
  { id: 'first_equip',    name: 'Bien Équipé',        desc: 'Équipez votre premier item',          icon: '🎒', tracker: 'items_equipped', target: 1,    reward: { gold: 100 },    tier: 'bronze' },
  { id: 'first_hero',     name: 'Invocateur',         desc: 'Invoquez votre premier héros',        icon: '✨', tracker: 'heroes_owned', target: 1,      reward: { gems: 2 },      tier: 'bronze' },
  { id: 'first_boss',     name: 'Tueur de Boss',      desc: 'Vainquez votre premier boss',         icon: '💀', tracker: 'boss_kills',   target: 1,      reward: { gems: 3 },      tier: 'bronze' },

  // ── Intermédiaire ──
  { id: 'wave_20',        name: 'Aventurier',         desc: 'Atteignez la vague 20',               icon: '⚔', tracker: 'max_wave',     target: 20,     reward: { gems: 5 },      tier: 'silver' },
  { id: 'kills_500',      name: 'Chasseur',           desc: 'Tuez 500 monstres',                   icon: '🏹', tracker: 'kills',        target: 500,    reward: { gold: 500 },    tier: 'silver' },
  { id: 'gold_10k',       name: 'Riche',              desc: 'Accumulez 10 000 or (total)',          icon: '💰', tracker: 'total_gold',   target: 10000,  reward: { gems: 5 },      tier: 'silver' },
  { id: 'heroes_5',       name: 'Collectionneur',     desc: 'Possédez 5 héros',                    icon: '👥', tracker: 'heroes_owned', target: 5,      reward: { gems: 5 },      tier: 'silver' },
  { id: 'dungeon_clear',  name: 'Explorateur',        desc: 'Complétez un donjon',                 icon: '🏰', tracker: 'dungeon_clears', target: 1,   reward: { gems: 10 },     tier: 'silver' },

  // ── Avancé ──
  { id: 'wave_50',        name: 'Vétéran',            desc: 'Atteignez la vague 50',               icon: '🌟', tracker: 'max_wave',     target: 50,     reward: { gems: 10 },     tier: 'gold' },
  { id: 'kills_5000',     name: 'Exterminateur',      desc: 'Tuez 5 000 monstres',                 icon: '💥', tracker: 'kills',        target: 5000,   reward: { gems: 10 },     tier: 'gold' },
  { id: 'boss_20',        name: 'Fléau des Boss',     desc: 'Vainquez 20 boss',                    icon: '👑', tracker: 'boss_kills',   target: 20,     reward: { gems: 15 },     tier: 'gold' },
  { id: 'full_set',       name: 'Set Complet',        desc: 'Équipez un set de 3 pièces',          icon: '🛡', tracker: 'full_sets',    target: 1,      reward: { gems: 10 },     tier: 'gold' },
  { id: 'heroes_10',      name: 'Maître Invocateur',  desc: 'Possédez 10 héros',                   icon: '🌠', tracker: 'heroes_owned', target: 10,     reward: { gems: 15 },     tier: 'gold' },

  // ── Légendaire ──
  { id: 'wave_100',       name: 'Légende',            desc: 'Atteignez la vague 100',              icon: '🏆', tracker: 'max_wave',     target: 100,    reward: { gems: 25 },     tier: 'legendary' },
  { id: 'kills_50k',      name: 'Génocidaire',        desc: 'Tuez 50 000 monstres',                icon: '☠',  tracker: 'kills',        target: 50000,  reward: { gems: 25 },     tier: 'legendary' },
  { id: 'heroes_20',      name: 'Ultime Collectionneur', desc: 'Possédez les 20 héros',            icon: '👑', tracker: 'heroes_owned', target: 20,     reward: { gems: 50 },     tier: 'legendary' },
  { id: 'prestige_3',     name: 'Renaissant',         desc: 'Effectuez 3 prestiges',               icon: '♻',  tracker: 'prestiges',    target: 3,      reward: { gems: 20 },     tier: 'legendary' },
  { id: 'infinite_200',   name: 'Sans Limite',        desc: 'Atteignez la vague 200 en mode infini', icon: '∞', tracker: 'infinite_wave', target: 200,  reward: { gems: 50 },     tier: 'legendary' },
];

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#fbbf24',
  legendary: '#f97316',
};

class AchievementSystemImpl {
  constructor() {
    this.unlocked = {}; // { achievementId: true }
    this.trackers = {}; // { trackerName: currentValue }
    this._listeners = [];
    this._load();
  }

  /**
   * Met à jour un tracker et vérifie les achievements associés.
   * @param {string} tracker — nom du tracker (kills, max_wave, etc.)
   * @param {number} value — valeur à SET (pas à ajouter)
   */
  update(tracker, value) {
    this.trackers[tracker] = Math.max(this.trackers[tracker] || 0, value);
    this._checkUnlocks();
    this._save();
  }

  /** Incrémente un tracker. */
  increment(tracker, amount = 1) {
    this.trackers[tracker] = (this.trackers[tracker] || 0) + amount;
    this._checkUnlocks();
    this._save();
  }

  _checkUnlocks() {
    for (const ach of ACHIEVEMENTS) {
      if (this.unlocked[ach.id]) continue;
      const current = this.trackers[ach.tracker] || 0;
      if (current >= ach.target) {
        this.unlocked[ach.id] = true;
        // Distribue la récompense
        if (ach.reward.gold) ResourceSystem.addGold(ach.reward.gold);
        if (ach.reward.gems) ResourceSystem.addGems(ach.reward.gems);
        // Notifie les listeners (toast)
        for (const fn of this._listeners) {
          try { fn(ach); } catch (e) {}
        }
      }
    }
  }

  onUnlock(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  /** Retourne tous les achievements avec leur état. */
  getAll() {
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: !!this.unlocked[ach.id],
      progress: Math.min(this.trackers[ach.tracker] || 0, ach.target),
      tierColor: TIER_COLORS[ach.tier],
    }));
  }

  getUnlockedCount() {
    return Object.keys(this.unlocked).length;
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlocked: this.unlocked,
        trackers: this.trackers,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.unlocked = d.unlocked || {};
        this.trackers = d.trackers || {};
      }
    } catch (e) {}
  }

  serialize() {
    return { unlocked: this.unlocked, trackers: this.trackers };
  }

  restore(data) {
    if (!data) return;
    this.unlocked = data.unlocked || {};
    this.trackers = data.trackers || {};
    this._save();
  }
}

export const AchievementSystem = new AchievementSystemImpl();
