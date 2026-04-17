// BestiarySystem — tracking des découvertes pour le Codex.
//
// Chaque type d'entité (héros, monstre, boss, item) a son set d'IDs découverts.
// Stocké en localStorage. Affiché par BestiaryScreen avec silhouettes pour les
// inconnus, fiches complètes pour les découverts.

const STORAGE_KEY = 'idle_autobattler_bestiary';

class BestiarySystemImpl {
  constructor() {
    this.discovered = {
      heroes: new Set(),    // IDs de héros obtenus au moins 1 fois
      monsters: new Set(),  // Noms de monstres rencontrés au moins 1 fois
      bosses: new Set(),    // IDs de boss scénarisés vaincus
      items: new Set(),     // templateIds + IDs d'items uniques droppés
      biomes: new Set(),    // Biomes visités
    };
    this._listeners = [];
    this._load();
  }

  // ─── API publique ──────────────────────────────────────────────────

  discoverHero(heroId)     { this._add('heroes', heroId); }
  discoverMonster(name)    { this._add('monsters', name); }
  discoverBoss(bossId)     { this._add('bosses', bossId); }
  discoverItem(itemId)     { this._add('items', itemId); }
  discoverBiome(biomeId)   { this._add('biomes', biomeId); }

  isHeroDiscovered(id)     { return this.discovered.heroes.has(id); }
  isMonsterDiscovered(name){ return this.discovered.monsters.has(name); }
  isBossDiscovered(id)     { return this.discovered.bosses.has(id); }
  isItemDiscovered(id)     { return this.discovered.items.has(id); }
  isBiomeDiscovered(id)    { return this.discovered.biomes.has(id); }

  getCount(type)           { return this.discovered[type]?.size || 0; }
  getAll(type)             { return [...(this.discovered[type] || [])]; }

  /** % de complétion par catégorie, 0-100. Requiert les totaux connus. */
  getCompletion(type, total) {
    if (!total || total <= 0) return 0;
    return Math.round((this.getCount(type) / total) * 100);
  }

  // ─── Listeners (pour rafraîchir l'UI si Bestiary ouvert) ──────────

  onDiscovery(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _add(type, id) {
    if (!id) return;
    const set = this.discovered[type];
    if (!set || set.has(id)) return; // déjà découvert
    set.add(id);
    this._save();
    for (const fn of this._listeners) {
      try { fn(type, id); } catch {}
    }
  }

  // ─── Persistence ───────────────────────────────────────────────────

  _save() {
    try {
      const plain = {};
      for (const [k, v] of Object.entries(this.discovered)) {
        plain[k] = [...v];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } catch {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const plain = JSON.parse(raw);
      for (const [k, arr] of Object.entries(plain)) {
        if (Array.isArray(arr) && this.discovered[k]) {
          this.discovered[k] = new Set(arr);
        }
      }
    } catch {}
  }

  serialize() {
    const plain = {};
    for (const [k, v] of Object.entries(this.discovered)) {
      plain[k] = [...v];
    }
    return plain;
  }

  restore(data) {
    if (!data || typeof data !== 'object') return;
    for (const [k, arr] of Object.entries(data)) {
      if (Array.isArray(arr) && this.discovered[k]) {
        this.discovered[k] = new Set(arr);
      }
    }
    this._save();
  }

  reset() {
    for (const k of Object.keys(this.discovered)) this.discovered[k] = new Set();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
}

export const BestiarySystem = new BestiarySystemImpl();
