// ResourceCounter — affiche une valeur de ressource depuis ResourceSystem
// avec tween incrémental au changement et pulse aux paliers.
//
// S'abonne via les events du singleton ResourceSystem — aucun polling.

import { formatNumber } from './format.js';

export class ResourceCounter {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.source       - instance ResourceSystem (singleton)
   * @param {string} options.sourceKey    - 'gold' | 'gems' | 'soulFragments'
   * @param {string} options.icon         - caractère unicode ou texte icône
   * @param {string} options.color        - couleur CSS (ou var CSS)
   * @param {number} [options.tween=500]  - durée du tween incrémental en ms
   * @param {number[]} [options.milestones=[]] - seuils qui déclenchent un pulse
   * @param {string} [options.title]      - tooltip natif (title attribute)
   */
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.tweenDuration = options.tween ?? 500;
    this.milestones = options.milestones ?? [];

    this.displayValue = 0;
    this.targetValue = 0;
    this._rafId = null;

    this._create();
    this._bindEvents();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.className = 'resource-counter';
    if (this.options.title) this.root.title = this.options.title;

    this.iconEl = document.createElement('span');
    this.iconEl.className = 'resource-icon';
    this.iconEl.textContent = this.options.icon || '◆';
    this.iconEl.style.color = this.options.color || 'var(--gold)';

    this.valueEl = document.createElement('span');
    this.valueEl.className = 'resource-value';
    this.valueEl.textContent = '0';

    this.root.append(this.iconEl, this.valueEl);
    this.container.append(this.root);
  }

  _bindEvents() {
    const { source, sourceKey } = this.options;
    if (!source || !sourceKey) return;

    // Le ResourceSystem émet '{key}_changed' avec payload { [key]: value, delta }
    const eventName = `${sourceKey === 'soulFragments' ? 'soul' : sourceKey}_changed`;
    const payloadKey = sourceKey === 'soulFragments' ? 'soul' : sourceKey;

    this._handler = (data) => {
      const nextValue = data[payloadKey];
      if (typeof nextValue === 'number') this.setValue(nextValue);
    };
    source.on(eventName, this._handler);
    this._eventName = eventName;

    // Valeur initiale — depuis la prop directe du singleton.
    const initial = source[sourceKey];
    if (typeof initial === 'number') this.setValue(initial, /*animated*/ false);
  }

  setValue(newValue, animated = true) {
    if (!Number.isFinite(newValue)) return;
    if (!animated) {
      this.displayValue = newValue;
      this.targetValue = newValue;
      this._render();
      return;
    }
    const oldValue = this.displayValue;
    this.targetValue = newValue;
    this._startTween();
    // Les paliers sont vérifiés une fois le tween lancé — on utilise
    // la valeur finale pour détecter un franchissement.
    this._checkMilestones(oldValue, newValue);
  }

  _startTween() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    const start = this.displayValue;
    const end = this.targetValue;
    const duration = this.tweenDuration;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // ease-out quad
      const eased = 1 - Math.pow(1 - t, 2);
      this.displayValue = start + (end - start) * eased;
      this._render();
      if (t < 1) {
        this._rafId = requestAnimationFrame(tick);
      } else {
        this.displayValue = end;
        this._render();
        this._rafId = null;
      }
    };

    this._rafId = requestAnimationFrame(tick);
  }

  _render() {
    this.valueEl.textContent = formatNumber(Math.round(this.displayValue));
  }

  _checkMilestones(oldVal, newVal) {
    if (newVal <= oldVal) return;
    for (const m of this.milestones) {
      if (oldVal < m && newVal >= m) {
        this._pulse();
        break;
      }
    }
  }

  _pulse() {
    this.valueEl.classList.remove('pulse');
    // Force reflow pour redémarrer l'animation CSS.
    void this.valueEl.offsetWidth;
    this.valueEl.classList.add('pulse');
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.options.source && this._eventName) {
      this.options.source.off(this._eventName, this._handler);
    }
    if (this.root) this.root.remove();
  }
}
