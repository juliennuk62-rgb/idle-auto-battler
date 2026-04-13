// DevConsole — console admin globale accessible depuis n'importe quel écran.
// Touche ` (backtick) ou F9 pour ouvrir/fermer.
// Commandes : ressources, progression, donjons, gacha, missions, etc.

import { ResourceSystem } from '../systems/ResourceSystem.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { DailySystem } from '../systems/DailySystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { WorldSystem } from '../systems/WorldSystem.js';
import { generateItem } from '../data/items.js';

const STORAGE_KEY_DUNGEON = 'idle_autobattler_dungeon_run';

export class DevConsole {
  constructor() {
    this.visible = false;
    this._create();
    this._bindHotkey();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'devconsole';
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <div class="devc-header">
        <span class="devc-title">🔧 CONSOLE ADMIN</span>
        <span class="devc-hint">F9 pour fermer</span>
        <button class="devc-close" id="devc-close">✕</button>
      </div>
      <div class="devc-body">

        <div class="devc-section">
          <div class="devc-section-title">💰 Ressources</div>
          <div class="devc-row">
            <button class="devc-btn" data-cmd="gold1k">+1K Or</button>
            <button class="devc-btn" data-cmd="gold10k">+10K Or</button>
            <button class="devc-btn" data-cmd="gold100k">+100K Or</button>
          </div>
          <div class="devc-row">
            <button class="devc-btn devc-btn-gem">+10 Gemmes</button>
            <button class="devc-btn devc-btn-gem">+50 Gemmes</button>
            <button class="devc-btn devc-btn-gem">+200 Gemmes</button>
          </div>
          <div class="devc-row">
            <button class="devc-btn" data-cmd="soul100">+100 Fragments</button>
          </div>
        </div>

        <div class="devc-section">
          <div class="devc-section-title">⚔ Donjons</div>
          <div class="devc-row">
            <button class="devc-btn devc-btn-green" data-cmd="dungeon-clear">Skip salle actuelle</button>
            <button class="devc-btn devc-btn-green" data-cmd="dungeon-clear-all">Compléter tout le donjon</button>
          </div>
          <div class="devc-row">
            <button class="devc-btn" data-cmd="dungeon-reset">Reset progression donjon</button>
          </div>
        </div>

        <div class="devc-section">
          <div class="devc-section-title">🗺 Aventure</div>
          <div class="devc-row">
            <button class="devc-btn" data-cmd="unlock-biomes">Débloquer tous les biomes</button>
            <button class="devc-btn" data-cmd="jump-wave">
              Wave : <input type="number" class="devc-input" id="devc-wave" value="10" min="1" max="999" />
            </button>
          </div>
        </div>

        <div class="devc-section">
          <div class="devc-section-title">🎰 Gacha & Items</div>
          <div class="devc-row">
            <button class="devc-btn devc-btn-purple" data-cmd="pull10">10 invocations gratuites</button>
            <button class="devc-btn devc-btn-purple" data-cmd="all-heroes">Débloquer tous les héros</button>
          </div>
          <div class="devc-row">
            <button class="devc-btn" data-cmd="item-legendary">+1 Item Légendaire</button>
            <button class="devc-btn" data-cmd="item-epic">+1 Item Épique</button>
          </div>
        </div>

        <div class="devc-section">
          <div class="devc-section-title">📋 Missions & Daily</div>
          <div class="devc-row">
            <button class="devc-btn devc-btn-green" data-cmd="complete-missions">Compléter toutes les missions</button>
            <button class="devc-btn" data-cmd="reset-daily">Reset daily login</button>
          </div>
        </div>

        <div class="devc-section">
          <div class="devc-section-title">🔴 Danger</div>
          <div class="devc-row">
            <button class="devc-btn devc-btn-red" data-cmd="reset-all">RESET TOTAL (tout effacer)</button>
          </div>
        </div>

      </div>
      <div class="devc-log" id="devc-log"></div>
    `;

    document.body.appendChild(this.el);
    this._bindButtons();
  }

  _bindHotkey() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F9' || e.key === '`') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  _bindButtons() {
    this.el.querySelector('#devc-close').addEventListener('click', () => this.toggle());

    this.el.querySelectorAll('.devc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cmd = btn.dataset.cmd;
        if (cmd) this._exec(cmd);

        // Gems buttons (pas de data-cmd, texte basé)
        const text = btn.textContent;
        if (text.includes('+10 Gemmes')) { ResourceSystem.addGems(10); this._log('+10 gemmes'); }
        if (text.includes('+50 Gemmes')) { ResourceSystem.addGems(50); this._log('+50 gemmes'); }
        if (text.includes('+200 Gemmes')) { ResourceSystem.addGems(200); this._log('+200 gemmes'); }
      });
    });
  }

  _exec(cmd) {
    switch (cmd) {
      // ── Ressources ──
      case 'gold1k':
        ResourceSystem.addGold(1000); this._log('+1 000 or'); break;
      case 'gold10k':
        ResourceSystem.addGold(10000); this._log('+10 000 or'); break;
      case 'gold100k':
        ResourceSystem.addGold(100000); this._log('+100 000 or'); break;
      case 'soul100':
        ResourceSystem.addSoulFragments?.(100) || (ResourceSystem.soulFragments = (ResourceSystem.soulFragments || 0) + 100);
        this._log('+100 fragments d\'âme');
        break;

      // ── Donjons ──
      case 'dungeon-clear': {
        const save = this._getDungeonSave();
        if (save) {
          const next = save.roomsCleared.findIndex(c => !c);
          if (next >= 0) {
            save.roomsCleared[next] = true;
            save.currentRoom = next;
            localStorage.setItem(STORAGE_KEY_DUNGEON, JSON.stringify(save));
            this._log(`Salle ${next + 1} marquée complète. Rafraîchir la page.`);
          } else {
            this._log('Toutes les salles déjà complétées.');
          }
        } else {
          this._log('Aucun run de donjon en cours.');
        }
        break;
      }
      case 'dungeon-clear-all': {
        const save = this._getDungeonSave();
        if (save) {
          save.roomsCleared = save.roomsCleared.map(() => true);
          localStorage.setItem(STORAGE_KEY_DUNGEON, JSON.stringify(save));
          this._log('Donjon entier complété. Rafraîchir la page.');
        } else {
          this._log('Aucun run de donjon en cours.');
        }
        break;
      }
      case 'dungeon-reset':
        localStorage.removeItem(STORAGE_KEY_DUNGEON);
        this._log('Progression donjon effacée.');
        break;

      // ── Aventure ──
      case 'unlock-biomes':
        ['forest','caves','ruins','hell','snow','temple'].forEach(b => {
          WorldSystem.completeRun?.(b, 10, true);
        });
        this._log('Tous les biomes débloqués.');
        break;
      case 'jump-wave': {
        const input = this.el.querySelector('#devc-wave');
        const wave = parseInt(input?.value, 10);
        if (wave && window.__game) {
          const scene = window.__game.scene.getScene('CombatScene');
          if (scene?.jumpToWave) { scene.jumpToWave(wave); this._log(`Jump wave ${wave}`); }
          else this._log('Pas en combat aventure.');
        } else {
          this._log('Pas en combat aventure.');
        }
        break;
      }

      // ── Gacha ──
      case 'pull10':
        for (let i = 0; i < 10; i++) GachaSystem.pullSingle();
        this._log('10 pulls effectués (gratuits).');
        break;
      case 'all-heroes': {
        const { HEROES } = require_heroes();
        if (HEROES) {
          for (const h of HEROES) GachaSystem._addHero?.(h.id) || GachaSystem.ownedHeroes?.push(h.id);
          this._log(`${HEROES.length} héros débloqués.`);
        } else {
          this._log('Impossible de charger heroes.js');
        }
        break;
      }

      // ── Items ──
      case 'item-legendary': {
        const item = generateItem('temple', 50);
        // Force legendary
        item.rarity = 'legendary'; item.rarityName = 'Légendaire'; item.rarityColor = '#f97316';
        ItemSystem.addItem(item);
        this._log(`Item légendaire ajouté : ${item.name}`);
        break;
      }
      case 'item-epic': {
        const item = generateItem('ruins', 30);
        item.rarity = 'epic'; item.rarityName = 'Épique'; item.rarityColor = '#a855f7';
        ItemSystem.addItem(item);
        this._log(`Item épique ajouté : ${item.name}`);
        break;
      }

      // ── Missions ──
      case 'complete-missions': {
        for (const m of [...MissionSystem.getDailies(), ...MissionSystem.getWeeklies()]) {
          m.progress = m.target;
        }
        MissionSystem._save();
        this._log('Toutes les missions complétées.');
        break;
      }
      case 'reset-daily':
        localStorage.removeItem('idle_autobattler_daily');
        this._log('Daily login reset. Rafraîchir.');
        break;

      // ── Reset total ──
      case 'reset-all':
        if (confirm('EFFACER TOUTES LES DONNÉES ? Le jeu redémarrera.')) {
          localStorage.clear();
          window.location.reload();
        }
        break;

      default:
        this._log(`Commande inconnue : ${cmd}`);
    }
  }

  _getDungeonSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DUNGEON);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  _log(msg) {
    const logEl = this.el.querySelector('#devc-log');
    const line = document.createElement('div');
    line.className = 'devc-log-line';
    line.textContent = `> ${msg}`;
    logEl.prepend(line);
    // Garde max 10 lignes
    while (logEl.children.length > 10) logEl.lastChild.remove();
  }

  toggle() {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'flex' : 'none';
  }
}

// Helper pour import dynamique de heroes.js (évite les imports circulaires)
function require_heroes() {
  try {
    // On va chercher le module via le cache du navigateur
    const mod = window.__heroesModule;
    return mod || {};
  } catch { return {}; }
}
