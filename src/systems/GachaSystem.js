// GachaSystem — gère l'invocation de héros (pull, pity, inventory).
// Singleton. Persisté dans localStorage + cloud.

import { HEROES, HERO_RARITIES, getHero, getHeroRarity } from '../data/heroes.js';
import { BALANCE } from '../data/balance.js';
import { ResourceSystem } from './ResourceSystem.js';

const STORAGE_KEY = 'idle_autobattler_gacha';

const RARITY_ORDER = ['R', 'SR', 'SSR', 'UR'];

export class GachaSystemImpl {
  constructor() {
    this.ownedHeroes = [];   // [heroId, ...] — héros obtenus (jamais supprimés)
    this.assignedHeroes = {}; // { fighterId: heroId } — qui utilise quel héros
    this.pitySSR = 0;        // compteur pulls sans SSR
    this.pityUR = 0;         // compteur pulls sans UR
    this.pityMYTHIC = 0;     // compteur pulls sans MYTHIC (pity à 200)
    this._load();
  }

  // ─── Pull ───────────────────────────────────────────────────────────

  /**
   * Single pull (1 héros). Coûte singleCost gemmes. Retourne { hero, isNew, rarity }.
   */
  pullSingle() {
    const cost = BALANCE.gacha.singleCost;
    if (ResourceSystem.gems < cost) return null;
    ResourceSystem.spendGems(cost);

    const result = this._roll();
    this._save();
    return result;
  }

  /**
   * Multi-pull (10 héros). Coûte multiCost gemmes. Le 10ème est garanti SR+.
   * Retourne un array de 10 { hero, isNew, rarity }.
   */
  pullMulti() {
    const cost = BALANCE.gacha.multiCost;
    if (ResourceSystem.gems < cost) return null;
    ResourceSystem.spendGems(cost);

    const results = [];
    for (let i = 0; i < 10; i++) {
      if (i === 9) {
        // Le 10ème = garanti SR+ (si les 9 précédents étaient tous R).
        const allR = results.every(r => r.rarity === 'R');
        if (allR) {
          results.push(this._roll('SR')); // force SR minimum
        } else {
          results.push(this._roll());
        }
      } else {
        results.push(this._roll());
      }
    }

    this._save();
    return results;
  }

  /**
   * Roll une rareté + pioche un héros de cette rareté.
   * @param {string} [minRarity] — force une rareté minimum (pour le garanti multi-pull)
   */
  _roll(minRarity) {
    let rarity = this._rollRarity();
    let wasPity = false;

    // Force une rareté minimum si demandée.
    if (minRarity) {
      const minIdx = RARITY_ORDER.indexOf(minRarity);
      const curIdx = RARITY_ORDER.indexOf(rarity);
      if (curIdx < minIdx) rarity = minRarity;
    }

    // Pity SSR.
    if (rarity !== 'SSR' && rarity !== 'UR') {
      this.pitySSR++;
      if (this.pitySSR >= BALANCE.gacha.pitySSR) {
        rarity = 'SSR';
        this.pitySSR = 0;
        wasPity = true;
      }
    } else if (rarity === 'SSR' || rarity === 'UR') {
      this.pitySSR = 0;
    }

    // Pity UR.
    if (rarity !== 'UR' && rarity !== 'MYTHIC') {
      this.pityUR++;
      if (this.pityUR >= BALANCE.gacha.pityUR) {
        rarity = 'UR';
        this.pityUR = 0;
        wasPity = true;
      }
    } else if (rarity === 'UR' || rarity === 'MYTHIC') {
      this.pityUR = 0;
    }

    // Pity MYTHIC (200 pulls sans mythique → garanti).
    if (rarity !== 'MYTHIC') {
      this.pityMYTHIC++;
      if (this.pityMYTHIC >= 200) {
        rarity = 'MYTHIC';
        this.pityMYTHIC = 0;
        wasPity = true;
      }
    } else {
      this.pityMYTHIC = 0;
    }

    // Pioche un héros de cette rareté (random).
    let pool = HEROES.filter(h => h.rarity === rarity);
    // Fallback si pool vide (rare edge case pour MYTHIC si pas de héros)
    if (pool.length === 0) pool = HEROES.filter(h => h.rarity === 'UR');
    const hero = pool[Math.floor(Math.random() * pool.length)];

    const isNew = !this.ownedHeroes.includes(hero.id);
    if (isNew) this.ownedHeroes.push(hero.id);

    // Narrator RNG : commentaire contextuel sur le pull (async import pour éviter
    // de créer un import circulaire entre NarratorSystem → GachaSystem).
    import('./NarratorSystem.js').then(({ NarratorSystem }) => {
      NarratorSystem.onPull({ rarity, isPity: wasPity });
    }).catch(() => {});

    return {
      hero,
      isNew,
      rarity,
      rarityInfo: HERO_RARITIES[rarity],
    };
  }

