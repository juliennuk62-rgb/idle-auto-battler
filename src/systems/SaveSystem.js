// SaveSystem — sérialise / restaure l'état complet du jeu dans localStorage.
//
// Ce qui est sauvé :
//   - Ressources (gold, gems, soul fragments)
//   - Équipe (classe, grade, level, xp de chaque unité)
//   - Progression (wave courante, wave max atteinte)
//   - Timestamp (pour le calcul offline)
//
// Ce qui est déjà persisté séparément (par d'autres systèmes) :
//   - Agrégats télémétrie → localStorage 'telemetry_aggregates'
//
// Le SaveSystem est un singleton pur JS (zéro dépendance Phaser). Le scene
// appelle save(gameState) et le Cockpit appelle load() au boot.

import { BALANCE } from '../data/balance.js';

const SAVE_KEY = 'idle_autobattler_save';
const SAVE_VERSION = 1;

export class SaveSystemImpl {
  constructor() {
    this.saveKey = SAVE_KEY;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  /**
   * Sérialise l'état courant dans localStorage.
   *
   * @param {Object} state
   * @param {Object} state.resources      - { gold, gems, soulFragments }
   * @param {Array}  state.team           - Fighter instances (on extrait les specs)
   * @param {number} state.currentWave
   * @param {number} state.maxWave
   * @param {string} state.biomeId
   */
  save(state) {
    try {
      const data = {
        v: SAVE_VERSION,
        ts: Date.now(),
        resources: state.resources,
        team: (state.team || []).map((f) => ({
          class: f.class,
          grade: f.grade ?? 1,
          level: f.level ?? 1,
          xp: f.xp ?? 0,
          baseHp: f.baseHp,
          baseAtk: f.baseAtk,
          name: f.name,
          line: f.line ?? 'front',
          targeting: f.targeting ?? 'closest',
        })),
        wave: state.currentWave ?? 1,
        maxWave: state.maxWave ?? 1,
        biome: state.biomeId ?? 'forest',
      };
      localStorage.setItem(this.saveKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[SaveSystem] save failed:', e);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  /**
   * Charge et retourne la save brute, ou null si aucune save / corruption.
   */
  load() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== SAVE_VERSION) return null;
      return data;
    } catch (e) {
      console.error('[SaveSystem] load failed:', e);
      return null;
    }
  }

  /**
   * Retourne true si une save existe et est chargeable.
   */
  hasSave() {
    return this.load() !== null;
  }

  // ---------------------------------------------------------------------------
  // Offline rewards
  // ---------------------------------------------------------------------------

  /**
   * Calcule les gains accumulés pendant l'absence du joueur.
   * Formule GAME_DESIGN.md :
   *   or_gained = (or_par_seconde_de_la_dernière_vague) × temps_écoulé × 0.5
   *   Plafond : 8 heures.
   *
   * @param {Object} saveData — résultat de load()
   * @returns {{ elapsed: number, gold: number, shouldShow: boolean }}
   */
  computeOfflineRewards(saveData) {
    if (!saveData || !saveData.ts) {
      return { elapsed: 0, gold: 0, shouldShow: false };
    }

    const offlineCfg = BALANCE.offline;
    const goldCfg = BALANCE.gold;

    const elapsed = Date.now() - saveData.ts;
    if (elapsed < offlineCfg.min_absence_ms) {
      return { elapsed, gold: 0, shouldShow: false };
    }

    const capMs = offlineCfg.cap_hours * 60 * 60 * 1000;
    const clampedMs = Math.min(elapsed, capMs);
    const clampedSec = clampedMs / 1000;

    // Estimation du gold/s basé sur la dernière vague.
    // Hypothèse : ~1 kill toutes les 2 secondes (combat auto-battler standard).
    const wave = saveData.wave || 1;
    const waveIdx = Math.max(0, wave - 1);
    const goldPerKill = goldCfg.per_kill_base * Math.pow(goldCfg.growth, waveIdx);
    const estimatedKillsPerSec = 0.5; // 1 kill / 2s
    const goldPerSec = goldPerKill * estimatedKillsPerSec;

    const offlineGold = Math.max(1, Math.round(goldPerSec * clampedSec * offlineCfg.efficiency));

    return {
      elapsed: clampedMs,
      gold: offlineGold,
      shouldShow: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  clear() {
    try {
      localStorage.removeItem(this.saveKey);
    } catch (e) {}
  }
}

export const SaveSystem = new SaveSystemImpl();
