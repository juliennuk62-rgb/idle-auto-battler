// Système de ressources — or, gemmes, fragments d'âme (plus tard).
//
// Design :
// - Pure JS, zéro dépendance Phaser → testable isolé, réutilisable.
// - Event-based : les UIs s'abonnent via on('gold_changed', cb) et sont
//   notifiées quand les valeurs bougent. Pas de polling.
// - Serialize/restore : méthodes prêtes pour le SaveSystem de l'étape 8.
// - La classe `ResourceSystemImpl` est exportée pour tests isolés, le
//   singleton `ResourceSystem` est utilisé par le jeu.

export class ResourceSystemImpl {
  constructor(options = {}) {
    this.gold = options.initialGold ?? 0;
    this.gems = options.initialGems ?? 0;
    this.soulFragments = options.initialSoul ?? 0;

    // Listeners : { type: string, callback: Function }[]
    this._listeners = [];
  }

  // ---------------------------------------------------------------------------
  // Mutations — or
  // ---------------------------------------------------------------------------

  addGold(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const rounded = Math.round(amount);
    this.gold += rounded;
    this._emit('gold_changed', { gold: this.gold, delta: rounded });
  }

  spendGold(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.round(amount);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this._emit('gold_changed', { gold: this.gold, delta: -cost });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Mutations — gemmes
  // ---------------------------------------------------------------------------

  addGems(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const rounded = Math.round(amount);
    this.gems += rounded;
    this._emit('gems_changed', { gems: this.gems, delta: rounded });
  }

  spendGems(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const cost = Math.round(amount);
    if (this.gems < cost) return false;
    this.gems -= cost;
    this._emit('gems_changed', { gems: this.gems, delta: -cost });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Mutations — fragments d'âme (ressource de prestige, étape 10)
  // ---------------------------------------------------------------------------

  addSoulFragments(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const rounded = Math.round(amount);
    this.soulFragments += rounded;
    this._emit('soul_changed', { soul: this.soulFragments, delta: rounded });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * S'abonne à un type d'event. Retourne l'objet listener pour pouvoir
   * s'en désabonner plus tard via off().
   */
  on(type, callback) {
    const listener = { type, callback };
    this._listeners.push(listener);
    return listener;
  }

  off(type, callback) {
    this._listeners = this._listeners.filter(
      (l) => !(l.type === type && l.callback === callback)
    );
  }

  _emit(type, data) {
    // Copie la liste pour survivre à un off() pendant le dispatch.
    const snapshot = this._listeners.slice();
    for (const l of snapshot) {
      if (l.type === type) {
        try {
          l.callback(data);
        } catch (e) {
          // Un listener qui throw ne doit pas casser les autres ni le jeu.
          console.error('[ResourceSystem] listener failed:', e);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Persistance (hooks pour le SaveSystem futur)
  // ---------------------------------------------------------------------------

  serialize() {
    return {
      gold: this.gold,
      gems: this.gems,
      soulFragments: this.soulFragments,
    };
  }

  restore(data) {
    if (!data) return;
    if (typeof data.gold === 'number') this.gold = data.gold;
    if (typeof data.gems === 'number') this.gems = data.gems;
    if (typeof data.soulFragments === 'number') this.soulFragments = data.soulFragments;
    // Émet pour que les UIs se resynchronisent.
    this._emit('gold_changed', { gold: this.gold, delta: 0 });
    this._emit('gems_changed', { gems: this.gems, delta: 0 });
    this._emit('soul_changed', { soul: this.soulFragments, delta: 0 });
  }

  reset() {
    this.gold = 0;
    this.gems = 0;
    this.soulFragments = 0;
    this._emit('gold_changed', { gold: 0, delta: 0 });
    this._emit('gems_changed', { gems: 0, delta: 0 });
    this._emit('soul_changed', { soul: 0, delta: 0 });
  }
}

export const ResourceSystem = new ResourceSystemImpl();
