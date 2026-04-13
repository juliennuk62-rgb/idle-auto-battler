// MissionSystem — gère les missions quotidiennes et hebdomadaires.
// Génère des missions random depuis les templates, track la progression
// via des hooks dans CombatSystem/ItemSystem, et distribue les récompenses.
// Singleton. Persisté dans localStorage + cloud.

import { DAILY_TEMPLATES, WEEKLY_TEMPLATES, DAILY_BONUS, WEEKLY_BONUS, DAILY_COUNT, WEEKLY_COUNT } from '../data/missions.js';
import { ResourceSystem } from './ResourceSystem.js';

const STORAGE_KEY = 'idle_autobattler_missions';

class MissionSystemImpl {
  constructor() {
    this.dailies = [];       // missions quotidiennes actives
    this.weeklies = [];      // missions hebdomadaires actives
    this.dailyBonusClaimed = false;
    this.weeklyBonusClaimed = false;
    this.lastDailyReset = null;   // 'YYYY-MM-DD'
    this.lastWeeklyReset = null;  // 'YYYY-MM-DD' (lundi)

    // Listeners pour les notifications de complétion.
    // Chaque listener reçoit { mission } quand une mission passe à 100%.
    this._listeners = [];

    this._load();
    this._checkResets();
  }

  /**
   * Abonne un callback qui sera appelé quand une mission est complétée.
   * @param {(mission) => void} fn
   * @returns {() => void} unsubscribe function
   */
  onMissionComplete(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _notifyComplete(mission) {
    for (const fn of this._listeners) {
      try { fn(mission); } catch (e) { console.error('[MissionSystem] listener error:', e); }
    }
  }

  // ─── Reset logic ──────────────────────────────────────────────────────

  _checkResets() {
    const today = this._todayStr();
    const monday = this._mondayStr();

    // Daily reset : si le jour a changé, génère de nouvelles quotidiennes.
    if (this.lastDailyReset !== today) {
      this._generateDailies();
      this.lastDailyReset = today;
      this.dailyBonusClaimed = false;
      this._save();
    }

    // Weekly reset : si le lundi a changé.
    if (this.lastWeeklyReset !== monday) {
      this._generateWeeklies();
      this.lastWeeklyReset = monday;
      this.weeklyBonusClaimed = false;
      this._save();
    }
  }

  _generateDailies() {
    // Pioche DAILY_COUNT templates différents.
    const shuffled = [...DAILY_TEMPLATES].sort(() => Math.random() - 0.5);
    this.dailies = shuffled.slice(0, DAILY_COUNT).map(t => ({
      id: t.id,
      label: t.label.replace('{t}', String(t.target)),
      tracker: t.tracker,
      target: t.target,
      progress: 0,
      reward: { ...t.reward },
      claimed: false,
      type: 'daily',
    }));
  }

  _generateWeeklies() {
    const shuffled = [...WEEKLY_TEMPLATES].sort(() => Math.random() - 0.5);
    this.weeklies = shuffled.slice(0, WEEKLY_COUNT).map(t => ({
      id: t.id,
      label: t.label.replace('{t}', String(t.target)),
      tracker: t.tracker,
      target: t.target,
      progress: 0,
      reward: { ...t.reward },
      claimed: false,
      type: 'weekly',
    }));
  }

  // ─── Tracking ─────────────────────────────────────────────────────────

  /**
   * Incrémente la progression de toutes les missions qui trackent ce type.
   * Appelé par les hooks dans CombatSystem, ItemSystem, etc.
   * @param {string} tracker — ex: 'kills', 'boss_kills', 'forges'
   * @param {number} amount — combien ajouter (défaut 1)
   */
  track(tracker, amount = 1) {
    let changed = false;
    for (const m of [...this.dailies, ...this.weeklies]) {
      if (m.tracker === tracker && !m.claimed) {
        const wasDone = m.progress >= m.target;
        m.progress = Math.min(m.target, m.progress + amount);
        changed = true;
        // Notifie si la mission vient JUSTE de passer à 100%.
        if (!wasDone && m.progress >= m.target) {
          this._notifyComplete(m);
        }
      }
    }
    if (changed) this._save();
  }

  /**
   * Tracking spécial pour les valeurs "max" (max_wave, etc.) —
   * on prend le max au lieu d'additionner.
   */
  trackMax(tracker, value) {
    let changed = false;
    for (const m of [...this.dailies, ...this.weeklies]) {
      if (m.tracker === tracker && !m.claimed) {
        if (value > m.progress) {
          const wasDone = m.progress >= m.target;
          m.progress = Math.min(m.target, value);
          changed = true;
          if (!wasDone && m.progress >= m.target) {
            this._notifyComplete(m);
          }
        }
      }
    }
    if (changed) this._save();
  }

  // ─── Claim ────────────────────────────────────────────────────────────

  /**
   * Réclame la récompense d'une mission complétée.
   * @returns {{ gold, gems } | null}
   */
  claimMission(missionId) {
    const mission = [...this.dailies, ...this.weeklies].find(m => m.id === missionId);
    if (!mission || mission.claimed || mission.progress < mission.target) return null;

    mission.claimed = true;

    // Distribue les récompenses.
    if (mission.reward.gold) ResourceSystem.addGold(mission.reward.gold);
    if (mission.reward.gems) ResourceSystem.addGems(mission.reward.gems);

    this._save();
    return { ...mission.reward };
  }

  /**
   * Vérifie et claim le bonus quotidien (3/3 missions = +3 gemmes).
   */
  claimDailyBonus() {
    if (this.dailyBonusClaimed) return null;
    const allDone = this.dailies.every(m => m.claimed);
    if (!allDone) return null;

    this.dailyBonusClaimed = true;
    ResourceSystem.addGems(DAILY_BONUS.gems);
    this._save();
    return DAILY_BONUS;
  }

  /**
   * Vérifie et claim le bonus hebdomadaire (5/5 = +10 gemmes).
   */
  claimWeeklyBonus() {
    if (this.weeklyBonusClaimed) return null;
    const allDone = this.weeklies.every(m => m.claimed);
    if (!allDone) return null;

    this.weeklyBonusClaimed = true;
    ResourceSystem.addGems(WEEKLY_BONUS.gems);
    this._save();
    return WEEKLY_BONUS;
  }

  // ─── Getters ──────────────────────────────────────────────────────────

  getDailies() { return [...this.dailies]; }
  getWeeklies() { return [...this.weeklies]; }

  getDailyProgress() {
    const done = this.dailies.filter(m => m.claimed).length;
    return { done, total: this.dailies.length, bonusClaimed: this.dailyBonusClaimed };
  }

  getWeeklyProgress() {
    const done = this.weeklies.filter(m => m.claimed).length;
    return { done, total: this.weeklies.length, bonusClaimed: this.weeklyBonusClaimed };
  }

  /** Nombre total de missions claimables (non réclamées mais complétées). */
  getClaimableCount() {
    return [...this.dailies, ...this.weeklies].filter(
      m => !m.claimed && m.progress >= m.target
    ).length;
  }

  // ─── Helpers date ─────────────────────────────────────────────────────

  _todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  _mondayStr() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  // ─── Persistence ──────────────────────────────────────────────────────

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dailies: this.dailies,
        weeklies: this.weeklies,
        dailyBonusClaimed: this.dailyBonusClaimed,
        weeklyBonusClaimed: this.weeklyBonusClaimed,
        lastDailyReset: this.lastDailyReset,
        lastWeeklyReset: this.lastWeeklyReset,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.dailies = d.dailies || [];
        this.weeklies = d.weeklies || [];
        this.dailyBonusClaimed = d.dailyBonusClaimed || false;
        this.weeklyBonusClaimed = d.weeklyBonusClaimed || false;
        this.lastDailyReset = d.lastDailyReset || null;
        this.lastWeeklyReset = d.lastWeeklyReset || null;
      }
    } catch (e) {}
  }

  serialize() {
    return {
      dailies: this.dailies,
      weeklies: this.weeklies,
      dailyBonusClaimed: this.dailyBonusClaimed,
      weeklyBonusClaimed: this.weeklyBonusClaimed,
      lastDailyReset: this.lastDailyReset,
      lastWeeklyReset: this.lastWeeklyReset,
    };
  }

  restore(data) {
    if (!data) return;
    this.dailies = data.dailies || [];
    this.weeklies = data.weeklies || [];
    this.dailyBonusClaimed = data.dailyBonusClaimed || false;
    this.weeklyBonusClaimed = data.weeklyBonusClaimed || false;
    this.lastDailyReset = data.lastDailyReset || null;
    this.lastWeeklyReset = data.lastWeeklyReset || null;
    this._checkResets();
    this._save();
  }
}

export const MissionSystem = new MissionSystemImpl();
