// Bandeau d'annonce de vague (typiquement boss). Slide-in depuis la droite,
// hold au centre, slide-out vers la gauche. Texte en 2 lignes : titre
// principal ("BOSS", "WAVE SPÉCIALE"…) + sous-ligne ("WAVE 5").
//
// Usage :
//   this.waveBanner = new WaveBanner(scene);
//   this.waveBanner.show('BOSS', 'WAVE 5');
//
// Le bandeau est non-interactif et ne bloque aucun input — c'est juste
// de l'affichage. La scène peut continuer à tourner pendant qu'il slide.

export class WaveBanner {
  constructor(scene) {
    this.scene = scene;
    this._create();
  }

  _create() {
    // Container placé à la position Y fixe (~140) au centre vertical-haut.
    // X initial hors-écran à droite pour le slide-in.
    this.container = this.scene.add.container(900, 150);
    this.container.setDepth(800); // au-dessus du combat, sous l'overlay debug
    this.container.setVisible(false);

    // Fond noir semi-transparent, bordure dorée.
    this.bg = this.scene.add
      .rectangle(0, 0, 560, 80, 0x000000, 0.85)
      .setStrokeStyle(3, 0xfbbf24);

    // Titre principal (BOSS, etc.) — gros texte doré.
    this.titleText = this.scene.add
      .text(0, -14, '', {
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontSize: '30px',
        color: '#fbbf24',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // Sous-titre (WAVE N) — plus petit et blanc.
    this.subText = this.scene.add
      .text(0, 18, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        letterSpacing: 2,
      })
      .setOrigin(0.5);

    this.container.add([this.bg, this.titleText, this.subText]);
  }

  /**
   * Déclenche l'affichage du bandeau pour ~1500 ms total.
   *
   * @param {string} title    - texte principal (ex: "BOSS", "WAVE 5")
   * @param {string} subtitle - sous-titre (ex: "WAVE 5", "BOSS INCOMING")
   * @param {Object} [options]
   * @param {number} [options.holdMs=900] - temps statique au centre en ms
   * @param {number} [options.borderColor] - couleur de la bordure du bg
   */
  show(title, subtitle = '', options = {}) {
    const holdMs = options.holdMs ?? 900;
    const borderColor = options.borderColor ?? 0xfbbf24;

    this.titleText.setText(title);
    this.subText.setText(subtitle);
    this.bg.setStrokeStyle(3, borderColor);
    this.titleText.setColor('#' + borderColor.toString(16).padStart(6, '0'));

    // Stop tout tween en cours sur le container pour éviter des états bizarres
    // si un nouveau show() arrive pendant qu'un ancien animait encore.
    this.scene.tweens.killTweensOf(this.container);

    // Reset à droite hors-écran.
    this.container.x = 900;
    this.container.setVisible(true);
    this.container.setAlpha(1);

    // Phase 1 — slide in depuis la droite.
    this.scene.tweens.add({
      targets: this.container,
      x: 400,
      duration: 300,
      ease: 'Back.Out',
    });

    // Phase 2 — hold, puis slide-out vers la gauche (via delayedCall).
    this.scene.time.delayedCall(300 + holdMs, () => {
      if (!this.container || !this.container.scene) return;
      this.scene.tweens.add({
        targets: this.container,
        x: -400,
        duration: 300,
        ease: 'Back.In',
        onComplete: () => {
          if (this.container) this.container.setVisible(false);
        },
      });
    });
  }

  destroy() {
    if (this.container) this.container.destroy();
  }
}
