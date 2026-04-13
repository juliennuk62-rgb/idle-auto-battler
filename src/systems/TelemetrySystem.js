// Système de télémétrie de combat.
//
// Design goals :
//   - Zéro dépendance à Phaser (pur JS → testable en isolation, réutilisable analytics).
//   - Non-intrusif : quand CONFIG.telemetry_enabled === false, toutes les méthodes
//     sont des no-op immédiats (early return).
//   - Buffer circulaire mémoire pour le log brut (taille définie dans config).
//   - Agrégats cumulés persistés dans localStorage à chaque fin de combat.
//
// Architecture :
//   - `TelemetrySystemImpl` : la classe (exportée pour tests isolés).
//   - `TelemetrySystem`     : instance singleton partagée par tout le jeu.
//
// Voir docs/TELEMETRY.md pour la liste exhaustive des événements, le schéma
// des agrégats et la procédure "ajouter un nouvel événement en 3 étapes".

import { CONFIG } from '../data/config.js';

function safeNow() {
  // Date.now() est suffisant pour notre granularité (ms). Découplé dans une
  // fonction pour pouvoir être monkey-patchée dans les tests si besoin.
  return Date.now();
}

function emptyAggregates() {
  return {
    combatsPlayed: 0,
    totalDuration: 0,        // ms cumulés passés en combat
    totalGold: 0,            // or total gagné (stub : toujours 0 à l'étape 2)
    maxWave: 0,              // plus haute vague atteinte
    damageDealtByClass: {},  // { warrior: 1234, monster: 567, ... }
    damageTakenByClass: {},
    durationByWave: {},      // { 1: { total: 15000, count: 5 }, ... }
    unitStats: {},           // { unitId: { damageDealt, damageTaken, deaths, survivals, combats } }
    combatResults: [],       // historique compact (pour fenêtre glissante survie)
  };
}

export class TelemetrySystemImpl {
  constructor(options = {}) {
    this.enabled = options.enabled ?? CONFIG.telemetry_enabled;
    this.bufferSize = options.bufferSize ?? CONFIG.telemetry_buffer_size;
    this.storageKey = options.storageKey ?? CONFIG.telemetry_storage_key;

    // État courant : null tant qu'aucun combat n'est actif.
    this.currentCombat = null;

    // Buffer circulaire mémoire — purement transitoire.
    this.buffer = [];

    // Agrégats cumulés — persistés dans localStorage.
    this.aggregates = this._loadAggregates();

    // Listeners externes (UI) qui veulent voir chaque event en live.
    // Distinct du stockage interne — sert l'EventLog, les achievements, etc.
    this._broadcastListeners = [];
  }

  /**
   * S'abonne aux events émis en live. Le callback reçoit l'event complet
   * (type, t, ...payload) à chaque `recordEvent` réussi. Retourne une
   * fonction de désabonnement.
   */
  onBroadcast(callback) {
    if (typeof callback !== 'function') return () => {};
    this._broadcastListeners.push(callback);
    return () => {
      this._broadcastListeners = this._broadcastListeners.filter((cb) => cb !== callback);
    };
  }

  // ---------------------------------------------------------------------------
  // Persistance
  // ---------------------------------------------------------------------------

  _loadAggregates() {
    if (!this.enabled) return emptyAggregates();
    try {
      if (typeof localStorage === 'undefined') return emptyAggregates();
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return emptyAggregates();
      const parsed = JSON.parse(raw);
      // Merge avec la structure vide pour survivre aux ajouts de champs futurs.
      return { ...emptyAggregates(), ...parsed };
    } catch (e) {
      return emptyAggregates();
    }
  }

