// DungeonUI — Overlay DOM HD par-dessus le canvas Phaser du donjon.
// Tout le texte et les boutons sont en DOM natif → rendu net en toute résolution.
// Le canvas Phaser gère uniquement : grille, sprites, overlays de portée, effets.

import { attachGuideButton } from './GuideModal.js';

export class DungeonUI {
  constructor(parentDiv, callbacks) {
    this.parent = parentDiv;
    this.cb = callbacks;
    this._hoveredFighter = null;

    this.el = document.createElement('div');
    this.el.className = 'dui-overlay';
    this.parent.appendChild(this.el);

    this.el.innerHTML = `
      <div class="dui-top">
        <button class="dui-back-btn" id="dui-back">✕ Quitter</button>
        <div class="dui-guide" id="dui-guide"></div>
        <div class="dui-round" id="dui-round">R1</div>
        <div class="dui-timeline" id="dui-timeline"></div>
      </div>
      <div class="dui-bottom" id="dui-actions"></div>
      <div class="dui-tooltip" id="dui-tooltip" style="display:none;"></div>
    `;

    // Bouton retour menu
    this.el.querySelector('#dui-back').addEventListener('click', () => {
      if (confirm('Quitter le combat ? La progression sera perdue.')) {
        this.cb.onQuit?.();
      }
    });

    attachGuideButton(this.el.querySelector('#dui-guide'), 'dungeons');

    this.timelineEl = this.el.querySelector('#dui-timeline');
    this.actionsEl = this.el.querySelector('#dui-actions');
    this.roundEl = this.el.querySelector('#dui-round');
    this.tooltipEl = this.el.querySelector('#dui-tooltip');
  }

  // ─── Timeline (haut, au-dessus de la grille) ─────────────────────────

  updateTimeline(upcoming, currentFighter, roundNumber) {
    this.roundEl.textContent = `R${roundNumber}`;
    this.timelineEl.innerHTML = '';

    for (const f of upcoming) {
      const isCurrent = f === currentFighter;
      const div = document.createElement('div');
      div.className = `dui-portrait ${isCurrent ? 'dui-portrait-active' : ''} ${f.isPlayer ? 'dui-portrait-ally' : 'dui-portrait-enemy'}`;

      if (f.spriteKey) {
        div.innerHTML = `<img src="assets/sprites/${f.isPlayer ? 'allies' : 'monsters'}/${f.spriteKey}.png"
          class="dui-portrait-img ${f.isPlayer ? '' : 'dui-portrait-flip'}" alt="${f.name}" />`;
      } else {
        div.innerHTML = `<span class="dui-portrait-letter">${f.name.charAt(0)}</span>`;
      }

      div.title = `${f.name} — HP: ${f.hp}/${f.maxHp}`;
      this.timelineEl.appendChild(div);
    }
  }

  // ─── Tooltip hover (remplace le panel latéral) ────────────────────────

  showTooltip(fighter, screenX, screenY) {
    if (!fighter) { this.hideTooltip(); return; }
    this._hoveredFighter = fighter;

    const hpPct = Math.round(fighter.hpPercent() * 100);
    const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#fbbf24' : '#ef4444';

    let spellsHtml = '';
    for (const a of fighter.abilities) {
      const cd = a.currentCooldown > 0 ? `<span class="dui-tt-cd">CD${a.currentCooldown}</span>` : '';
      spellsHtml += `<div class="dui-tt-spell">${a.icon} ${a.name} <span class="dui-tt-cost">${a.paCost}PA</span>${cd}</div>`;
    }

    let statusHtml = '';
    for (const se of fighter.statusEffects) {
      statusHtml += `<span class="dui-tt-status">${se.name} (${se.duration}t)</span>`;
    }

    this.tooltipEl.innerHTML = `
      <div class="dui-tt-name" style="color:${fighter.isPlayer ? '#88ffaa' : '#ff8888'}">${fighter.name}</div>
      <div class="dui-tt-hp">
        <div class="dui-tt-hp-bar"><div class="dui-tt-hp-fill" style="width:${hpPct}%;background:${hpColor}"></div></div>
        <span class="dui-tt-hp-text">${fighter.hp}/${fighter.maxHp}</span>
      </div>
      <div class="dui-tt-stats">
        <span>ATK <b>${fighter.getEffectiveAtk()}</b></span>
        <span>PA <b>${fighter.getEffectivePa()}/${fighter.maxPa}</b></span>
        <span>PM <b>${fighter.getEffectivePm()}/${fighter.maxPm}</b></span>
      </div>
      ${spellsHtml ? `<div class="dui-tt-divider"></div>${spellsHtml}` : ''}
      ${statusHtml ? `<div class="dui-tt-divider"></div><div class="dui-tt-statuses">${statusHtml}</div>` : ''}
    `;

    // Positionne le tooltip près du curseur, sans sortir de l'écran
    const rect = this.el.getBoundingClientRect();
    let x = screenX - rect.left + 15;
    let y = screenY - rect.top - 10;
    // Empêche le débordement à droite/bas
    if (x + 200 > rect.width) x = x - 220;
    if (y + 160 > rect.height) y = y - 170;
    if (x < 0) x = 10;
    if (y < 0) y = 10;

    this.tooltipEl.style.left = x + 'px';
    this.tooltipEl.style.top = y + 'px';
    this.tooltipEl.style.display = 'block';
  }

