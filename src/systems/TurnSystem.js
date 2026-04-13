// TurnSystem — gère l'ordre des tours dans le combat donjon tour par tour.
// Initiative-based : chaque round, l'ordre est recalculé.
// Tick les status effects en début de tour de chaque fighter.

export class TurnSystem {
  constructor() {
    this.turnOrder = [];    // DungeonFighter[] trié par initiative décroissante
    this.currentIndex = 0;
    this.roundNumber = 1;
    this._onTurnStart = null;  // callback(fighter)
    this._onRoundStart = null; // callback(roundNumber)
  }

  /**
   * Construit l'ordre de tour initial pour un round.
   * @param {DungeonFighter[]} fighters — tous les fighters vivants
   */
  buildTurnOrder(fighters) {
    this.turnOrder = fighters
      .filter(f => f.isAlive)
      .map(f => ({
        fighter: f,
        roll: f.initiative + Math.random() * 10,
      }))
      .sort((a, b) => b.roll - a.roll)
      .map(e => e.fighter);

    this.currentIndex = 0;
  }

  /**
   * Recalcule l'ordre pour un nouveau round (entre les rounds).
   */
  newRound(fighters) {
    this.roundNumber++;
    this.buildTurnOrder(fighters);
    if (this._onRoundStart) this._onRoundStart(this.roundNumber);
  }

  /**
   * Retourne le fighter dont c'est le tour.
   */
  getCurrentFighter() {
    if (this.currentIndex >= this.turnOrder.length) return null;
    return this.turnOrder[this.currentIndex];
  }

  /**
   * Démarre le tour du fighter courant :
   * - Tick ses status effects
   * - Reset son PA/PM
   * - Retourne le fighter
   */
  /**
   * Démarre le tour du fighter courant.
   * Skip automatiquement les morts (avance l'index).
   * Retourne le fighter actif ou null si round fini.
   */
  startCurrentTurn() {
    // Skip les morts jusqu'à trouver un vivant ou fin de round
    while (this.currentIndex < this.turnOrder.length) {
      const fighter = this.turnOrder[this.currentIndex];
      if (fighter && fighter.isAlive) {
        // Tick status effects
        fighter.tickStatusEffects();

        // Check si mort suite au poison/dot
        if (!fighter.isAlive) {
          this.currentIndex++;
          continue;
        }

        // Reset PA/PM
        fighter.resetTurnResources();
        return fighter;
      }
      this.currentIndex++;
    }

    return null; // round terminé
  }

  /**
   * Passe au tour suivant. Si le round est fini, retourne null.
   */
  /**
   * Avance l'index au prochain fighter vivant.
   * Retourne true s'il y a un prochain, false si le round est fini.
   * N'appelle PAS startCurrentTurn — c'est à l'appelant de le faire.
   */
  nextTurn() {
    this.currentIndex++;

    // Skip les fighters morts
    while (this.currentIndex < this.turnOrder.length) {
      const f = this.turnOrder[this.currentIndex];
      if (f.isAlive) break;
      this.currentIndex++;
    }

    return this.currentIndex < this.turnOrder.length;
  }

  /**
   * Retire un fighter de l'ordre de tour (mort en cours de round).
   */
  removeFighter(fighter) {
    const idx = this.turnOrder.indexOf(fighter);
    if (idx === -1) return;
    this.turnOrder.splice(idx, 1);
    // Ajuster l'index courant si nécessaire
    if (idx < this.currentIndex) {
      this.currentIndex--;
    }
  }

  /** Le round est-il terminé ? */
  isRoundComplete() {
    return this.currentIndex >= this.turnOrder.length;
  }

  /** Retourne l'ordre de tour pour l'affichage UI. */
  getDisplayOrder() {
    return this.turnOrder.filter(f => f.isAlive);
  }

  /** Retourne les N prochains fighters (pour la barre d'ordre). */
  getUpcoming(count = 10) {
    const result = [];
    // D'abord les restants de ce round
    for (let i = this.currentIndex; i < this.turnOrder.length && result.length < count; i++) {
      if (this.turnOrder[i].isAlive) result.push(this.turnOrder[i]);
    }
    // Puis tout le monde pour le round suivant (estimation)
    if (result.length < count) {
      const alive = this.turnOrder.filter(f => f.isAlive);
      for (const f of alive) {
        if (result.length >= count) break;
        if (!result.includes(f)) result.push(f);
      }
    }
    return result;
  }

  onTurnStart(fn) { this._onTurnStart = fn; }
  onRoundStart(fn) { this._onRoundStart = fn; }
}
