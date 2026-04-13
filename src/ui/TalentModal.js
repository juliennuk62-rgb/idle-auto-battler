// TalentModal — arbre de talents interactif pour un fighter sélectionné.
// 3 colonnes (branches), 3 lignes (tiers), nœuds cliquables.

import { Modal } from './Modal.js';
import { TalentSystem } from '../systems/TalentSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { getTalentTree, tierCost } from '../data/talents.js';

export class TalentModal {
  constructor(options = {}) {
    this.game = options.game;
    this.selectedFighter = null;

    this.modal = new Modal({
      title: 'TALENTS',
      hotkey: 'T',
      width: 750,
      onOpen: () => this._refresh(),
    });
  }

  selectFighter(fighter) {
    this.selectedFighter = fighter;
    if (this.modal.isOpen) this._refresh();
  }

  _getFighters() {
    const scene = this.game?.scene?.getScene('CombatScene');
    return scene?.combat?.teamA || [];
  }

  _refresh() {
    const fighters = this._getFighters();
    const f = this.selectedFighter || fighters[0];
    if (!f) {
      this.modal.setContent('<p style="color:var(--text-tertiary)">Aucun allié. Lancez un combat d\'abord.</p>');
      return;
    }

    const tree = getTalentTree(f.class);
    if (!tree) {
      this.modal.setContent('<p style="color:var(--text-tertiary)">Pas d\'arbre de talents pour cette classe.</p>');
      return;
    }

    const available = TalentSystem.availablePoints(f);
    const spent = TalentSystem.spentPoints(f.id);
    const total = TalentSystem.totalPoints(f);

    const html = `
      <div class="talent-header">
        <div class="talent-fighter-select">
          ${fighters.map(fi => `
            <button class="talent-fighter-btn ${fi.id === f.id ? 'active' : ''}" data-fid="${fi.id}">
              ${fi._labelText ? fi._labelText() : fi.name}
            </button>
          `).join('')}
        </div>
        <div class="talent-points">
          <span style="color:var(--gold);font-weight:700;">${available}</span>
          <span style="color:var(--text-tertiary)"> / ${total} points</span>
          <span style="color:var(--text-tertiary);margin-left:8px;">(${spent} dépensés)</span>
        </div>
      </div>

      <div class="talent-tree">
        ${tree.branches.map(branch => this._renderBranch(branch, f)).join('')}
      </div>

      <div class="talent-footer">
        <button class="action-btn admin-btn" id="talent-reset">Reset talents (5 ◇)</button>
      </div>
    `;

    this.modal.setContent(html);
    this._bindEvents(f, fighters);
  }

  _renderBranch(branch, fighter) {
    const alloc = TalentSystem.getAllocated(fighter.id);

    return `
      <div class="talent-branch" style="--branch-color:${branch.color}">
        <div class="talent-branch-header">
          <span>${branch.icon}</span>
          <span>${branch.name.toUpperCase()}</span>
        </div>
        ${branch.tiers.map((tier, i) => {
          const bought = alloc.includes(tier.id);
          const canBuy = TalentSystem.canBuy(fighter, tier.id);
          const cost = tierCost(i + 1);
          const state = bought ? 'bought' : canBuy ? 'available' : 'locked';

          return `
            <div class="talent-node ${state}" data-talent="${tier.id}" title="${tier.desc || tier.name}">
              <div class="talent-node-cost">${cost} pt${cost > 1 ? 's' : ''}</div>
              <div class="talent-node-name">${tier.name}</div>
              ${bought ? '<div class="talent-node-check">✓</div>' : ''}
              ${state === 'locked' ? '<div class="talent-node-lock">🔒</div>' : ''}
            </div>
            ${i < branch.tiers.length - 1 ? '<div class="talent-connector"></div>' : ''}
          `;
        }).join('')}
      </div>
    `;
  }

  _bindEvents(fighter, fighters) {
    const body = this.modal.body;

    // Sélection de fighter.
    body.querySelectorAll('[data-fid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fi = fighters.find(f => f.id === btn.dataset.fid);
        if (fi) { this.selectedFighter = fi; this._refresh(); }
      });
    });

    // Achat de talent.
    body.querySelectorAll('.talent-node.available').forEach(node => {
      node.addEventListener('click', () => {
        const talentId = node.dataset.talent;
        if (TalentSystem.buy(fighter, talentId)) {
          fighter._recomputeStats();
          this._refresh();
        }
      });
    });

    // Reset.
    body.querySelector('#talent-reset')?.addEventListener('click', () => {
      if (ResourceSystem.gems < 5) {
        alert('Il vous faut 5 gemmes pour reset les talents.');
        return;
      }
      if (!confirm('Reset tous les talents de cette unité pour 5 ◇ ?')) return;
      ResourceSystem.spendGems(5);
      TalentSystem.reset(fighter.id);
      fighter._recomputeStats();
      this._refresh();
    });
  }

  destroy() {
    if (this.modal) this.modal.destroy();
  }
}
