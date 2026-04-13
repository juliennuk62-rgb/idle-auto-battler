// DailySystem — gère le login quotidien, le streak de jours consécutifs,
// et les récompenses daily. Cycle de 30 jours, reset si on rate un jour.
// Singleton. Persisté dans localStorage + cloud.

import { ResourceSystem } from './ResourceSystem.js';
import { MissionSystem } from './MissionSystem.js';

const STORAGE_KEY = 'idle_autobattler_daily';

// Grille de récompenses (30 jours). Chaque jour : { gold, gems, label }.
// Les jours spéciaux ont des bonus extra (coffre, invocation, etc.)
const DAILY_REWARDS = [
  { day: 1,  gold: 50,   gems: 0,  label: '50 or' },
  { day: 2,  gold: 100,  gems: 0,  label: '100 or' },
  { day: 3,  gold: 0,    gems: 1,  label: '1 gemme' },
  { day: 4,  gold: 200,  gems: 0,  label: '200 or' },
  { day: 5,  gold: 0,    gems: 2,  label: '2 gemmes' },
  { day: 6,  gold: 300,  gems: 0,  label: '300 or' },
  { day: 7,  gold: 0,    gems: 5,  label: '5 gemmes', special: 'weekly' },
  { day: 8,  gold: 150,  gems: 0,  label: '150 or' },
  { day: 9,  gold: 250,  gems: 0,  label: '250 or' },
  { day: 10, gold: 0,    gems: 2,  label: '2 gemmes' },
  { day: 11, gold: 350,  gems: 0,  label: '350 or' },
  { day: 12, gold: 0,    gems: 3,  label: '3 gemmes' },
  { day: 13, gold: 400,  gems: 0,  label: '400 or' },
  { day: 14, gold: 0,    gems: 10, label: '10 gemmes', special: 'biweekly' },
  { day: 15, gold: 200,  gems: 1,  label: '200 or + 1 gemme' },
  { day: 16, gold: 300,  gems: 1,  label: '300 or + 1 gemme' },
  { day: 17, gold: 0,    gems: 3,  label: '3 gemmes' },
  { day: 18, gold: 500,  gems: 0,  label: '500 or' },
  { day: 19, gold: 0,    gems: 4,  label: '4 gemmes' },
  { day: 20, gold: 400,  gems: 2,  label: '400 or + 2 gemmes' },
  { day: 21, gold: 0,    gems: 15, label: '15 gemmes', special: 'triweekly' },
  { day: 22, gold: 300,  gems: 2,  label: '300 or + 2 gemmes' },
  { day: 23, gold: 500,  gems: 0,  label: '500 or' },
  { day: 24, gold: 0,    gems: 5,  label: '5 gemmes' },
  { day: 25, gold: 600,  gems: 0,  label: '600 or' },
  { day: 26, gold: 0,    gems: 5,  label: '5 gemmes' },
  { day: 27, gold: 700,  gems: 0,  label: '700 or' },
  { day: 28, gold: 0,    gems: 10, label: '1 invocation gratuite', special: 'pull' },
  { day: 29, gold: 800,  gems: 5,  label: '800 or + 5 gemmes' },
  { day: 30, gold: 1000, gems: 20, label: 'SSR garanti !', special: 'ssr' },
];

class DailySystemImpl {
  constructor() {
    this.streak = 0;           // jours consécutifs actuels (0 = premier login)
    this.lastClaimDate = null;  // 'YYYY-MM-DD' du dernier claim
    this.claimedDays = [];      // [1,2,3,...] jours réclamés ce cycle
    this._load();
  }

  /**
   * Vérifie si le joueur peut réclamer sa récompense quotidienne.
   * Retourne { canClaim, reward, dayNumber } ou { canClaim: false }.
   */
  checkLogin() {
    const today = this._todayStr();

    // Déjà réclamé aujourd'hui ?
    if (this.lastClaimDate === today) {
      return { canClaim: false, alreadyClaimed: true };
    }

    // Vérifier la continuité du streak.
    const yesterday = this._dateStr(new Date(Date.now() - 86400000));
    if (this.lastClaimDate && this.lastClaimDate !== yesterday) {
      // Streak cassé → reset le cycle.
      this.streak = 0;
      this.claimedDays = [];
    }

    // Jour à réclamer (1-indexé, cycle de 30).
    const dayNumber = (this.streak % 30) + 1;
    const reward = DAILY_REWARDS[dayNumber - 1];

    return { canClaim: true, reward, dayNumber, streak: this.streak };
  }

  /**
   * Réclame la récompense du jour. Retourne le reward appliqué.
   */
  claim() {
    const check = this.checkLogin();
    if (!check.canClaim) return null;

    const { reward, dayNumber } = check;

    // Distribue les récompenses.
    if (reward.gold > 0) ResourceSystem.addGold(reward.gold);
    if (reward.gems > 0) ResourceSystem.addGems(reward.gems);

    // Met à jour le streak.
    this.streak++;
    this.lastClaimDate = this._todayStr();
    this.claimedDays.push(dayNumber);

    // Mission tracking : connexion du jour.
    try { MissionSystem.track('login_days', 1); } catch (e) {}

    this._save();
    return { ...reward, dayNumber, newStreak: this.streak };
  }

  /**
   * Retourne la grille complète pour l'affichage du calendrier.
   */
  getCalendar() {
    return DAILY_REWARDS.map(r => ({
      ...r,
      claimed: this.claimedDays.includes(r.day),
      current: r.day === (this.streak % 30) + 1 && this.lastClaimDate !== this._todayStr(),
    }));
  }

  getStreak() { return this.streak; }

  // ─── Helpers date ──────────────────────────────────────────────────────

  _todayStr() {
    return this._dateStr(new Date());
  }

  _dateStr(date) {
    return date.toISOString().split('T')[0];
  }

  // ─── Persistence ──────────────────────────────────────────────────────

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        streak: this.streak,
        lastClaimDate: this.lastClaimDate,
        claimedDays: this.claimedDays,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.streak = data.streak || 0;
        this.lastClaimDate = data.lastClaimDate || null;
        this.claimedDays = data.claimedDays || [];
      }
    } catch (e) {}
  }

  serialize() {
    return {
      streak: this.streak,
      lastClaimDate: this.lastClaimDate,
      claimedDays: this.claimedDays,
    };
  }

  restore(data) {
    if (!data) return;
    this.streak = data.streak || 0;
    this.lastClaimDate = data.lastClaimDate || null;
    this.claimedDays = data.claimedDays || [];
    this._save();
  }
}

export const DailySystem = new DailySystemImpl();
