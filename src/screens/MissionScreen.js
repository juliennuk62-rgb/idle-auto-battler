// MissionScreen — liste scrollable des missions quotidiennes et hebdomadaires.
// Barres de progression, boutons réclamer, bonus de complétion.

import { MissionSystem } from '../systems/MissionSystem.js';
import { DAILY_BONUS, WEEKLY_BONUS } from '../data/missions.js';
import { attachGuideButton } from '../ui/GuideModal.js';

export class MissionScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen mission-screen';
    this._render();
  }

  _render() {
    const dailies = MissionSystem.getDailies();
    const weeklies = MissionSystem.getWeeklies();
    const dp = MissionSystem.getDailyProgress();
    const wp = MissionSystem.getWeeklyProgress();

    this.el.innerHTML = `
      <div class="mission-container">
        <div class="mission-header">
          <button class="map-back-btn" id="mission-back">← Menu</button>
          <span class="mission-title">MISSIONS</span>
          <div id="mission-guide"></div>
        </div>

        <div class="mission-section">
          <div class="mission-section-header">
            <span class="mission-section-label">Quotidiennes</span>
            <span class="mission-section-progress">${dp.done}/${dp.total}</span>
          </div>

          ${dailies.map(m => this._renderMission(m)).join('')}

          <div class="mission-bonus ${dp.done >= dp.total && !dp.bonusClaimed ? 'mission-bonus-ready' : dp.bonusClaimed ? 'mission-bonus-claimed' : ''}">
            <span>Bonus complétion : ${DAILY_BONUS.label}</span>
            ${dp.done >= dp.total && !dp.bonusClaimed
              ? '<button class="mission-claim-btn" id="claim-daily-bonus">RÉCLAMER</button>'
              : dp.bonusClaimed
                ? '<span class="mission-check">✓</span>'
                : `<span class="mission-locked">${dp.done}/${dp.total}</span>`
            }
          </div>
        </div>

        <div class="mission-section">
          <div class="mission-section-header">
            <span class="mission-section-label">Hebdomadaires</span>
            <span class="mission-section-progress">${wp.done}/${wp.total}</span>
          </div>

          ${weeklies.map(m => this._renderMission(m)).join('')}

          <div class="mission-bonus ${wp.done >= wp.total && !wp.bonusClaimed ? 'mission-bonus-ready' : wp.bonusClaimed ? 'mission-bonus-claimed' : ''}">
            <span>Bonus complétion : ${WEEKLY_BONUS.label}</span>
            ${wp.done >= wp.total && !wp.bonusClaimed
              ? '<button class="mission-claim-btn" id="claim-weekly-bonus">RÉCLAMER</button>'
              : wp.bonusClaimed
                ? '<span class="mission-check">✓</span>'
                : `<span class="mission-locked">${wp.done}/${wp.total}</span>`
            }
          </div>
        </div>
      </div>
    `;

    // Bind events.
    this.el.querySelector('#mission-back').addEventListener('click', () => this.onNavigate('menu'));

    attachGuideButton(this.el.querySelector('#mission-guide'), 'missions');

    this.el.querySelectorAll('.mission-claim-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        MissionSystem.claimMission(id);
        this._render(); // recrée le HTML + rebind tout automatiquement
      });
    });

    this.el.querySelector('#claim-daily-bonus')?.addEventListener('click', () => {
      MissionSystem.claimDailyBonus();
      this._render();
    });

    this.el.querySelector('#claim-weekly-bonus')?.addEventListener('click', () => {
      MissionSystem.claimWeeklyBonus();
      this._render();
    });
  }

  // _rebindBack supprimé — _render() recrée le HTML et les events à chaque fois.

  _renderMission(m) {
    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
    const done = m.progress >= m.target;
    const rewardText = m.reward.gold ? `${m.reward.gold} or` : `${m.reward.gems} gemme${m.reward.gems > 1 ? 's' : ''}`;

    return `
      <div class="mission-item ${m.claimed ? 'mission-done' : done ? 'mission-ready' : ''}">
        <div class="mission-item-info">
          <div class="mission-item-label">${m.label}</div>
          <div class="mission-item-bar">
            <div class="mission-item-bar-fill" style="width:${pct}%;"></div>
          </div>
          <div class="mission-item-progress">${m.progress}/${m.target} — ${rewardText}</div>
        </div>
        <div class="mission-item-action">
          ${m.claimed
            ? '<span class="mission-check">✓</span>'
            : done
              ? `<button class="mission-claim-single mission-claim-btn" data-id="${m.id}">RÉCLAMER</button>`
              : ''
          }
        </div>
      </div>
    `;
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
