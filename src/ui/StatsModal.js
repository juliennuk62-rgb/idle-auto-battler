// StatsModal — dashboard analytics tiré de TelemetrySystem.getAggregates().
// Ouvrable via hotkey S ou click depuis le top bar.
// Le contenu est recalculé à chaque ouverture (pas de poll interne).

import { Modal } from './Modal.js';
import { formatNumber, formatDuration } from './format.js';

export class StatsModal {
  /**
   * @param {Object} options
   * @param {Object} options.telemetry - TelemetrySystem singleton
   */
  constructor(options) {
    this.telemetry = options.telemetry;

    this.modal = new Modal({
      title: 'STATISTIQUES',
      hotkey: 'S',
      width: 800,
      onOpen: () => this._refresh(),
    });
  }

  _refresh() {
    const agg = this.telemetry.getAggregates();
    if (!agg) {
      this.modal.setContent('<p style="color:var(--text-tertiary)">Télémétrie désactivée.</p>');
      return;
    }

    const html = `
      <div class="stats-grid">
        ${this._kpiSection(agg)}
        ${this._classDamageSection(agg)}
        ${this._unitSection(agg)}
        ${this._waveDurationSection(agg)}
      </div>
      <div style="margin-top:16px;text-align:right">
        <button class="action-btn" id="stats-export">
          <span class="action-btn-icon">📥</span>
          <div class="action-btn-text"><span class="action-btn-label">Exporter JSON</span></div>
        </button>
      </div>
    `;
    this.modal.setContent(html);

    // Wire export button
    const exportBtn = this.modal.body.querySelector('#stats-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this._exportJSON());
    }
  }

  _kpiSection(agg) {
    return `
      <div class="stats-section">
        <div class="stats-section-title">VUE D'ENSEMBLE</div>
        <div class="stats-kpi-grid">
          ${this._kpi('Combats', agg.combatsPlayed)}
          ${this._kpi('Max Wave', agg.maxWave)}
          ${this._kpi('Or total', formatNumber(agg.totalGold))}
          ${this._kpi('Or/min', formatNumber(Math.round(agg.goldPerMinute)))}
          ${this._kpi('Durée totale', formatDuration(agg.totalDuration))}
          ${this._kpi('Durée moy./combat', formatDuration(agg.combatsPlayed > 0 ? agg.totalDuration / agg.combatsPlayed : 0))}
        </div>
      </div>
    `;
  }

  _kpi(label, value) {
    return `
      <div class="stats-kpi">
        <div class="stats-kpi-value">${value}</div>
        <div class="stats-kpi-label">${label}</div>
      </div>
    `;
  }

  _classDamageSection(agg) {
    const classes = new Set([
      ...Object.keys(agg.damageDealtByClass),
      ...Object.keys(agg.damageTakenByClass),
    ]);
    const rows = [...classes]
      .map(
        (cls) => `
        <tr>
          <td>${cls}</td>
          <td style="color:var(--damage)">${formatNumber(agg.damageDealtByClass[cls] || 0)}</td>
          <td style="color:var(--critical)">${formatNumber(agg.damageTakenByClass[cls] || 0)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div class="stats-section">
        <div class="stats-section-title">DÉGÂTS PAR CLASSE</div>
        <table class="stats-table">
          <thead><tr><th>Classe</th><th>Infligés</th><th>Subis</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3">—</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  _unitSection(agg) {
    const entries = Object.entries(agg.unitStats);
    if (entries.length === 0) return '';

    const rows = entries
      .sort((a, b) => (b[1].damageDealt || 0) - (a[1].damageDealt || 0))
      .map(
        ([id, s]) => `
        <tr>
          <td>${id}</td>
          <td>${formatNumber(s.damageDealt)}</td>
          <td>${formatNumber(s.damageTaken)}</td>
          <td>${s.combats}</td>
          <td>${s.deaths}</td>
          <td>${s.combats > 0 ? Math.round((s.survivals / s.combats) * 100) : 0}%</td>
        </tr>
      `
      )
      .join('');

    return `
      <div class="stats-section">
        <div class="stats-section-title">PAR UNITÉ (trié par dégâts)</div>
        <table class="stats-table">
          <thead><tr><th>ID</th><th>Dmg infligé</th><th>Dmg subi</th><th>Combats</th><th>Morts</th><th>Survie</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  _waveDurationSection(agg) {
    const entries = Object.entries(agg.avgDurationByWave);
    if (entries.length === 0) return '';

    const rows = entries
      .slice(-10) // 10 dernières waves
      .map(
        ([wave, ms]) => `
        <tr>
          <td>W${wave}</td>
          <td>${formatDuration(ms)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div class="stats-section">
        <div class="stats-section-title">DURÉE MOY. PAR VAGUE (10 dernières)</div>
        <table class="stats-table">
          <thead><tr><th>Vague</th><th>Durée moy.</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  _exportJSON() {
    const json = this.telemetry.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  destroy() {
    if (this.modal) this.modal.destroy();
  }
}
