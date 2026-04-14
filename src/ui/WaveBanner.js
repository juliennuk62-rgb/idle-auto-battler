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

    // Reset à droite hors-écran, légèrement tourné pour un feel dynamique.
    this.container.x = 1000;
    this.container.setScale(0.85);
    this.container.setAngle(6);
    this.container.setAlpha(0);
    this.container.setVisible(true);

    // Phase 1 — slide in élastique depuis la droite avec overshoot + redressement.
    this.scene.tweens.add({
      targets: this.container,
      x: 400,
      scale: 1,
      angle: 0,
      alpha: 1,
      duration: 560,
      ease: 'Back.Out',
      easeParams: [1.8], // overshoot prononcé
    });

    // Phase 2 — hold, puis exit avec wind-up court (recul) puis fuite rapide.
    this.scene.time.delayedCall(560 + holdMs, () => {
      if (!this.container || !this.container.scene) return;
      // Micro wind-up : recule légèrement avant de partir (comme un élastique bandé)
      this.scene.tweens.add({
        targets: this.container,
        x: 440,
        duration: 140,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!this.container || !this.container.scene) return;
          this.scene.tweens.add({
            targets: this.container,
            x: -500,
            scale: 0.7,
            angle: -8,
            alpha: 0,
            duration: 360,
            ease: 'Cubic.In',
            onComplete: () => {
              if (this.container) this.container.setVisible(false);
            },
          });
        },
      });
    });
  }

  destroy() {
    if (this.container) this.container.destroy();
  }
}
