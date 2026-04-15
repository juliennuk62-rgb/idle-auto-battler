// SynergyBadges — affiche les synergies actives de l'équipe pendant le combat.
//
// Résout le "dark pattern involontaire" identifié par l'UX Designer :
// les synergies sont calculées et appliquées, mais ne sont visibles que 2s
// dans la bannière d'ouverture. Avec ce widget, elles sont visibles en permanence.

export class SynergyBadges {
  /**
   * @param {HTMLElement} container — où monter le widget
   * @param {Object} options
   * @param {Object} options.combat — instance CombatSystem avec _activeSynergies
   */
  constructor(container, options) {
    this.container = container;
    this.combat = options.combat;

    this._create();
    this._render();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.className = 'synergy-badges';
    this.container.appendChild(this.root);
  }

  _render() {
    const active = this.combat?._activeSynergies || [];

    if (active.length === 0) {
      this.root.innerHTML = `
        <div class="synergy-badges-title">Synergies actives</div>
        <div class="synergy-badges-empty">Aucune synergie — varie tes classes !</div>
      `;
      return;
    }

    this.root.innerHTML = `
      <div class="synergy-badges-title">Synergies actives (${active.length})</div>
      <div class="synergy-badges-list">
        ${active.map(syn => `
          <div class="synergy-badge" title="${this._escape(syn.desc)}">
            <span class="synergy-badge-icon">${syn.icon}</span>
            <span class="synergy-badge-label">${this._escape(syn.label)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /** Appelé depuis Cockpit quand la team change (fusion, mort). */
  refresh() {
    this._render();
  }

  _escape(s) {
    return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  destroy() {
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }
}
