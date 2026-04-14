// LeaderboardModal — écran de classement hebdomadaire.
// Onglets par catégorie à gauche, podium + top 10 à droite.
// Lit depuis LeaderboardSystem.fetchTop(categoryId).

import { Modal } from './Modal.js';
import { LeaderboardSystem, LB_CATEGORIES } from '../systems/LeaderboardSystem.js';
import { AuthSystem } from '../systems/AuthSystem.js';
import { formatNumber } from './format.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export class LeaderboardModal {
  constructor() {
    this._currentCategory = LB_CATEGORIES[0].id;

    this.modal = new Modal({
      title: 'CLASSEMENT HEBDOMADAIRE',
      width: 900,
      onOpen: () => this._render(),
    });
  }

  open() { this.modal.open(); }

  async _render() {
    const weekId = LeaderboardSystem.getWeekId() || '—';
    const [y, w] = (weekId || '').split('-W');
    const headerLabel = y && w ? `Semaine ${parseInt(w, 10)} · ${y}` : weekId;

    this.modal.setContent(`
      <div class="lb-header">
        <div class="lb-week">${headerLabel}</div>
        <div class="lb-reset-info">Reset automatique chaque lundi (heure locale)</div>
      </div>
      <div class="lb-layout">
        <div class="lb-tabs" id="lb-tabs">
          ${LB_CATEGORIES.map(cat => `
            <button class="lb-tab ${cat.id === this._currentCategory ? 'lb-tab-active' : ''}"
                    data-cat="${cat.id}">
              <span class="lb-tab-icon">${cat.icon}</span>
              <span class="lb-tab-text">
                <span class="lb-tab-label">${cat.label}</span>
                <span class="lb-tab-score">Votre score : <strong>${formatNumber(LeaderboardSystem.getLocalScore(cat.id))}</strong></span>
              </span>
            </button>
          `).join('')}
        </div>
        <div class="lb-panel" id="lb-panel">
          <div class="lb-loading">Chargement…</div>
        </div>
      </div>
    `);

    // Bind clicks sur tabs
    this.modal.body.querySelectorAll('.lb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentCategory = btn.dataset.cat;
        this._render();
      });
    });

    // Fetch & render panel
    await this._renderPanel();
  }

  async _renderPanel() {
    const cat = LB_CATEGORIES.find(c => c.id === this._currentCategory);
    const panel = this.modal.body.querySelector('#lb-panel');
    if (!panel || !cat) return;

    const rows = await LeaderboardSystem.fetchTop(cat.id, 10);
    const myUid = AuthSystem.user?.uid || null;
    const myRankInfo = await LeaderboardSystem.fetchMyRank(cat.id);

    if (rows.length === 0) {
      panel.innerHTML = `
        <div class="lb-panel-header">
          <div class="lb-panel-icon">${cat.icon}</div>
          <div class="lb-panel-titles">
            <div class="lb-panel-title">${cat.label}</div>
            <div class="lb-panel-desc">${cat.desc}</div>
          </div>
        </div>
        <div class="lb-empty">
          Aucune donnée cette semaine pour le moment.<br/>
          <small>Joue quelques combats et reviens voir.</small>
        </div>
      `;
      return;
    }

    const myRow = myUid ? rows.find(r => r.userId === myUid) : null;
    const inTop = !!myRow;

    panel.innerHTML = `
      <div class="lb-panel-header">
        <div class="lb-panel-icon">${cat.icon}</div>
        <div class="lb-panel-titles">
          <div class="lb-panel-title">${cat.label}</div>
          <div class="lb-panel-desc">${cat.desc}</div>
        </div>
      </div>

      <div class="lb-rows">
        ${rows.map((r, i) => this._renderRow(r, i, myUid)).join('')}
      </div>

      ${!inTop && myRankInfo ? `
        <div class="lb-my-rank">
          Hors top 10 · Votre rang : <strong>#${myRankInfo.rank}</strong> sur ${myRankInfo.total}
        </div>` : ''}
      ${!inTop && !myRankInfo ? `
        <div class="lb-my-rank">
          Vous n'apparaissez pas encore dans ce classement.
        </div>` : ''}
    `;
  }

  _renderRow(r, i, myUid) {
    const isMe = r.userId === myUid;
    const medal = i < 3 ? MEDALS[i] : '';
    const rankCls = i < 3 ? `lb-row-podium lb-row-rank${i + 1}` : '';
    return `
      <div class="lb-row ${rankCls} ${isMe ? 'lb-row-me' : ''}">
        <div class="lb-row-rank">${medal || `#${i + 1}`}</div>
        <div class="lb-row-name">${this._escape(r.displayName || 'Anonyme')}${isMe ? ' <span class="lb-row-me-tag">(vous)</span>' : ''}</div>
        <div class="lb-row-score">${formatNumber(r.score || 0)}</div>
      </div>
    `;
  }

  _escape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
