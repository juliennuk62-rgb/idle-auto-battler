// Pool de dégâts flottants. Chaque hit pop un nombre au-dessus de la cible,
// scroll vers le haut, grossit puis fade out en ~700 ms.
//
// Le pool évite de créer/détruire des Text à chaque hit — critique pour
// tenir 60 fps quand ça rush. Les textes inutilisés sont simplement
// invisibles et réutilisés au prochain spawn.

export class FloatingDamage {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
  }

  /**
   * Fait apparaître un nombre flottant à la position (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} value - valeur à afficher (dégâts)
   * @param {Object} [options]
   * @param {string} [options.color='#ffffff']  - couleur du texte
   * @param {boolean} [options.critical=false] - si true, texte plus gros / jaune
   */
  spawn(x, y, value, options = {}) {
    const color = options.color || (options.critical ? '#fbbf24' : '#ffffff');
    const size = options.critical ? 26 : 18;

    const text = this._acquire();
    text.setFontSize(size);
    text.setText(String(value));
    text.setColor(color);
    text.setPosition(x, y);
    text.setAlpha(1);
    text.setVisible(true);

    // Phase 1 — pop-in : grossit rapidement avec Back.Out (léger dépassement).
    const popDuration = 160;
    const popScaleFrom = 0.4;
    const popScaleTo = options.critical ? 1.35 : 1.0;
    text.setScale(popScaleFrom);

    this.scene.tweens.add({
      targets: text,
      scaleX: popScaleTo,
      scaleY: popScaleTo,
      duration: popDuration,
      ease: 'Back.Out',
      onComplete: () => {
        // Phase 2 — float up + fade out : le nombre monte doucement
        // et disparaît. Quad.Out → le mouvement ralentit à la fin,
        // plus lisible qu'une interpolation linéaire.
        this.scene.tweens.add({
          targets: text,
          y: y - 55,
          alpha: 0,
          duration: 540,
          ease: 'Quad.Out',
          onComplete: () => this._release(text),
        });
      },
    });
  }

  /**
   * Variante "récompense" — affiche du texte or/gems avec préfixe "+" et
   * couleur distincte, à une position un peu plus haute que les dégâts
   * pour ne pas chevaucher le dernier floating damage qui spawn au même
   * endroit quand le monstre meurt.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   * @param {Object} [options]
   * @param {string} [options.type='gold']  - 'gold' | 'gems'
   */
  spawnReward(x, y, amount, options = {}) {
    const type = options.type || 'gold';
    const color = type === 'gems' ? '#c084fc' : '#fbbf24';
    // Léger délai pour que le floating damage "de kill" parte avant que le
    // reward n'arrive au même endroit — lecture plus propre.
    const delay = options.delay ?? 80;
    this.scene.time.delayedCall(delay, () => {
      this.spawn(x, y, `+${amount}`, { color, critical: false });
    });
  }

  _acquire() {
    // Cherche un text invisible dans le pool, sinon en crée un neuf.
    for (const t of this.pool) {
      if (!t.visible) return t;
    }
    const t = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    t.setDepth(500); // au-dessus du combat, sous l'overlay debug
    this.pool.push(t);
    return t;
  }

  _release(text) {
    text.setVisible(false);
  }
}
