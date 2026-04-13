// PrestigeModal — interface de prestige. Deux sections :
//   1. Aperçu du gain (fragments, ce qui est perdu/conservé)
//   2. Boutique de bonus permanents (acheter avec les fragments actuels)
// + bouton de confirmation "hold to prestige".
//
// Ouvre via hotkey P ou click bouton Prestige dans l'actions bar.

import { Modal } from './Modal.js';
import { formatNumber } from './format.js';
import { BALANCE } from '../data/balance.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { TelemetrySystem } from '../systems/TelemetrySystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class PrestigeModal {
  /**
   * @param {Object} options
   * @param {Object} options.game - Phaser.Game instance (pour lire maxWave)
   */
  constructor(options) {
    this.game = options.game;
    this.modal = new Modal({
      title: 'PRESTIGE',
      hotkey: 'P',
      width: 700,
      onOpen: () => this._refresh(),
    });
  }

  _refresh() {
    const agg = TelemetrySystem.getAggregates();
    const maxWave = agg?.maxWave ?? 0;
    const fragments = PrestigeSystem.computeFragments(maxWave);
    const currentSoul = ResourceSystem.soulFragments;
    const minWave = BALANCE.prestige.min_wave;
    const canPrestige = maxWave >= minWave;

    const available = PrestigeSystem.getAvailableBonuses();
    const purchased = PrestigeSystem.getPurchasedBonuses();

    const html = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Section gain -->
        <div class="stats-section">
          <div class="stats-section-title">PRESTIGE — RESET</div>
          <div style="display:flex;gap:24px;align-items:center;">
            <div class="stats-kpi">
              <div class="stats-kpi-value">${fragments}</div>
              <div class="stats-kpi-label">♦ fragments à gagner</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-value">${currentSoul}</div>
              <div class="stats-kpi-label">♦ fragments actuels</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-value">${maxWave}</div>
              <div class="stats-kpi-label">vague max atteinte</div>
            </div>
            <div class="stats-kpi">
              <div class="stats-kpi-value">${PrestigeSystem.prestigeCount}</div>
              <div class="stats-kpi-label">prestiges effectués</div>
            </div>
          </div>
          <div style="margin-top:12px;display:flex;gap:24px;font-size:12px;">
            <div>
              <div style="color:var(--damage);font-weight:700;margin-bottom:4px;">PERDU</div>
              <div style="color:var(--text-tertiary)">Or · Gemmes · Équipe · Vague</div>
            </div>
            <div>
              <div style="color:var(--heal);font-weight:700;margin-bottom:4px;">CONSERVÉ</div>
              <div style="color:var(--text-tertiary)">Fragments d'âme · Bonus permanents · Statistiques</div>
            </div>
          </div>
        </div>

        <!-- Section boutique bonus -->
        <div class="stats-section">
          <div class="stats-section-title">BONUS PERMANENTS</div>
          ${purchased.length > 0 ? `
            <div style="margin-bottom:10px;font-size:11px;color:var(--heal);">
              Achetés : ${purchased.map(b => b.name).join(' · ')}
            </div>
          ` : ''}
          <div style="display:flex;flex-direction:column;gap:6px;" id="prestige-shop">
            ${available.length === 0
              ? '<div style="color:var(--text-tertiary);font-size:12px;">Tous les bonus sont débloqués !</div>'
              : available.map(b => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-root);box-shadow:inset 1px 1px 0 #000,inset -1px -1px 0 var(--border-accent);">
                  <div style="flex:1;">
                    <div style="font-weight:700;font-size:13px;">${b.name}</div>
                    <div style="font-size:11px;color:var(--text-tertiary);">${b.desc}</div>
                  </div>
                  <button class="action-btn ${currentSoul >= b.cost ? '' : 'disabled'}"
                          data-buy-bonus="${b.id}" data-cost="${b.cost}"
                          ${currentSoul < b.cost ? 'disabled' : ''}>
                    <span class="action-btn-icon">♦</span>
                    <div class="action-btn-text">
                      <span class="action-btn-label">${b.cost}</span>
                      <span class="action-btn-sub">acheter</span>
                    </div>
                  </button>
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Bouton prestige -->
        <div style="text-align:center;padding:12px 0;">
          ${canPrestige
            ? `<button class="action-btn" id="prestige-confirm" style="background:var(--damage);min-width:240px;justify-content:center;">
                <span class="action-btn-icon">♦</span>
                <div class="action-btn-text">
                  <span class="action-btn-label" style="font-size:14px;">PRESTIGE</span>
                  <span class="action-btn-sub">cliquez pour confirmer</span>
                </div>
              </button>`
            : `<div style="color:var(--text-tertiary);font-size:13px;">
                Prestige disponible à partir de la vague ${minWave} (actuel : ${maxWave})
              </div>`
          }
        </div>
      </div>
    `;

    this.modal.setContent(html);
    this._bindButtons();
  }

  _bindButtons() {
    // Boutons d'achat de bonus
    const shop = this.modal.body.querySelector('#prestige-shop');
    if (shop) {
      shop.querySelectorAll('[data-buy-bonus]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const bonusId = btn.getAttribute('data-buy-bonus');
          const cost = parseInt(btn.getAttribute('data-cost'));
          if (ResourceSystem.soulFragments >= cost) {
            ResourceSystem.spendGems(0); // no-op, just to trigger event
            // Deduct fragments manually (spendSoulFragments n'existe pas encore,
            // on fait via mutation directe + emit)
            ResourceSystem.soulFragments -= cost;
            ResourceSystem._emit('soul_changed', {
              soul: ResourceSystem.soulFragments,
              delta: -cost,
            });
            PrestigeSystem.buyBonus(bonusId);
            this._refresh(); // re-render avec le bonus acheté
          }
        });
      });
    }

    // Bouton prestige confirm — simple click avec fenêtre de confirmation
    const confirmBtn = this.modal.body.querySelector('#prestige-confirm');
    if (confirmBtn) {
      let clickedOnce = false;
      confirmBtn.addEventListener('click', () => {
        if (!clickedOnce) {
          // Premier clic : demande confirmation
          clickedOnce = true;
          confirmBtn.querySelector('.action-btn-sub').textContent = 'cliquez à nouveau pour confirmer !';
          confirmBtn.style.outline = '2px solid var(--gold)';
          setTimeout(() => {
            clickedOnce = false;
            if (confirmBtn.querySelector('.action-btn-sub')) {
              confirmBtn.querySelector('.action-btn-sub').textContent = 'cliquez pour confirmer';
            }
            confirmBtn.style.outline = '';
          }, 3000);
          return;
        }
        // Deuxième clic : exécute le prestige
        this._executePrestige();
      });
    }
  }

  _executePrestige() {
    const agg = TelemetrySystem.getAggregates();
    const maxWave = agg?.maxWave ?? 0;

    // 1. Calcul + enregistrement du prestige
    const result = PrestigeSystem.prestige(maxWave);

    // 2. Ajoute les fragments (ils survivent au reset)
    ResourceSystem.soulFragments += result.fragments;
    ResourceSystem._emit('soul_changed', {
      soul: ResourceSystem.soulFragments,
      delta: result.fragments,
    });

    // 3. Sauvegarde les fragments dans la clé prestige
    // (PrestigeSystem._save() a déjà été appelé par .prestige())
    // On sauvegarde aussi les soulFragments dans une clé dédiée
    try {
      localStorage.setItem(
        'idle_autobattler_soul',
        String(ResourceSystem.soulFragments)
      );
    } catch (e) {}

    // 4. Télémétrie — garde les stats
    TelemetrySystem.onPrestige(false);

    // 5. Efface la save principale (or, team, wave)
    SaveSystem.clear();

    // 6. Reload la page — le jeu redémarre de zéro avec les bonus actifs
    this.modal.close();
    window.location.reload();
  }

  destroy() {
    if (this.modal) this.modal.destroy();
  }
}

