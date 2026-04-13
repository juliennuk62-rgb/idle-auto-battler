// ActionButton — bouton cockpit avec label, sublabel (coût), icône,
// états (available / disabled), pulse quand il vient de devenir disponible.
// Vérifie sa condition d'activation toutes les 500ms.

import { formatNumber } from './format.js';

const CHECK_MS = 500; // 2 Hz

export class ActionButton {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {string} options.label
   * @param {string} [options.sublabel]
   * @param {string} [options.icon]
   * @param {Function} options.onClick
   * @param {Function} options.canActivate   - () => boolean, checked à 2 Hz
   * @param {Function} [options.getSublabel] - () => string, dynamic sublabel
   */
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this._wasAvailable = false;
    this._create();
    this._startCheck();
  }

  _create() {
    this.root = document.createElement('button');
    this.root.className = 'action-btn';
    this.root.innerHTML = `
      <span class="action-btn-icon">${this.options.icon || ''}</span>
      <div class="action-btn-text">
        <span class="action-btn-label">${this.options.label}</span>
        <span class="action-btn-sub">${this.options.sublabel || ''}</span>
      </div>
    `;
    this.root.addEventListener('click', () => this._handleClick());

    this.subEl = this.root.querySelector('.action-btn-sub');
    this.container.append(this.root);
  }

  _startCheck() {
    this._interval = setInterval(() => this._check(), CHECK_MS);
    this._check();
  }

  _check() {
    const available = this.options.canActivate ? this.options.canActivate() : true;

    // Mise à jour sublabel dynamique
    if (this.options.getSublabel && this.subEl) {
      this.subEl.textContent = this.options.getSublabel();
    }

    this.root.classList.toggle('disabled', !available);
    this.root.disabled = !available;

    // Pulse une seule fois quand le bouton vient de devenir disponible
    if (available && !this._wasAvailable) {
      this.root.classList.remove('pulse-btn');
      void this.root.offsetWidth;
      this.root.classList.add('pulse-btn');
    }
    this._wasAvailable = available;
  }

  _handleClick() {
    if (this.root.disabled) return;
    if (this.options.onClick) this.options.onClick();
    // Re-check immédiatement après le click (ressource dépensée → peut-être grisé)
    setTimeout(() => this._check(), 50);
  }

  destroy() {
    if (this._interval) clearInterval(this._interval);
    if (this.root) this.root.remove();
  }
}
