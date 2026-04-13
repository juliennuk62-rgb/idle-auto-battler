// Overlay debug de télémétrie. Toggle par F9.
// - Coin supérieur droit, fond noir semi-transparent, texte monospace blanc.
// - Mise à jour à 5 Hz (suffit pour du texte, pas la peine de spammer à 60fps).
// - Lit exclusivement via l'API publique de TelemetrySystem +
//   scene.combat.teamA/teamB pour l'affichage des HP en direct.
// - Bouton "Export JSON" → télécharge un fichier via Blob + ancre DOM.
// - N'absorbe aucun input du jeu : Phaser keyboard events ne bloquent rien,
//   et le pointer est interactif uniquement sur le bouton.

import { TelemetrySystem } from '../systems/TelemetrySystem.js';

export class TelemetryOverlay {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this._create();
    this._bindKeys();
    this._startUpdates();
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  _create() {
    const W = 280;
    const H = 280;
    const x = 800 - W - 10;
    const y = 10;

    this.container = this.scene.add.container(x, y);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    this.bg = this.scene.add
      .rectangle(0, 0, W, H, 0x000000, 0.78)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x444444);

    this.title = this.scene.add.text(10, 8, 'TELEMETRY  [F9 toggle]', {
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: '12px',
      color: '#60a5fa',
      fontStyle: 'bold',
    });

    this.body = this.scene.add.text(10, 28, '', {
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: '10px',
      color: '#ffffff',
      lineSpacing: 2,
    });

    this.exportBtn = this.scene.add.text(10, H - 26, '[ Export JSON ]', {
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: '11px',
      color: '#60a5fa',
      backgroundColor: '#1a1a2e',
      padding: { x: 6, y: 3 },
    });
    this.exportBtn.setInteractive({ useHandCursor: true });
    this.exportBtn.on('pointerover', () => this.exportBtn.setColor('#93c5fd'));
    this.exportBtn.on('pointerout', () => this.exportBtn.setColor('#60a5fa'));
    this.exportBtn.on('pointerdown', () => this._download());

    this.container.add([this.bg, this.title, this.body, this.exportBtn]);
  }

  _bindKeys() {
    this.scene.input.keyboard.on('keydown-F9', () => this.toggle());
  }

  _startUpdates() {
    this.updateTimer = this.scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => this._render(),
    });
  }

  // ---------------------------------------------------------------------------
  // Toggle
  // ---------------------------------------------------------------------------

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    if (this.visible) this._render();
  }

  // ---------------------------------------------------------------------------
  // Rendu texte
  // ---------------------------------------------------------------------------

  _render() {
    if (!this.visible) return;

    const agg = TelemetrySystem.getAggregates();
    if (!agg) {
      this.body.setText('(télémétrie désactivée)');
      return;
    }

    const current = TelemetrySystem.getCurrentCombatStats();
    const combat = this.scene.combat;
    const lines = [];

    // --- Combat courant ---
    if (current && combat) {
      const seconds = (current.duration / 1000).toFixed(1);
      lines.push(`Wave ${current.waveId}   (max ${agg.maxWave})   ${seconds}s`);
      lines.push('');

      lines.push('-- DPS --');
      const allUnits = [...combat.teamA, ...combat.teamB];
      for (const f of allUnits) {
        const dps = current.dpsByUnit[f.id] || 0;
        lines.push(`  ${f.id.padEnd(3)} ${this._shortName(f.name).padEnd(10)} ${dps.toFixed(1).padStart(6)}`);
      }
      lines.push('');

      lines.push('-- HP --');
      for (const f of allUnits) {
        const mark = f.isAlive ? ' ' : '†';
        const hpStr = `${f.hp}/${f.maxHp}`;
        lines.push(`  ${mark} ${this._shortName(f.name).padEnd(10)} ${hpStr.padStart(7)}`);
      }
      lines.push('');
    } else {
      lines.push('(no active combat)');
      lines.push('');
    }

    // --- Cumul session ---
    lines.push('-- Session --');
    lines.push(`Combats: ${agg.combatsPlayed}   MaxWave: ${agg.maxWave}`);
    const wDmg = agg.damageDealtByClass.warrior || 0;
    const mDmg = agg.damageDealtByClass.monster || 0;
    lines.push(`DmgDealt  w:${wDmg}  m:${mDmg}`);

    this.body.setText(lines.join('\n'));
  }

  _shortName(name) {
    // "Guerrier 1" → "Guerr.1", "Monstre" → "Monstre"
    if (!name) return '?';
    if (name.length <= 10) return name;
    return name.slice(0, 7) + '.' + (name.match(/\d+$/)?.[0] ?? '');
  }

  // ---------------------------------------------------------------------------
  // Export JSON
  // ---------------------------------------------------------------------------

  _download() {
    const json = TelemetrySystem.exportJSON();
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
    if (this.updateTimer) this.updateTimer.remove();
    this.container.destroy();
  }
}
