// WorldSystem — gère la progression sur la carte du monde.
// Track : biomes débloqués, biomes cleared (boss battu), meilleure wave par biome.
// Persisté dans le cloud save via AuthSystem.

import { BIOMES } from '../data/biomes.js';

const STORAGE_KEY = 'idle_autobattler_world';

// Ordre de déblocage linéaire — battre le boss d'un biome débloque le suivant.
const BIOME_ORDER = ['forest', 'caves', 'ruins', 'hell', 'snow', 'temple'];

export class WorldSystemImpl {
  constructor() {
    this.data = this._load();
  }

  _defaults() {
    return {
      unlocked: ['forest'],  // biomes accessibles
      cleared: [],            // biomes dont le boss est battu
      bestWave: {},           // { forest: 10, caves: 7 }
      totalRuns: 0,
    };
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...this._defaults(), ...JSON.parse(raw) };
    } catch (e) {}
    return this._defaults();
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  isUnlocked(biomeId) {
    return this.data.unlocked.includes(biomeId);
  }

  isCleared(biomeId) {
    return this.data.cleared.includes(biomeId);
  }

  getBestWave(biomeId) {
    return this.data.bestWave[biomeId] || 0;
  }

  getUnlockedBiomes() {
    return BIOME_ORDER.filter(id => this.data.unlocked.includes(id));
  }

  getAllZones() {
    return BIOME_ORDER.map(id => {
      const biome = BIOMES.find(b => b.id === id);
      return {
        id,
        name: biome?.name || id,
        unlocked: this.isUnlocked(id),
        cleared: this.isCleared(id),
        bestWave: this.getBestWave(id),
        accent: biome?.accent,
      };
    });
  }

  // ─── Mutations ────────────────────────────────────────────────────────

  /**
   * Appelé à la fin d'un run dans un biome (victoire ou défaite).
   * waveReached = la dernière wave atteinte.
   * bossBeaten = true si le boss du biome a été battu.
   */
  completeRun(biomeId, waveReached, bossBeaten) {
    this.data.totalRuns++;

    // Update best wave.
    if (waveReached > (this.data.bestWave[biomeId] || 0)) {
      this.data.bestWave[biomeId] = waveReached;
    }

    // Si le boss est battu → marque comme cleared + débloque le suivant.
    if (bossBeaten && !this.data.cleared.includes(biomeId)) {
      this.data.cleared.push(biomeId);
      const idx = BIOME_ORDER.indexOf(biomeId);
      if (idx >= 0 && idx < BIOME_ORDER.length - 1) {
        const nextBiome = BIOME_ORDER[idx + 1];
        if (!this.data.unlocked.includes(nextBiome)) {
          this.data.unlocked.push(nextBiome);
        }
      }
    }

    this._save();
  }

  // ─── Persistence ──────────────────────────────────────────────────────

  serialize() { return { ...this.data }; }
  restore(d) {
    if (d) this.data = { ...this._defaults(), ...d };
    this._save();
  }
  reset() {
    this.data = this._defaults();
    this._save();
  }
}

export const WorldSystem = new WorldSystemImpl();
