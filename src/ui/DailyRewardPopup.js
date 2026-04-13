// DailyRewardPopup — popup calendrier affichée au login quand une
// récompense quotidienne est disponible. Grille 7×5 avec les 30 jours,
// jours passés cochés, jour courant mis en avant.

import { DailySystem } from '../systems/DailySystem.js';

export class DailyRewardPopup {
  constructor(onClose) {
    this.onClose = onClose || (() => {});
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'daily-popup-overlay';

    const check = DailySystem.checkLogin();
    const calendar = DailySystem.getCalendar();
    const streak = DailySystem.getStreak();

    this.el.innerHTML = `
      <div class="daily-popup">
        <div class="daily-popup-header">
          <span class="daily-popup-title">CONNEXION QUOTIDIENNE</span>
          <span class="daily-popup-streak">Streak : ${streak} jour${streak > 1 ? 's' : ''}</span>
        </div>

        <div class="daily-calendar">
          ${calendar.map(r => {
            let cls = 'daily-day';
            if (r.claimed) cls += ' daily-claimed';
            if (r.current) cls += ' daily-current';
            const isSpecial = r.special ? ' daily-special' : '';
            return `
              <div class="${cls}${isSpecial}">
                <div class="daily-day-num">J${r.day}</div>
                <div class="daily-day-reward">${r.label}</div>
                ${r.claimed ? '<div class="daily-day-check">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div class="daily-popup-actions">
          ${check.canClaim
            ? `<button class="daily-claim-btn" id="daily-claim">RÉCLAMER</button>`
            : `<div class="daily-already-claimed">Déjà réclamé aujourd'hui !</div>`
          }
          <button class="daily-close-btn" id="daily-close">Fermer</button>
        </div>
      </div>
    `;

    // Bind buttons
    this.el.querySelector('#daily-claim')?.addEventListener('click', () => {
      const result = DailySystem.claim();
      if (result) {
        this._showClaimResult(result);
      }
    });

    this.el.querySelector('#daily-close')?.addEventListener('click', () => {
      this.hide();
      this.onClose();
    });
  }

  _showClaimResult(result) {
    const popup = this.el.querySelector('.daily-popup');
    popup.innerHTML = `
      <div class="daily-result">
        <div class="daily-result-title">JOUR ${result.dayNumber}</div>
        <div class="daily-result-reward">${result.label}</div>
        <div class="daily-result-details">
          ${result.gold > 0 ? `<span class="daily-gold">+${result.gold} or</span>` : ''}
          ${result.gems > 0 ? `<span class="daily-gems">+${result.gems} gemmes</span>` : ''}
        </div>
        <div class="daily-result-streak">Streak : ${result.newStreak} jour${result.newStreak > 1 ? 's' : ''}</div>
        <button class="daily-claim-btn" id="daily-ok">OK</button>
      </div>
    `;

    this.el.querySelector('#daily-ok').addEventListener('click', () => {
      this.hide();
      this.onClose();
    });
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
