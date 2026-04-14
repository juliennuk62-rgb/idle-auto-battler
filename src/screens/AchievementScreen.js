// AchievementScreen — liste des 20 achievements avec progression.

import { AchievementSystem } from '../systems/AchievementSystem.js';
import { attachGuideButton } from '../ui/GuideModal.js';

export class AchievementScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen achiev-screen';
    this._render();
  }

  _render() {
    const all = AchievementSystem.getAll();
    const count = AchievementSystem.getUnlockedCount();

    this.el.innerHTML = `
      <div class="achiev-container">
        <div class="achiev-header">
          <button class="map-back-btn" id="achiev-back">← Menu</button>
          <span class="achiev-title">ACHIEVEMENTS</span>
          <span class="achiev-count">${count}/${all.length}</span>
          <div id="achiev-guide"></div>
        </div>

        <div class="achiev-grid">
          ${all.map(a => {
            const pct = Math.round((a.progress / a.target) * 100);
            const rewardText = a.reward.gold ? `${a.reward.gold} or` : `${a.reward.gems} gemmes`;
            return `
              <div class="achiev-card ${a.unlocked ? 'achiev-unlocked' : ''}">
                <div class="achiev-icon" style="color:${a.tierColor}">${a.icon}</div>
                <div class="achiev-info">
                  <div class="achiev-name">${a.name}</div>
                  <div class="achiev-desc">${a.desc}</div>
                  <div class="achiev-bar"><div class="achiev-bar-fill" style="width:${pct}%;background:${a.tierColor}"></div></div>
                  <div class="achiev-progress">${a.progress}/${a.target} — ${rewardText}</div>
                </div>
                ${a.unlocked ? '<div class="achiev-check">✓</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.el.querySelector('#achiev-back').addEventListener('click', () => this.onNavigate('menu'));
    attachGuideButton(this.el.querySelector('#achiev-guide'), 'menu');
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
