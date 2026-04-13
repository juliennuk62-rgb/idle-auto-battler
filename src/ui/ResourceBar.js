// Barre de ressources affichée en haut à gauche de l'écran.
// Lit ses valeurs via les events de ResourceSystem — pas de polling.
// Pop animation sur gain (scale up → Back.Out) pour que ça se remarque.
//
// Layout (x=20, y=20, 220×40) :
//
//   ◆ 1234   ◆ 5
//   gold     gems

import { ResourceSystem } from '../systems/ResourceSystem.js';

export class ResourceBar {
  constructor(scene, x = 20, y = 20) {
    this.scene = scene;
    this._create(x, y);
    this._bindEvents();
  }

  _create(x, y) {
    const W = 220;
    const H = 42;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(750); // au-dessus du combat, sous wave banner (800)

    // Fond semi-transparent avec petite bordure.
    this.bg = this.scene.add
      .rectangle(0, 0, W, H, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555555);

    // Or — losange doré + valeur.
    this.goldIcon = this.scene.add
      .text(12, 11, '◆', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#fbbf24',
        fontStyle: 'bold',
      });
    this.goldText = this.scene.add
      .text(34, 12, '0', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      });

    // Gemmes — losange violet + valeur.
    this.gemIcon = this.scene.add
      .text(124, 11, '◆', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#c084fc',
        fontStyle: 'bold',
      });
    this.gemText = this.scene.add
      .text(146, 12, '0', {
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      });

    this.container.add([
      this.bg,
      this.goldIcon,
      this.goldText,
      this.gemIcon,
      this.gemText,
    ]);
  }

  _bindEvents() {
    // Handlers gardés en référence pour pouvoir off() proprement au destroy.
    this._goldHandler = ({ gold, delta }) => this._updateGold(gold, delta);
    this._gemHandler = ({ gems, delta }) => this._updateGems(gems, delta);

    ResourceSystem.on('gold_changed', this._goldHandler);
    ResourceSystem.on('gems_changed', this._gemHandler);

    // Resync avec les valeurs initiales (utile si le ResourceSystem a déjà
    // été modifié avant la création de la barre — cas save/load).
    this._updateGold(ResourceSystem.gold, 0);
    this._updateGems(ResourceSystem.gems, 0);

    // Cleanup automatique quand la scène se détruit/restart.
    this.scene.events.once('shutdown', () => this.destroy());
  }

  _updateGold(gold, delta) {
    this.goldText.setText(String(gold));
    if (delta > 0) this._popText(this.goldText);
  }

  _updateGems(gems, delta) {
    this.gemText.setText(String(gems));
    if (delta > 0) this._popText(this.gemText);
  }

  _popText(textObj) {
    // Pop : on agrandit à 1.35 puis retour à 1 avec Back.Out.
    this.scene.tweens.killTweensOf(textObj);
    textObj.setScale(1.35);
    this.scene.tweens.add({
      targets: textObj,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: 'Back.Out',
    });
  }

  destroy() {
    ResourceSystem.off('gold_changed', this._goldHandler);
    ResourceSystem.off('gems_changed', this._gemHandler);
    if (this.container) this.container.destroy();
  }
}
