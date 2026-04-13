// Sparkline — mini-graphe temporel SVG. Shift à chaque push(), fill
// semi-transparent sous la ligne. Passe en rouge si la valeur chute
// brutalement (warningThreshold).

export class Sparkline {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {number} [options.width=120]
   * @param {number} [options.height=28]
   * @param {number} [options.points=30]        - taille de la fenêtre glissante
   * @param {string} [options.color='var(--gold)']
   * @param {string} [options.warningColor='var(--damage)']
   * @param {string} [options.label]            - texte affiché à gauche du graphe
   */
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width ?? 120;
    this.height = options.height ?? 28;
    this.maxPoints = options.points ?? 30;
    this.color = options.color ?? 'var(--gold)';
    this.warningColor = options.warningColor ?? 'var(--damage)';
    this.label = options.label ?? '';

    this.values = [];
    this._create();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';

    if (this.label) {
      this.labelEl = document.createElement('span');
      this.labelEl.style.cssText =
        'font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);white-space:nowrap;';
      this.labelEl.textContent = this.label;
      this.root.append(this.labelEl);
    }

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.svg.style.cssText = 'display:block;';

    // Fill area (polygon) sous la ligne
    this.fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    this.fillPath.setAttribute('fill', this.color);
    this.fillPath.setAttribute('opacity', '0.2');

    // Ligne principale
    this.linePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    this.linePath.setAttribute('fill', 'none');
    this.linePath.setAttribute('stroke', this.color);
    this.linePath.setAttribute('stroke-width', '1.5');
    this.linePath.setAttribute('stroke-linejoin', 'round');

    this.svg.append(this.fillPath, this.linePath);
    this.root.append(this.svg);
    this.container.append(this.root);
  }

  /**
   * Ajoute une valeur au bout de la fenêtre glissante et redessine.
   */
  push(value) {
    this.values.push(value);
    while (this.values.length > this.maxPoints) this.values.shift();
    this._render();
  }

  setLabel(text) {
    if (this.labelEl) this.labelEl.textContent = text;
  }

  _render() {
    const vals = this.values;
    if (vals.length < 2) return;

    const w = this.width;
    const h = this.height;
    const max = Math.max(...vals, 1); // évite division par 0
    const step = w / (this.maxPoints - 1);

    const points = vals.map((v, i) => {
      const x = (i + (this.maxPoints - vals.length)) * step;
      const y = h - (v / max) * (h - 4) - 2; // 2px margin top/bottom
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Ligne
    this.linePath.setAttribute('points', points.join(' '));

    // Fill : même points + bottom-right et bottom-left pour fermer le polygone
    const lastX = ((vals.length - 1) + (this.maxPoints - vals.length)) * step;
    const firstX = (this.maxPoints - vals.length) * step;
    const fillPoints = points.join(' ') + ` ${lastX.toFixed(1)},${h} ${firstX.toFixed(1)},${h}`;
    this.fillPath.setAttribute('points', fillPoints);

    // Couleur warning si la dernière valeur est < 50% de la moyenne
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const last = vals[vals.length - 1];
    const isWarning = last < avg * 0.5 && avg > 0;
    const color = isWarning ? this.warningColor : this.color;
    this.linePath.setAttribute('stroke', color);
    this.fillPath.setAttribute('fill', color);
  }

  clear() {
    this.values = [];
    this.linePath.setAttribute('points', '');
    this.fillPath.setAttribute('points', '');
  }

  destroy() {
    if (this.root) this.root.remove();
  }
}
