// UnitCard — représentation DOM d'un Fighter dans la colonne gauche.
// MVP : header (icône classe + nom grade + niveau), sprite placeholder,
// stats ATK / DPS / kills, HP bar, XP bar. Refresh à 10 Hz via setInterval.
//
// Pas encore : lag bar double, hover étendu, sprite animé, delta stats.

import { xpToNextLevel } from '../systems/Progression.js';
import { gradeName } from '../data/grades.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { renderItemIcon } from '../data/item-icons.js';

const CLASS_ICONS = {
  warrior: '⚔',
  archer: '🏹',
  mage: '✦',
  healer: '✚',
  monster: '☠',
};

// Mapping spriteKey → URL du fichier pour afficher dans le DOM (img).
const SPRITE_URLS = {
  warrior: 'assets/sprites/allies/warrior.png',
  archer: 'assets/sprites/allies/archer.png',
  mage: 'assets/sprites/allies/mage.png',
  healer: 'assets/sprites/allies/healer.png',
};

const REFRESH_MS = 100; // 10 Hz suffit pour HP/XP/stats

export class UnitCard {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Object} options.fighter    - instance Fighter (référence vivante)
   * @param {Object} [options.telemetry] - TelemetrySystem pour le DPS live
   */
  constructor(container, options) {
    this.container = container;
    this.fighter = options.fighter;
    this.telemetry = options.telemetry;
    this._create();
    this._startRefresh();
  }

  _create() {
    this.root = document.createElement('div');
    this.root.className = 'unit-card';
    this.root.innerHTML = `
      <div class="unit-card-header">
        <span class="unit-card-icon"></span>
        <div class="unit-card-title">
          <div class="unit-card-name"></div>
          <div class="unit-card-level"></div>
        </div>
      </div>
      <div class="unit-card-body">
        <div class="unit-card-sprite"></div>
        <div class="unit-card-stats">
          <div class="unit-card-stat-row">
            <span class="unit-card-stat-label">ATK</span>
            <span class="unit-card-stat-value" data-stat="atk">—</span>
          </div>
          <div class="unit-card-stat-row">
            <span class="unit-card-stat-label">DPS</span>
            <span class="unit-card-stat-value" data-stat="dps">—</span>
          </div>
          <div class="unit-card-stat-row">
            <span class="unit-card-stat-label">Kills</span>
            <span class="unit-card-stat-value" data-stat="kills">0</span>
          </div>
        </div>
      </div>
      <div class="unit-card-bars">
        <div class="progress-bar" data-bar="hp">
          <div class="progress-bar-lag"></div>
          <div class="progress-bar-fill"></div>
          <div class="progress-bar-label"></div>
        </div>
        <div class="progress-bar progress-bar-xp" data-bar="xp">
          <div class="progress-bar-fill"></div>
        </div>
      </div>
      <div class="unit-card-ult" data-ult>
        <div class="ult-gauge" title="Jauge ultime — auto quand pleine">
          <div class="ult-gauge-fill" data-ult-fill></div>
        </div>
      </div>
      <div class="unit-card-equip">
        <div class="equip-slot" data-slot="weapon" title="Arme">
          <span class="equip-slot-label">⚔</span>
          <span class="equip-slot-item"></span>
        </div>
        <div class="equip-slot" data-slot="armor" title="Armure">
          <span class="equip-slot-label">🛡</span>
          <span class="equip-slot-item"></span>
        </div>
        <div class="equip-slot" data-slot="accessory" title="Accessoire">
          <span class="equip-slot-label">💍</span>
          <span class="equip-slot-item"></span>
        </div>
      </div>
    `;

    // Refs pour éviter les querySelector à chaque refresh.
    this.els = {
      icon: this.root.querySelector('.unit-card-icon'),
      name: this.root.querySelector('.unit-card-name'),
      level: this.root.querySelector('.unit-card-level'),
      sprite: this.root.querySelector('.unit-card-sprite'),
      atk: this.root.querySelector('[data-stat="atk"]'),
      dps: this.root.querySelector('[data-stat="dps"]'),
      kills: this.root.querySelector('[data-stat="kills"]'),
      hpLag: this.root.querySelector('[data-bar="hp"] .progress-bar-lag'),
      hpFill: this.root.querySelector('[data-bar="hp"] .progress-bar-fill'),
      hpLabel: this.root.querySelector('[data-bar="hp"] .progress-bar-label'),
      xpFill: this.root.querySelector('[data-bar="xp"] .progress-bar-fill'),
      equipWeapon: this.root.querySelector('[data-slot="weapon"] .equip-slot-item'),
      equipArmor: this.root.querySelector('[data-slot="armor"] .equip-slot-item'),
      equipAccessory: this.root.querySelector('[data-slot="accessory"] .equip-slot-item'),
      equipSlots: this.root.querySelectorAll('.equip-slot'),
      ultGauge: this.root.querySelector('.ult-gauge'),
      ultFill: this.root.querySelector('[data-ult-fill]'),
    };

    // Lag bar tracking — on stocke le dernier HP connu pour détecter
    // un changement et retarder la mise à jour de la couche lag.
    this._prevHpRatio = 1;

    this._applyStaticStyling();
    this.container.append(this.root);
    this._refresh(); // premier render immédiat
  }

  _applyStaticStyling() {
    const f = this.fighter;
    // Icône classe
    this.els.icon.textContent = CLASS_ICONS[f.class] ?? '?';
    // Sprite : vrai image de l'unité si disponible, sinon rectangle coloré.
    const spriteUrl = SPRITE_URLS[f.spriteKey] || SPRITE_URLS[f.class];
    if (spriteUrl) {
      this.els.sprite.style.background = `url('${spriteUrl}') center/contain no-repeat`;
    } else if (typeof f.color === 'number') {
      this.els.sprite.style.background = '#' + f.color.toString(16).padStart(6, '0');
    }
    // HP bar couleur de classe
    if (typeof f.hpBarColor === 'number') {
      this.els.hpFill.style.background = '#' + f.hpBarColor.toString(16).padStart(6, '0');
    }
    // Name label couleur de classe
    if (typeof f.labelColor === 'string') {
      this.els.name.style.color = f.labelColor;
    }
  }

  _startRefresh() {
    this._interval = setInterval(() => this._refresh(), REFRESH_MS);
  }

  _refresh() {
    const f = this.fighter;
    if (!f) return;

    // Nom + niveau
    const gName = gradeName(f.class, f.grade) || f.name || '?';
    this.els.name.textContent = gName;
    this.els.level.textContent = `Niveau ${f.level}`;

    // Stats texte
    this.els.atk.textContent = Math.round(f.atk);
    this.els.dps.textContent = this._readDps();
    this.els.kills.textContent = this._readKills();

    // HP bar — lag bar double. La couche rouge (fill) descend immédiatement,
    // la couche blanche (lag) suit avec ~200ms de retard et ~800ms de transition
    // (CSS handles le timing, on update juste les widths).
    const hpRatio = f.maxHp > 0 ? Math.max(0, Math.min(1, f.hp / f.maxHp)) : 0;
    this.els.hpFill.style.width = `${hpRatio * 100}%`;
    this.els.hpLabel.textContent = `${Math.round(f.hp)} / ${Math.round(f.maxHp)}`;

    // Bascule l'état visuel selon le ratio HP (gradient + pulse CSS)
    this.els.hpFill.classList.toggle('critical', hpRatio > 0 && hpRatio < 0.3);
    this.els.hpFill.classList.toggle('warning',  hpRatio >= 0.3 && hpRatio < 0.6);

    // La lag bar suit avec un délai CSS, mais on ne la set qu'au même
    // moment que la fill (le delay/transition CSS gère le retard visuel).
    this.els.hpLag.style.width = `${hpRatio * 100}%`;

    // XP bar — cap visuel si niveau max
    const needed = xpToNextLevel(f.level);
    const xpRatio = needed === Infinity ? 1 : Math.max(0, Math.min(1, f.xp / needed));
    this.els.xpFill.style.width = `${xpRatio * 100}%`;

    // État mort
    this.root.classList.toggle('dead', !f.isAlive);

    // Ultimate gauge — auto-déclenchement, la jauge montre juste le progrès.
    if (f.ultimateMax > 0 && this.els.ultFill) {
      const ratio = Math.min(1, f.ultimateCharge / f.ultimateMax);
      this.els.ultFill.style.width = `${ratio * 100}%`;
      this.els.ultGauge?.classList.toggle('ready', f.ultimateReady);
    }

    // Equipment slots
    this._refreshEquipSlots();
  }

  _refreshEquipSlots() {
    const equipped = ItemSystem.getEquipped(this.fighter.id);
    const slotMap = { weapon: equipped.weapon, armor: equipped.armor, accessory: equipped.accessory };

    for (const [slotName, item] of Object.entries(slotMap)) {
      const el = this.els[`equip${slotName.charAt(0).toUpperCase() + slotName.slice(1)}`];
      if (!el) continue;
      const slotDiv = el.parentElement;

      if (item) {
        // Affiche l'icône SVG pixel art avec coloration rareté
        el.innerHTML = renderItemIcon(item);
        el.title = this._buildItemTooltip(item);
        slotDiv.style.borderColor = item.rarityColor;
        slotDiv.classList.add('equipped');
        // Petit cadenas dans le coin.
        if (!slotDiv.querySelector('.equip-lock')) {
          const lock = document.createElement('span');
          lock.className = 'equip-lock';
          lock.textContent = '🔒';
          slotDiv.append(lock);
        }
      } else {
        el.innerHTML = '';
        el.title = '';
        slotDiv.style.borderColor = '';
        slotDiv.classList.remove('equipped');
        // Retire le cadenas si plus d'item.
        const lockEl = slotDiv.querySelector('.equip-lock');
        if (lockEl) lockEl.remove();
      }
    }
  }

  /**
   * Construit un tooltip descriptif riche pour un item équipé.
   * Corrige le "dark pattern involontaire" identifié par l'UX audit :
   * les bonus d'items étaient appliqués mais invisibles.
   */
  _buildItemTooltip(item) {
    if (!item) return '';
    const lines = [];
    lines.push(`🔒 ${item.name} — ${item.rarityName}`);

    // Stats de base
    const stats = [];
    if (item.stats?.atk)  stats.push(`+${item.stats.atk} ATK`);
    if (item.stats?.hp)   stats.push(`+${item.stats.hp} HP`);
    if (stats.length > 0) {
      lines.push('');
      lines.push(stats.join(' · '));
    }

    // Enchantements (bonus procéduraux)
    if (Array.isArray(item.enchants) && item.enchants.length > 0) {
      lines.push('');
      lines.push('Enchantements :');
      for (const enc of item.enchants) {
        const prefix = enc.mode === 'percent' ? '+' : '+';
        const suffix = enc.mode === 'percent' ? '%' : '';
        const label = enc.name ? enc.name.replace(/\{v\}/g, enc.value) : `${prefix}${enc.value}${suffix} ${enc.stat}`;
        lines.push(`  • ${label}`);
      }
    }

    // Info set (pour le 2/3 pieces bonus)
    if (item.set) {
      lines.push('');
      lines.push(`Set : ${item.set}`);
    }

    return lines.join('\n');
  }

  _readDps() {
    if (!this.telemetry || typeof this.telemetry.getCurrentCombatStats !== 'function') {
      return '—';
    }
    const stats = this.telemetry.getCurrentCombatStats();
    if (!stats) return '0';
    const dps = stats.dpsByUnit?.[this.fighter.id];
    if (typeof dps !== 'number') return '0';
    return dps.toFixed(1);
  }

  _readKills() {
    // Le count de kills du combat courant n'est pas agrégé par TelemetrySystem
    // dans les stats live — on fait un scan des events pour l'instant.
    // TODO: exposer un compteur dédié dans TelemetrySystem pour éviter le scan.
    if (!this.telemetry || !this.telemetry.currentCombat) return '0';
    let n = 0;
    for (const e of this.telemetry.currentCombat.events) {
      if (e.type === 'unit_died' && e.killedBy === this.fighter.id) n++;
    }
    return String(n);
  }

  destroy() {
    if (this._interval) clearInterval(this._interval);
    if (this.root) this.root.remove();
  }
}
