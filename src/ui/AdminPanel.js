// AdminPanel — panneau de debug/admin. Permet de :
//   - Restart le combat (wave 1, conserve la team)
//   - Sauter à une wave spécifique
//   - Ajouter de l'or/gems manuellement
//   - Voir l'état interne
// Accessible via un onglet "Admin" ou hotkey F12.

import { ResourceSystem } from '../systems/ResourceSystem.js';
import { AuthSystem } from '../systems/AuthSystem.js';
import { formatNumber } from './format.js';

export class AdminPanel {
  /**
   * @param {HTMLElement} container - le parent DOM (cockpit-bottombar ou dédié)
   * @param {Object} options
   * @param {Object} options.game - instance Phaser.Game
   */
  constructor(container, options) {
    this.container = container;
    this.game = options.game;
    this.visible = false;
    this._create();
    this._bindHotkey();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.className = 'admin-panel';
    this.root.style.display = 'none'; // masqué par défaut
    this.root.innerHTML = `
      <div class="admin-header">
        <span class="admin-title">ADMIN</span>
        <button class="admin-close" title="Fermer (F12)">×</button>
      </div>
      <div class="admin-body">
        <div class="admin-section">
          <label class="admin-label">Wave</label>
          <div class="admin-row">
            <input type="number" class="admin-input" data-wave-input value="1" min="1" max="999" />
            <button class="action-btn admin-btn" data-jump>Jump</button>
          </div>
          <div class="admin-row">
            <button class="action-btn admin-btn" data-restart>Restart W1</button>
            <button class="action-btn admin-btn" data-w5>W5</button>
            <button class="action-btn admin-btn" data-w10>W10</button>
            <button class="action-btn admin-btn" data-w25>W25</button>
            <button class="action-btn admin-btn" data-w50>W50</button>
          </div>
        </div>
        <div class="admin-section">
          <label class="admin-label">Resources</label>
          <div class="admin-row">
            <button class="action-btn admin-btn" data-gold100>+100◆</button>
            <button class="action-btn admin-btn" data-gold1k>+1K◆</button>
            <button class="action-btn admin-btn" data-gold10k>+10K◆</button>
            <button class="action-btn admin-btn" data-gem5>+5◇</button>
          </div>
        </div>
        <div class="admin-section">
          <label class="admin-label">Compte</label>
          <div class="admin-row">
            <button class="action-btn admin-btn" data-reset-account style="color:var(--damage)">Reset compte</button>
            <button class="action-btn admin-btn" data-logout>Déconnexion</button>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('.admin-close').addEventListener('click', () => this.toggle());
    this.root.querySelector('[data-restart]').addEventListener('click', () => this._restart());
    this.root.querySelector('[data-jump]').addEventListener('click', () => this._jumpToInput());
    this.root.querySelector('[data-w5]').addEventListener('click', () => this._jump(5));
    this.root.querySelector('[data-w10]').addEventListener('click', () => this._jump(10));
    this.root.querySelector('[data-w25]').addEventListener('click', () => this._jump(25));
    this.root.querySelector('[data-w50]').addEventListener('click', () => this._jump(50));
    this.root.querySelector('[data-gold100]').addEventListener('click', () => ResourceSystem.addGold(100));
    this.root.querySelector('[data-gold1k]').addEventListener('click', () => ResourceSystem.addGold(1000));
    this.root.querySelector('[data-gold10k]').addEventListener('click', () => ResourceSystem.addGold(10000));
    this.root.querySelector('[data-gem5]').addEventListener('click', () => ResourceSystem.addGems(5));

    this.root.querySelector('[data-reset-account]').addEventListener('click', async () => {
      if (!confirm('Supprimer TOUTES les données du compte ? Le jeu redémarrera comme un nouveau joueur.')) return;
      await AuthSystem.cloudReset();
      localStorage.clear();
      window.location.reload();
    });

    this.root.querySelector('[data-logout]').addEventListener('click', async () => {
      await AuthSystem.signOut();
      localStorage.clear();
      window.location.reload();
    });

    // Enter dans l'input = jump
    this.root.querySelector('[data-wave-input]').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._jumpToInput();
    });

    this.container.append(this.root);
  }

  _bindHotkey() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
  }

  _getScene() {
    return this.game.scene.getScene('CombatScene');
  }

  _restart() {
    const scene = this._getScene();
    if (scene?.restartCombat) scene.restartCombat();
  }

  _jump(wave) {
    const scene = this._getScene();
    if (scene?.jumpToWave) scene.jumpToWave(wave);
    const input = this.root.querySelector('[data-wave-input]');
    if (input) input.value = wave;
  }

  _jumpToInput() {
    const input = this.root.querySelector('[data-wave-input]');
    if (!input) return;
    const wave = parseInt(input.value, 10);
    if (Number.isFinite(wave) && wave >= 1) this._jump(wave);
  }

  destroy() {
    if (this.root) this.root.remove();
  }
}
