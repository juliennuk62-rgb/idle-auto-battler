// EventLog — flux scrollable des derniers événements du jeu, branché sur
// TelemetrySystem.onBroadcast. MVP : formatters pour les types connus,
// slide-in sur nouvelle entrée, cap à 20 entrées visibles.
//
// Pool DOM : on crée un li à chaque nouvelle entrée puis on supprime les
// excédents. Le coût est négligeable à 20 entrées max.

import { formatTime } from './format.js';

const DEFAULT_MAX = 20;

export class EventLog {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.telemetry  - TelemetrySystem singleton
   * @param {Object} [options.formatters] - { [eventType]: (event) => { text, cssClass } }
   * @param {number} [options.maxEntries=20]
   */
  constructor(container, options) {
    this.container = container;
    this.telemetry = options.telemetry;
    this.formatters = options.formatters || {};
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX;

    this._create();
    this._bindTelemetry();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.className = 'event-log';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'event-log-title';
    this.titleEl.innerHTML = `<span>ÉVÉNEMENTS</span><span class="event-log-count">0</span>`;

    this.list = document.createElement('ul');
    this.list.className = 'event-log-list';

    this.root.append(this.titleEl, this.list);
    this.container.append(this.root);
  }

  _bindTelemetry() {
    if (!this.telemetry || typeof this.telemetry.onBroadcast !== 'function') return;
    this._unsubscribe = this.telemetry.onBroadcast((event) => this.push(event));
  }

  /**
   * Ajoute une entrée dans le log. Si aucun formatter n'est défini pour ce
   * type d'event, l'entrée est silencieusement ignorée.
   */
  push(event) {
    const formatter = this.formatters[event.type];
    if (!formatter) return;
    const formatted = formatter(event);
    if (!formatted || !formatted.text) return;

    const li = document.createElement('li');
    li.className = 'event-log-entry';
    if (formatted.cssClass) li.classList.add(formatted.cssClass);

    const timeEl = document.createElement('span');
    timeEl.className = 'event-log-time';
    timeEl.textContent = formatTime();

    const textEl = document.createElement('span');
    textEl.className = 'event-log-text';
    textEl.textContent = formatted.text;

    li.append(timeEl, textEl);
    this.list.prepend(li);

    // Trigger the CSS transition.
    requestAnimationFrame(() => li.classList.add('entered'));

    this._trimOverflow();
    this._updateCount();
  }

  _trimOverflow() {
    while (this.list.children.length > this.maxEntries) {
      this.list.lastElementChild?.remove();
    }
  }

  _updateCount() {
    const countEl = this.titleEl.querySelector('.event-log-count');
    if (countEl) countEl.textContent = String(this.list.children.length);
  }

  clear() {
    this.list.innerHTML = '';
    this._updateCount();
  }

  destroy() {
    if (this._unsubscribe) this._unsubscribe();
    if (this.root) this.root.remove();
  }
}