  _saveAggregates() {
    if (!this.enabled) return;
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify(this.aggregates));
    } catch (e) {
      // Silencieux : le jeu ne doit jamais crasher à cause de la télémétrie.
    }
  }

  // ---------------------------------------------------------------------------
  // API publique — collecte
  // ---------------------------------------------------------------------------

  /**
   * Enregistre un événement dans le combat courant. No-op si désactivé ou
   * si aucun combat n'est en cours.
   */
  recordEvent(type, payload = {}) {
    if (!this.enabled) return;
    if (!this.currentCombat) return;
    const event = {
      type,
      t: safeNow() - this.currentCombat.startedAt,
      ...payload,
    };
    this.currentCombat.events.push(event);

    // Diffuse aux listeners externes. Un listener défaillant ne casse
    // ni les autres ni la collecte télémétrique.
    for (const cb of this._broadcastListeners) {
      try {
        cb(event);
      } catch (e) {
        // silencieux
      }
    }
  }

  /**
   * Démarre un nouveau combat. Les appels ultérieurs à recordEvent seront
   * rattachés à celui-ci jusqu'au prochain endCombat.
   *
   * @param {number} waveId - Id de la vague (1+).
   * @param {Array}  team   - Fighters alliés (objets avec { id, class, grade, level }).
   * @param {Array}  monsters - Fighters ennemis.
   */
  startCombat(waveId, team, monsters) {
    if (!this.enabled) return;
    const now = safeNow();
    this.currentCombat = {
      waveId,
      startedAt: now,
      startedAtEpoch: now,
      team: team.map((u) => ({ id: u.id, class: u.class, grade: u.grade ?? 1, level: u.level ?? 1 })),
      monsters: monsters.map((m) => ({ id: m.id, class: m.class, grade: m.grade ?? 1, level: m.level ?? 1 })),
      events: [],
    };
    // Premier event = snapshot de la composition.
    this.recordEvent('combat_started', {
      waveId,
      team: this.currentCombat.team,
      monsters: this.currentCombat.monsters,
    });
  }

  /**
   * Termine le combat courant. Pousse le log dans le buffer circulaire,
   * met à jour les agrégats, persiste dans localStorage.
   *
   * @param {Object} result - { outcome: 'victory' | 'defeat', gold?, xp? }
   */
  endCombat(result) {
    if (!this.enabled) return;
    if (!this.currentCombat) return;

    const duration = safeNow() - this.currentCombat.startedAt;
    this.recordEvent('wave_ended', {
      result: result.outcome,
      duration,
      gold: result.gold ?? 0,
      xp: result.xp ?? 0,
    });

    // Push dans le buffer circulaire.
    this.buffer.push({
      waveId: this.currentCombat.waveId,
      startedAt: this.currentCombat.startedAtEpoch,
      duration,
      result: result.outcome,
      team: this.currentCombat.team,
      monsters: this.currentCombat.monsters,
      events: this.currentCombat.events,
    });
    while (this.buffer.length > this.bufferSize) this.buffer.shift();

    // Agrégation puis persistance.
    this._updateAggregates(this.currentCombat, duration, result);
    this._saveAggregates();

    this.currentCombat = null;
  }

  // ---------------------------------------------------------------------------
  // Agrégation
  // ---------------------------------------------------------------------------

  _updateAggregates(combat, duration, result) {
    const agg = this.aggregates;
    agg.combatsPlayed += 1;
    agg.totalDuration += duration;
    agg.totalGold += result.gold ?? 0;
    if (combat.waveId > agg.maxWave) agg.maxWave = combat.waveId;

    // Durée moyenne par vague.
    if (!agg.durationByWave[combat.waveId]) {
      agg.durationByWave[combat.waveId] = { total: 0, count: 0 };
    }
    agg.durationByWave[combat.waveId].total += duration;
    agg.durationByWave[combat.waveId].count += 1;

    // Parcours des events pour extraire dégâts et morts.
    const dmgDealt = {};   // unitId -> damage infligé ce combat
    const dmgTaken = {};   // unitId -> damage subi ce combat
    const deathsIn = new Set();

    for (const e of combat.events) {
      if (e.type === 'attack_performed') {
        dmgDealt[e.attackerId] = (dmgDealt[e.attackerId] || 0) + (e.damage || 0);
        dmgTaken[e.targetId]   = (dmgTaken[e.targetId]   || 0) + (e.damage || 0);
      } else if (e.type === 'unit_died') {
        deathsIn.add(e.unitId);
      }
    }

    // Map id → classe pour ventiler par classe.
    const allUnits = [...combat.team, ...combat.monsters];
    const idToClass = {};
    for (const u of allUnits) idToClass[u.id] = u.class;

    // Dégâts infligés par classe + stats par unité.
    for (const [id, dmg] of Object.entries(dmgDealt)) {
      const cls = idToClass[id] || 'unknown';
      agg.damageDealtByClass[cls] = (agg.damageDealtByClass[cls] || 0) + dmg;
      this._ensureUnitStats(id);
      agg.unitStats[id].damageDealt += dmg;
    }
    for (const [id, dmg] of Object.entries(dmgTaken)) {
      const cls = idToClass[id] || 'unknown';
      agg.damageTakenByClass[cls] = (agg.damageTakenByClass[cls] || 0) + dmg;
      this._ensureUnitStats(id);
      agg.unitStats[id].damageTaken += dmg;
    }

    // Taux de survie par unité d'équipe (allié).
    for (const u of combat.team) {
      this._ensureUnitStats(u.id);
      agg.unitStats[u.id].combats += 1;
      if (deathsIn.has(u.id)) {
        agg.unitStats[u.id].deaths += 1;
      } else {
        agg.unitStats[u.id].survivals += 1;
      }
    }

    // Historique compact (fenêtre glissante).
    agg.combatResults.push({ waveId: combat.waveId, result: result.outcome, duration });
    while (agg.combatResults.length > this.bufferSize) agg.combatResults.shift();
  }

  _ensureUnitStats(id) {
    if (!this.aggregates.unitStats[id]) {
      this.aggregates.unitStats[id] = {
        damageDealt: 0,
        damageTaken: 0,
        deaths: 0,
        survivals: 0,
        combats: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // API publique — lecture
  // ---------------------------------------------------------------------------

  /**
   * Stats du combat en cours : DPS temps réel par unité, durée, composition.
   * Retourne null si désactivé ou si aucun combat actif.
   */
  getCurrentCombatStats() {
    if (!this.enabled) return null;
    if (!this.currentCombat) return null;

    const duration = safeNow() - this.currentCombat.startedAt;
    const damageByUnit = {};
    for (const e of this.currentCombat.events) {
      if (e.type === 'attack_performed') {
        damageByUnit[e.attackerId] = (damageByUnit[e.attackerId] || 0) + (e.damage || 0);
      }
    }
    const dpsByUnit = {};
    const secs = Math.max(0.001, duration / 1000);
    for (const [id, dmg] of Object.entries(damageByUnit)) {
      dpsByUnit[id] = dmg / secs;
    }
    return {
      waveId: this.currentCombat.waveId,
      duration,
      team: this.currentCombat.team,
      monsters: this.currentCombat.monsters,
      damageByUnit,
      dpsByUnit,
    };
  }

  /**
   * Vue calculée sur les agrégats cumulés. Retourne null si désactivé.
   */
  getAggregates() {
    if (!this.enabled) return null;
    const agg = this.aggregates;

    const avgDurationByWave = {};
    for (const [wave, stats] of Object.entries(agg.durationByWave)) {
      avgDurationByWave[wave] = stats.count > 0 ? stats.total / stats.count : 0;
    }

    const goldPerMinute = agg.totalDuration > 0
      ? (agg.totalGold / (agg.totalDuration / 60000))
      : 0;

    const survivalRateByUnit = {};
    for (const [id, stats] of Object.entries(agg.unitStats)) {
      survivalRateByUnit[id] = stats.combats > 0 ? stats.survivals / stats.combats : 0;
    }

    return {
      combatsPlayed: agg.combatsPlayed,
      totalDuration: agg.totalDuration,
      totalGold: agg.totalGold,
      maxWave: agg.maxWave,
      goldPerMinute,
      damageDealtByClass: { ...agg.damageDealtByClass },
      damageTakenByClass: { ...agg.damageTakenByClass },
      avgDurationByWave,
      unitStats: JSON.parse(JSON.stringify(agg.unitStats)),
      survivalRateByUnit,
    };
  }

  /**
   * Retourne les N derniers combats bruts (events inclus).
   */
  getRecentCombats(n = 10) {
    if (!this.enabled) return [];
    return this.buffer.slice(-n);
  }

  /**
   * Dump complet sérialisé — agrégats + buffer + métadonnées.
   * Utilisé par le bouton "Export JSON" de l'overlay debug.
   */
  exportJSON() {
    if (!this.enabled) return JSON.stringify({ enabled: false }, null, 2);
    const payload = {
      exportedAt: safeNow(),
      enabled: true,
      aggregates: this.getAggregates(),
      recentCombats: this.buffer,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Wipe complet — utilisé par tests et, optionnellement, par le prestige.
   */
  reset() {
    this.currentCombat = null;
    this.buffer = [];
    this.aggregates = emptyAggregates();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch (e) {}
  }

  /**
   * Hook prestige. Par défaut, les agrégats survivent au prestige (on veut
   * voir l'évolution du joueur sur la durée). Passer `true` pour tout wipe.
   */
  onPrestige(resetAggregates = false) {
    if (!this.enabled) return;
    this.currentCombat = null;
    if (resetAggregates) this.reset();
  }
}

// Instance singleton partagée par tout le jeu.
export const TelemetrySystem = new TelemetrySystemImpl();
