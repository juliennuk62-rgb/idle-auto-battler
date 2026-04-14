// EnemyPanel — colonne droite du cockpit. Affiche le monstre courant,
// les 3 prochaines vagues, la récompense anticipée et l'indicateur de
// difficulté. Refresh à 4 Hz via setInterval.

import { formatNumber } from './format.js';
import { BALANCE } from '../data/balance.js';
import { biomeForWave } from '../data/biomes.js';

const REFRESH_MS = 250; // 4 Hz

export class EnemyPanel {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.game       - instance Phaser.Game
   * @param {Object} options.telemetry  - TelemetrySystem singleton
   */
  constructor(container, options) {
    this.container = container;
    this.game = options.game;
    this.telemetry = options.telemetry;
    this._create();
    this._startRefresh();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

    // Titre
    const title = document.createElement('div');
    title.className = 'team-panel-title';
    title.textContent = 'ENNEMI';
    this.root.append(title);

    // Carte ennemi
    this.enemyCard = document.createElement('div');
    this.enemyCard.className = 'unit-card';
    this.enemyCard.innerHTML = `
      <div class="unit-card-header">
        <span class="unit-card-icon">☠</span>
        <div class="unit-card-title">
          <div class="unit-card-name" data-ename>—</div>
          <div class="unit-card-level" data-elevel>—</div>
        </div>
      </div>
      <div class="unit-card-bars">
        <div class="progress-bar" style="height:12px">
          <div class="progress-bar-fill" data-ehp-fill style="background:var(--damage)"></div>
          <div class="progress-bar-label" data-ehp-label>—</div>
        </div>
      </div>
      <div class="unit-card-stats" style="margin-top:6px">
        <div class="unit-card-stat-row">
          <span class="unit-card-stat-label">ATK</span>
          <span class="unit-card-stat-value" data-eatk>—</span>
        </div>
        <div class="unit-card-stat-row">
          <span class="unit-card-stat-label">MENACE</span>
          <span class="unit-card-stat-value" data-ethreat>—</span>
        </div>
      </div>
    `;
    this.root.append(this.enemyCard);

    // Next waves
    const wavesTitle = document.createElement('div');
    wavesTitle.className = 'team-panel-title';
    wavesTitle.textContent = 'PROCHAINES VAGUES';
    this.root.append(wavesTitle);

    this.wavesList = document.createElement('div');
    this.wavesList.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'unit-card-stat-row';
      row.style.cssText =
        'padding:4px 8px;background:var(--bg-root);box-shadow:inset 1px 1px 0 #000,inset -1px -1px 0 var(--border-accent);font-family:var(--font-mono);font-size:11px;';
      row.setAttribute('data-next-wave', '');
      row.innerHTML = '<span>—</span><span>—</span>';
      this.wavesList.append(row);
    }
    this.root.append(this.wavesList);

    // Rewards
    this.rewardEl = document.createElement('div');
    this.rewardEl.style.cssText =
      'font-family:var(--font-mono);font-size:11px;color:var(--gold);padding:0 4px;';
    this.rewardEl.textContent = '—';
    this.root.append(this.rewardEl);

    // Difficulté
    this.difficultyEl = document.createElement('div');
    this.difficultyEl.style.cssText =
      'font-family:var(--font-mono);font-size:13px;font-weight:700;padding:6px 8px;background:var(--bg-root);box-shadow:inset 1px 1px 0 #000,inset -1px -1px 0 var(--border-accent);text-align:center;';
    this.difficultyEl.textContent = '—';
    this.root.append(this.difficultyEl);

    // Cache refs
    this.els = {
      ename: this.enemyCard.querySelector('[data-ename]'),
      elevel: this.enemyCard.querySelector('[data-elevel]'),
      ehpFill: this.enemyCard.querySelector('[data-ehp-fill]'),
      ehpLabel: this.enemyCard.querySelector('[data-ehp-label]'),
      eatk: this.enemyCard.querySelector('[data-eatk]'),
      ethreat: this.enemyCard.querySelector('[data-ethreat]'),
      nextWaves: this.wavesList.querySelectorAll('[data-next-wave]'),
    };