  _rollRarity() {
    const roll = Math.random() * 100;
    let cumul = 0;
    for (const key of RARITY_ORDER) {
      cumul += HERO_RARITIES[key].rate;
      if (roll < cumul) return key;
    }
    return 'R';
  }

  // ─── Hero management ────────────────────────────────────────────────

  getOwnedHeroes() { return [...this.ownedHeroes]; }

  isOwned(heroId) { return this.ownedHeroes.includes(heroId); }

  getPity() {
    return {
      ssr: this.pitySSR,
      ssrMax: BALANCE.gacha.pitySSR,
      ur: this.pityUR,
      urMax: BALANCE.gacha.pityUR,
    };
  }

  /**
   * Assigne un héros à un fighter. Le héros booste les stats du fighter.
   */
  assignHero(heroId, fighterId) {
    if (!this.isOwned(heroId)) return false;
    // Désassigne l'ancien héros de ce fighter.
    for (const [fid, hid] of Object.entries(this.assignedHeroes)) {
      if (fid === fighterId) delete this.assignedHeroes[fid];
      if (hid === heroId) delete this.assignedHeroes[fid]; // un héros ne peut être assigné qu'à 1
    }
    this.assignedHeroes[fighterId] = heroId;
    this._save();
    return true;
  }

  getAssignedHero(fighterId) {
    const heroId = this.assignedHeroes[fighterId];
    return heroId ? getHero(heroId) : null;
  }

  /** Retourne le mapping { fighterId: heroId } de toutes les assignations. */
  getAssignments() {
    return { ...this.assignedHeroes };
  }

  /** Retire le héros assigné à un fighter. */
  unassignHero(fighterId) {
    delete this.assignedHeroes[fighterId];
    this._save();
  }

  /**
   * Retourne les modificateurs de stats du héros assigné à un fighter.
   */
  getHeroModifiers(fighterId) {
    const hero = this.getAssignedHero(fighterId);
    if (!hero) return { statMult: 1, passifs: [] };
    const rarity = getHeroRarity(hero);
    return {
      statMult: rarity.mult,
      passifs: hero.passifs || [],
      heroName: hero.name,
      heroRarity: hero.rarity,
      rarityColor: rarity.color,
    };
  }

  // ─── Persistence ────────────────────────────────────────────────────

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        owned: this.ownedHeroes,
        assigned: this.assignedHeroes,
        pitySSR: this.pitySSR,
        pityUR: this.pityUR,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.ownedHeroes = data.owned || [];
        this.assignedHeroes = data.assigned || {};
        this.pitySSR = data.pitySSR || 0;
        this.pityUR = data.pityUR || 0;
        // Migration u1-u4 → slot_1-slot_5
        const ID_MIG = { u1: 'slot_1', u2: 'slot_2', u3: 'slot_3', u4: 'slot_4', u5: 'slot_5' };
        const newAssigned = {};
        let migrated = false;
        for (const [k, v] of Object.entries(this.assignedHeroes)) {
          const newKey = ID_MIG[k] || k;
          if (newKey !== k) migrated = true;
          newAssigned[newKey] = v;
        }
        if (migrated) { this.assignedHeroes = newAssigned; this._save(); }
      }
    } catch (e) {}
  }

  serialize() {
    return {
      owned: this.ownedHeroes,
      assigned: this.assignedHeroes,
      pitySSR: this.pitySSR,
      pityUR: this.pityUR,
    };
  }

  restore(data) {
    if (!data) return;
    this.ownedHeroes = data.owned || [];
    this.assignedHeroes = data.assigned || {};
    this.pitySSR = data.pitySSR || 0;
    this.pityUR = data.pityUR || 0;
    this._save();
  }
}

export const GachaSystem = new GachaSystemImpl();
