// EventSystem — gère les événements temporaires (saisonniers, hebdo, spéciaux).
//
// Au boot, scanne EVENTS_CALENDAR pour trouver les events actifs aujourd'hui.
// Expose des modifiers simples (drop rate ×N, gold ×N) que CombatSystem peut lire.
//
// Scope v1 (minimal) : seuls les modifiers numériques sont implémentés.
// Les modifiers visuels (fog, monster variants, cosmetics) sont pour plus tard.

import { EVENTS_CALENDAR } from '../data/events-calendar.js';

class EventSystemImpl {
  constructor() {
    this._activeEvents = [];
    this._modifiers = {};
    this._initialized = false;
  }

  /**
   * Initialise l'EventSystem. À appeler au boot après login.
   * Scanne le calendrier et active les events dont la date actuelle tombe
   * dans le range [start, end].
   */
  init(now = new Date()) {
    if (this._initialized) return;
    this._initialized = true;

    if (!Array.isArray(EVENTS_CALENDAR) || EVENTS_CALENDAR.length === 0) return;

    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    for (const event of EVENTS_CALENDAR) {
      if (!event.startTrigger || event.startTrigger.type !== 'date_range') continue;

      const [startMonth, startDay] = event.startTrigger.start.split('-').map(Number);
      const [endMonth, endDay] = event.startTrigger.end.split('-').map(Number);

      // Check simple : est-ce que MM-DD actuel tombe entre start et end ?
      // Gère le wrap année (ex: Halloween 10-20 → 11-03)
      const todayNum = month * 100 + day;  // ex: 1020 pour 20 oct
      let startNum = startMonth * 100 + startDay;
      let endNum = endMonth * 100 + endDay;

      let inRange;
      if (startNum <= endNum) {
        // Range normal (pas de wrap)
        inRange = todayNum >= startNum && todayNum <= endNum;
      } else {
        // Range qui wrap l'année (ex: 12-20 → 01-05)
        inRange = todayNum >= startNum || todayNum <= endNum;
      }

      if (inRange) {
        this._activeEvents.push(event);
      }
    }

    // Calcule les modifiers cumulés de tous les events actifs
    this._computeModifiers();
  }

  _computeModifiers() {
    this._modifiers = {
      dropRateItem: 1,    // multiplicateur de drop rate
      goldBonus: 1,       // multiplicateur d'or gagné
      xpBonus: 1,         // multiplicateur d'XP
    };

    for (const event of this._activeEvents) {
      if (!Array.isArray(event.modifiers)) continue;
      for (const mod of event.modifiers) {
        switch (mod.type) {
          case 'drop_rate_item':
            this._modifiers.dropRateItem *= (mod.value || 1);
            break;
          case 'gold_bonus':
          case 'gold_multiplier':
            this._modifiers.goldBonus *= (mod.value || 1);
            break;
          case 'xp_bonus':
          case 'xp_multiplier':
            this._modifiers.xpBonus *= (mod.value || 1);
            break;
          // Les modifiers visuels (fog_visual, monster_variant, special_currency)
          // ne sont pas implémentés dans cette v1 — ils sont silencieusement ignorés.
        }
      }
    }
  }

  // ─── API publique ──────────────────────────────────────────────

  /** Liste des events actifs aujourd'hui. */
  getActiveEvents() { return [...this._activeEvents]; }

  /** Nombre d'events actifs. */
  activeCount() { return this._activeEvents.length; }

  /** Retourne les modifiers cumulés. */
  getModifiers() { return { ...this._modifiers }; }

  /** Raccourci : multiplicateur de drop rate global. */
  getDropRateMult() { return this._modifiers.dropRateItem || 1; }

  /** Raccourci : multiplicateur d'or global. */
  getGoldMult() { return this._modifiers.goldBonus || 1; }

  /** Retourne une string courte résumant les events actifs (pour le Cockpit). */
  getActiveLabel() {
    if (this._activeEvents.length === 0) return '';
    if (this._activeEvents.length === 1) return this._activeEvents[0].name;
    return `${this._activeEvents.length} événements actifs`;
  }

  /** Retourne les icônes/noms des events actifs pour le bandeau Cockpit. */
  getActiveBanners() {
    return this._activeEvents.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      modifiers: e.modifiers?.map(m => m.description).filter(Boolean) || [],
    }));
  }
}

export const EventSystem = new EventSystemImpl();
