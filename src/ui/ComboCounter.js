// Combo multiplier — affiche "x2", "x3", etc. quand plusieurs kills
// s'enchaînent dans une fenêtre temporelle courte. Reset auto quand la
// fenêtre expire sans nouveau kill.
//
// Position : coin top-right du canvas, non-interactif, visible uniquement
// à partir de 2 kills enchaînés (x1 ne vaut pas d'être affiché).
//
// Le compteur scale en fonction du combo : plus c'est gros, plus ça pop.
// La couleur glisse du jaune (x2-x4) vers l'orange (x5-x9) vers le rouge (x10+).

export class ComboCounter {
  constructor(scene, x = 720, y = 110, windowMs = 2500) {
    this.scene = scene;
    this.windowMs = windowMs;
    this.count = 0;
    this.lastKillTime = 0;
    this.timeoutCall = null;

    this._create(x, y);
  }

  _create(x, y) {
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(700); // sous overlay debug (1000), sous waveBanner (800)
    this.container.setVisible(false);

    this.text = this.scene.add
      .text(0, 0, 'x2', {
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontSize: '44px',
        color: '#fbbf24',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.label = this.scene.add
      .text(0, 28, 'COMBO', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.container.add([this.text, this.label]);
  }

  /**
   * Appelé par CombatSystem à chaque kill ennemi. Incrémente le combo
   * si le dernier kill est dans la fenêtre, sinon reset à 1.
   */
  registerKill() {
    const now = Date.now();
    if (now - this.lastKillTime < this.windowMs) {
      this.count += 1;
    } else {
      this.count = 1;
    }
    this.lastKillTime = now;

    // N'affiche qu'à partir de 2. Le premier kill amorce juste le compteur.
    if (this.count >= 2) this._show();

    // (Re)schedule l'auto-hide après la fenêtre.
    if (this.timeoutCall) this.timeoutCall.remove();
    this.timeoutCall = this.scene.time.delayedCall(this.windowMs, () => this._timeout());
  }

  _show() {
    this.text.setText(`x${this.count}`);
    this.text.setColor(this._colorForCount(this.count));

    // Scale cible qui grossit avec le combo, mais capé pour pas envahir l'écran.
    const targetScale = Math.min(1 + (this.count - 2) * 0.08, 1.6);

    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true);
    this.container.setAlpha(1);

    // Pop : on part plus gros que la cible, on revient dessus avec Back.Out.
    this.container.setScale(targetScale * 1.4);
    this.scene.tweens.add({
      targets: this.container,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 200,
      ease: 'Back.Out',
    });
  }

  _timeout() {
    this.count = 0;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      ease: 'Quad.Out',
      onComplete: () => {
        if (this.container) this.container.setVisible(false);
      },
    });
  }

  _colorForCount(n) {
    if (n >= 10) return '#ef4444'; // rouge
    if (n >= 5) return '#fb923c';  // orange
    return '#fbbf24';              // jaune
  }

  /** Reset manuel (prestige, restart scène, etc.) */
  reset() {
    if (this.timeoutCall) this.timeoutCall.remove();
    this.count = 0;
    this.lastKillTime = 0;
    this.container.setVisible(false);
  }
}
