// LeaderboardSystem — classement hebdomadaire multi-catégories.
//
// 6 catégories, reset automatique chaque lundi (ISO week), persistance mixte
// localStorage + Firestore. Scores locaux mis à jour en live, push batché vers
// Firestore toutes les 60s et sur pagehide.
//
// Firestore path : leaderboards/{weekId}/{category}/{userId}
// Les anciennes semaines ne sont jamais supprimées (archive naturelle).

import { AuthSystem } from './AuthSystem.js';

const STORAGE_KEY = 'idle_autobattler_leaderboard';
const FLUSH_INTERVAL_MS = 60_000;

// Les 6 catégories supportées, ordonnées pour l'affichage.
export const LB_CATEGORIES = [
  { id: 'kills',       label: 'Tueur en série',      icon: '🗡',  desc: 'Ennemis vaincus cette semaine' },
  { id: 'boss_kills',  label: 'Chasseur de boss',    icon: '👹', desc: 'Boss terrassés cette semaine' },
  { id: 'total_gold',  label: 'Magnat',              icon: '💰', desc: 'Or amassé cette semaine' },
  { id: 'max_wave',    label: 'Conquérant',          icon: '🌊', desc: 'Vague maximale atteinte' },
  { id: 'max_damage',  label: 'Frappe dévastatrice', icon: '⚡', desc: 'Plus gros coup en single hit' },
  { id: 'deaths',      label: 'Sacrifices consentis', icon: '💀', desc: 'Alliés tombés au combat' },
];

class LeaderboardSystemImpl {
  constructor() {
    this._weekId = null;              // semaine courante, ex. "2026-W16"
    this._scores = this._emptyScores();
    this._dirty = false;              // vrai si un push est nécessaire
    this._previousArchive = null;     // podium de la semaine écoulée (si reset)
    this._flushTimer = null;
    this._initialized = false;
  }

  _emptyScores() {
    const s = {};
    for (const cat of LB_CATEGORIES) s[cat.id] = 0;
    return s;
  }

  /**
   * ISO 8601 week number — "YYYY-Www" (ex. "2026-W16").
   * Utilise la date locale.
   */
  getCurrentWeekId(now = new Date()) {
    // Copie (pour ne pas muter)
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    // Jeudi de la semaine courante (ISO : jeudi détermine l'année ISO)
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * À appeler au boot après login. Compare le weekId stocké au courant :
   * si changement → archive l'ancienne semaine + reset local. Démarre le timer
   * de flush périodique.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const currentWeek = this.getCurrentWeekId();
    let stored = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      console.warn('[Leaderboard] localStorage illisible, reset', e);
    }

    if (stored && stored.weekId === currentWeek) {
      // Même semaine — on reprend nos scores
      this._weekId = currentWeek;
      this._scores = { ...this._emptyScores(), ...stored.scores };
    } else {
      // Nouvelle semaine (ou premier init)
      if (stored && stored.weekId) {
        // Archive la semaine écoulée pour affichage du podium
        this._previousArchive = { weekId: stored.weekId, scores: stored.scores };
      }
      this._weekId = currentWeek;
      this._scores = this._emptyScores();
      this._persistLocal();
    }

    // Flush périodique
    this._flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    // Flush sur fermeture onglet
    window.addEventListener('pagehide', () => this.flush());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  // ─── API d'enregistrement ──────────────────────────────────────────────

  recordKill()             { this._increment('kills', 1); }
  recordBossKill()         { this._increment('boss_kills', 1); }
  recordGold(amount)       { this._increment('total_gold', Math.max(0, amount|0)); }
  recordWave(wave)         { this._setMax('max_wave', wave|0); }
  recordDamage(damage)     { this._setMax('max_damage', Math.round(damage)); }
  recordAllyDeath()        { this._increment('deaths', 1); }

  _increment(cat, amount) {
    if (!this._initialized) return;
    this._scores[cat] = (this._scores[cat] || 0) + amount;
    this._dirty = true;
    this._persistLocal();
  }

  _setMax(cat, value) {
    if (!this._initialized) return;
    if (value > (this._scores[cat] || 0)) {
      this._scores[cat] = value;
      this._dirty = true;
      this._persistLocal();
    }
  }

  _persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        weekId: this._weekId,
        scores: this._scores,
      }));
    } catch (e) {
      // Ignore (quota, private mode, etc.)
    }
  }

  // ─── Sync Firestore ─────────────────────────────────────────────────────

  /**
   * Push les scores actuels vers Firestore si dirty. Utilise un batch pour
   * minimiser les round-trips.
   */
  async flush() {
    if (!this._dirty || !this._initialized) return;
    if (!AuthSystem.db || !AuthSystem.user) return;

    const user = AuthSystem.user;
    const batch = AuthSystem.db.batch();
    const root = AuthSystem.db.collection('leaderboards').doc(this._weekId);

    for (const cat of LB_CATEGORIES) {
      const score = this._scores[cat.id] || 0;
      if (score <= 0) continue;
      const ref = root.collection(cat.id).doc(user.uid);
      batch.set(ref, {
        score,
        displayName: user.displayName || 'Anonyme',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      this._dirty = false;
    } catch (e) {
      console.warn('[Leaderboard] flush failed (rules manquantes ?)', e);
    }
  }

  /**
   * Lit le top N d'une catégorie pour la semaine courante.
   * Tri côté client (simple, ~10 entrées max).
   */
  async fetchTop(categoryId, n = 10) {
    if (!AuthSystem.db) return [];
    try {
      const snap = await AuthSystem.db
        .collection('leaderboards').doc(this._weekId)
        .collection(categoryId).get();
      const rows = snap.docs.map((d) => ({ userId: d.id, ...d.data() }));
      rows.sort((a, b) => (b.score || 0) - (a.score || 0));
      return rows.slice(0, n);
    } catch (e) {
      console.warn('[Leaderboard] fetch failed', e);
      return [];
    }
  }

  /**
   * Rang du joueur courant dans une catégorie (1-based). Renvoie null si hors-ligne.
   */
  async fetchMyRank(categoryId) {
    if (!AuthSystem.db || !AuthSystem.user) return null;
    try {
      const snap = await AuthSystem.db
        .collection('leaderboards').doc(this._weekId)
        .collection(categoryId).get();
      const rows = snap.docs.map((d) => ({ userId: d.id, ...d.data() }));
      rows.sort((a, b) => (b.score || 0) - (a.score || 0));
      const idx = rows.findIndex(r => r.userId === AuthSystem.user.uid);
      return idx >= 0 ? { rank: idx + 1, total: rows.length } : null;
    } catch (e) {
      return null;
    }
  }

  // ─── Semaine précédente (archive locale) ───────────────────────────────

  getPreviousArchive() { return this._previousArchive; }
  consumeArchive() { const a = this._previousArchive; this._previousArchive = null; return a; }

  // ─── Getters ────────────────────────────────────────────────────────────

  getLocalScore(catId) { return this._scores[catId] || 0; }
  getWeekId() { return this._weekId; }
  getAllScores() { return { ...this._scores }; }
}

export const LeaderboardSystem = new LeaderboardSystemImpl();