    this.container.append(this.root);
  }

  _startRefresh() {
    this._interval = setInterval(() => this._refresh(), REFRESH_MS);
    this._refresh();
  }

  _refresh() {
    const scene = this.game.scene.getScene('CombatScene');
    if (!scene || !scene.combat) return;
    const combat = scene.combat;
    const wave = combat.currentWave;
    const monster = combat.teamB[0];
    if (!monster) return;

    // Enemy card
    this.els.ename.textContent = monster.name;
    // Affiche la wave relative au biome (1-10) au lieu de la wave globale
    const biomeLocalWave = ((wave - 1) % 10) + 1;
    this.els.elevel.textContent = `Vague ${biomeLocalWave}/10${monster.isBoss ? ' · BOSS' : ''}`;
    this.els.elevel.style.color = monster.isBoss ? 'var(--gold)' : 'var(--text-tertiary)';

    const hpRatio = monster.maxHp > 0 ? Math.max(0, Math.min(1, monster.hp / monster.maxHp)) : 0;
    this.els.ehpFill.style.width = `${hpRatio * 100}%`;
    this.els.ehpFill.classList.toggle('critical', hpRatio > 0 && hpRatio < 0.3);
    this.els.ehpFill.classList.toggle('warning',  hpRatio >= 0.3 && hpRatio < 0.6);
    this.els.ehpLabel.textContent = monster.isAlive
      ? `${Math.round(monster.hp)} / ${Math.round(monster.maxHp)}`
      : 'MORT';
    this.els.eatk.textContent = Math.round(monster.atk);

    // Menace ★
    const threatStars = this._computeThreat(monster, combat.teamA);
    this.els.ethreat.textContent = threatStars.label;
    this.els.ethreat.style.color = threatStars.color;

    // Next waves
    for (let i = 0; i < 3; i++) {
      const nw = wave + i + 1;
      const isBoss = nw % BALANCE.wave.boss_interval === 0;
      const row = this.els.nextWaves[i];
      if (!row) continue;
      const left = row.children[0];
      const right = row.children[1];
      left.textContent = `W${nw}`;
      right.textContent = isBoss ? '★ BOSS' : 'normal';
      right.style.color = isBoss ? 'var(--gold)' : 'var(--text-tertiary)';
      left.style.color = isBoss ? 'var(--gold)' : 'var(--text-secondary)';
    }

    // Reward anticipée
    const goldCfg = BALANCE.gold;
    const waveIdx = Math.max(0, wave - 1);
    let gold = goldCfg.per_kill_base * Math.pow(goldCfg.growth, waveIdx);
    const isBoss = wave % BALANCE.wave.boss_interval === 0;
    if (isBoss) gold *= goldCfg.boss_mult;
    this.rewardEl.textContent = `Reward : +${formatNumber(Math.round(gold))}◆${isBoss ? ' +1◇' : ''}`;

    // Difficulté
    const diff = this._computeDifficulty(monster, combat.teamA, wave);
    this.difficultyEl.textContent = diff.label;
    this.difficultyEl.style.color = diff.color;
  }

  _computeThreat(monster, teamA) {
    // Menace relative : ratio HP monstre / DPS total de l'équipe
    const teamDps = teamA.reduce((sum, f) => {
      if (!f.isAlive) return sum;
      return sum + f.atk / f.atkSpeed;
    }, 0);
    if (teamDps <= 0) return { label: '★★★★★', color: 'var(--damage)' };
    const timeToKill = monster.maxHp / teamDps;
    if (timeToKill > 15) return { label: '★★★★★', color: 'var(--damage)' };
    if (timeToKill > 8) return { label: '★★★★', color: 'var(--legendary)' };
    if (timeToKill > 4) return { label: '★★★', color: 'var(--gold)' };
    if (timeToKill > 2) return { label: '★★', color: 'var(--text-secondary)' };
    return { label: '★', color: 'var(--text-tertiary)' };
  }

  _computeDifficulty(monster, teamA, wave) {
    const teamDps = teamA.reduce((sum, f) => {
      if (!f.isAlive) return sum;
      return sum + f.atk / f.atkSpeed;
    }, 0);
    const teamHp = teamA.reduce((sum, f) => sum + f.maxHp, 0);
    const monsterDps = monster.atk / monster.atkSpeed;
    const dpsRatio = teamDps > 0 ? teamDps / Math.max(1, monster.maxHp / 5) : 0;
    const tankRatio = teamHp > 0 && monsterDps > 0 ? teamHp / (monsterDps * 5) : 999;
    const overall = Math.min(dpsRatio, tankRatio);

    if (overall > 1.5) return { label: '🟢 Facile', color: 'var(--heal)' };
    if (overall > 0.8) return { label: '🟡 Tendu', color: 'var(--gold)' };
    return { label: '🔴 Danger', color: 'var(--damage)' };
  }

  destroy() {
    if (this._interval) clearInterval(this._interval);
    if (this.root) this.root.remove();
  }
}