  hideTooltip() {
    this._hoveredFighter = null;
    this.tooltipEl.style.display = 'none';
  }

  // ─── Actions panel (bas) ──────────────────────────────────────────────

  updateActions(fighter, uiState, selectedAbilityId) {
    this.actionsEl.innerHTML = '';

    if (!fighter || !fighter.isPlayer) {
      this.actionsEl.innerHTML = `<div class="dui-actions-wait">${fighter ? `Tour de ${fighter.name}...` : ''}</div>`;
      return;
    }

    const pa = fighter.getEffectivePa();
    const pm = fighter.getEffectivePm();

    // PA/PM — barres visuelles au lieu de points
    const paPct = Math.round((pa / fighter.maxPa) * 100);
    const pmPct = Math.round((pm / fighter.maxPm) * 100);

    let buttonsHtml = '';

    // Move
    const moveActive = uiState === 'move';
    buttonsHtml += this._buttonHtml('move', '🚶 Déplacer', pm > 0, moveActive);

    // Sorts
    for (const a of fighter.abilities) {
      const canUse = fighter.canUseAbility(a.id);
      const isActive = uiState === 'target' && selectedAbilityId === a.id;
      const cdBadge = a.currentCooldown > 0 ? `<span class="dui-btn-cd">${a.currentCooldown}</span>` : '';
      buttonsHtml += this._buttonHtml(`ability_${a.id}`, `${a.icon} ${a.name}${cdBadge}`, canUse, isActive);
    }

    // Défense + Fin de tour côte à côte
    buttonsHtml += this._buttonHtml('defend', '🛡 Défense', pa > 0, false);
    buttonsHtml += `<button class="dui-btn dui-btn-end" id="dui-end-turn">⏭ Fin de tour</button>`;

    this.actionsEl.innerHTML = `
      <div class="dui-resources">
        <div class="dui-res-item">
          <span class="dui-res-icon dui-res-pa">★</span>
          <div class="dui-res-bar"><div class="dui-res-fill dui-res-fill-pa" style="width:${paPct}%"></div></div>
          <span class="dui-res-text">${pa}/${fighter.maxPa}</span>
          <span class="dui-res-label">PA</span>
        </div>
        <div class="dui-res-item">
          <span class="dui-res-icon dui-res-pm">▲</span>
          <div class="dui-res-bar"><div class="dui-res-fill dui-res-fill-pm" style="width:${pmPct}%"></div></div>
          <span class="dui-res-text">${pm}/${fighter.maxPm}</span>
          <span class="dui-res-label">PM</span>
        </div>
      </div>
      <div class="dui-buttons">${buttonsHtml}</div>
    `;

    // Bind events
    this.actionsEl.querySelector('#dui-end-turn')?.addEventListener('click', () => this.cb.onEndTurn());
    this.actionsEl.querySelectorAll('[data-action="move"]').forEach(btn => btn.addEventListener('click', () => this.cb.onMove()));
    this.actionsEl.querySelectorAll('[data-action="defend"]').forEach(btn => btn.addEventListener('click', () => this.cb.onDefend()));
    this.actionsEl.querySelectorAll('[data-action^="ability_"]').forEach(btn => {
      const abilityId = btn.dataset.action.replace('ability_', '');
      btn.addEventListener('click', () => this.cb.onAbility(abilityId));
    });
  }

  // ─── Pas d'updateInfo() — remplacé par showTooltip() ──────────────────

  updateInfo() {} // no-op, compat

  _buttonHtml(action, label, enabled, active) {
    const cls = `dui-btn ${enabled ? '' : 'dui-btn-disabled'} ${active ? 'dui-btn-active' : ''}`;
    return `<button class="${cls}" data-action="${action}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  }

  destroy() {
    this.el.remove();
  }
}
