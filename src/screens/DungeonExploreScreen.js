// DungeonExploreScreen — écran d'exploration du donjon style Dofus.
// Progression linéaire : Salle 1 → 2 → 3 → 4 → Boss.
// Scaling monstres par salle. Sauvegarde localStorage.

import { attachGuideButton } from '../ui/GuideModal.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { InventoryModal } from '../ui/InventoryModal.js';

const ROOMS = [
  { id: 0, name: 'Salle 1', desc: 'Éclaireurs', icon: '👺', x: 15, y: 15, mobCount: 3, atkMult: 1.0, hpMult: 1.0, goldReward: 200, gemsReward: 0 },
  { id: 1, name: 'Salle 2', desc: 'Patrouille', icon: '👺', x: 55, y: 15, mobCount: 5, atkMult: 1.15, hpMult: 1.2, goldReward: 350, gemsReward: 1 },
  { id: 2, name: 'Salle 3', desc: 'Meute complète', icon: '👺', x: 15, y: 50, mobCount: 6, atkMult: 1.3, hpMult: 1.4, goldReward: 500, gemsReward: 1 },
  { id: 3, name: 'Salle 4', desc: 'Garde d\'élite', icon: '🛡', x: 55, y: 50, mobCount: 5, atkMult: 1.5, hpMult: 1.6, goldReward: 650, gemsReward: 2 },
  { id: 4, name: 'BOSS',    desc: 'Roi Gobelin + garde', icon: '💀', x: 35, y: 82, mobCount: 8, atkMult: 1.8, hpMult: 2.0, isBoss: true, goldReward: 1000, gemsReward: 5 },
];

const COMPLETION_BONUS = { gold: 2000, gems: 15 };

// Chemin linéaire : 0→1→2→3→4
const PATH_ORDER = [0, 1, 2, 3, 4];
const PATHS_VISUAL = [[0,1],[1,2],[2,3],[3,4]]; // lignes visuelles entre salles

const STORAGE_KEY = 'idle_autobattler_dungeon_run';

export class DungeonExploreScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.state = this._loadState() || this._freshState();
    this._create();
  }

  _freshState() {
    return {
      dungeonId: 'forest',
      dungeonName: 'Donjon Forêt',
      dungeonFamily: 'Horde Gobeline',
      currentRoom: -1,        // -1 = pas encore commencé
      roomsCleared: [false, false, false, false, false],
      heroHp: null,
      buffs: [],
      totalGold: 0,
      totalKills: 0,
      showChoice: false,
    };
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen dex-screen';
    this._render();
  }

  _render() {
    const s = this.state;
    const nextRoom = this._getNextRoom();
    const allCleared = s.roomsCleared.every(c => c);

    this.el.innerHTML = `
      <div class="dex-container">
        <div class="dex-header">
          <button class="map-back-btn" id="dex-back">← Quitter</button>
          <div class="dex-title-group">
            <span class="dex-title">${s.dungeonName}</span>
            <span class="dex-family">${s.dungeonFamily}</span>
          </div>
          <div id="dex-guide"></div>
        </div>

        <div class="dex-progress-bar">
          ${ROOMS.map((room, i) => `
            <div class="dex-progress-step ${s.roomsCleared[i] ? 'dex-step-done' : i === nextRoom ? 'dex-step-current' : ''}">
              ${s.roomsCleared[i] ? '✓' : i + 1}
            </div>
            ${i < ROOMS.length - 1 ? `<div class="dex-progress-line ${s.roomsCleared[i] ? 'dex-line-done' : ''}"></div>` : ''}
          `).join('')}
        </div>

        <div class="dex-map" id="dex-map">
          <svg class="dex-paths" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${PATHS_VISUAL.map(([a, b]) => {
              const ra = ROOMS[a], rb = ROOMS[b];
              const cleared = s.roomsCleared[a];
              return `<line x1="${ra.x+8}" y1="${ra.y+5}" x2="${rb.x+8}" y2="${rb.y+5}"
                class="dex-path ${cleared ? 'dex-path-cleared' : ''}" />`;
            }).join('')}
          </svg>

          ${ROOMS.map(room => {
            const cleared = s.roomsCleared[room.id];
            const isNext = room.id === nextRoom && !s.showChoice && !allCleared;
            const scouted = s.scoutedRoom === room.id;
            let status = 'locked';
            if (cleared) status = 'cleared';
            else if (isNext) status = 'available';

            return `
              <div class="dex-room dex-room-${status} ${room.isBoss ? 'dex-room-boss' : ''} ${scouted ? 'dex-room-scouted' : ''}"
                   data-room="${room.id}"
                   style="left:${room.x}%;top:${room.y}%;">
                <div class="dex-room-icon">${cleared ? '✓' : room.icon}</div>
                <div class="dex-room-name">${room.name}</div>
                <div class="dex-room-desc">${room.desc}</div>
                <div class="dex-room-mobs">${room.mobCount} monstres${scouted ? ' · ×' + room.atkMult + ' ATK' : ''}</div>
                ${cleared ? '<div class="dex-room-badge">Terminé</div>' : ''}
                ${scouted && !cleared ? '<div class="dex-room-badge dex-scout-badge">🔍 Repéré</div>' : ''}
              </div>
            `;
          }).join('')}

          ${this._renderPlayer(nextRoom)}
        </div>

        ${s.showChoice && !allCleared ? this._renderChoicePanel() : ''}
        ${allCleared ? this._renderVictory() : ''}
      </div>
    `;

    this._bindEvents();
  }

  _renderPlayer(nextRoom) {
    // Position du joueur : à côté de la prochaine salle (ou dernière cleared)
    let targetRoom = 0;
    if (this.state.currentRoom >= 0) {
      targetRoom = this.state.currentRoom;
    }
    const room = ROOMS[targetRoom] || ROOMS[0];
    return `
      <div class="dex-player" style="left:${room.x - 5}%;top:${room.y - 10}%;">
        <img src="assets/sprites/allies/warrior.png" class="dex-player-sprite" />
      </div>
    `;
  }

  _bindEvents() {
    this.el.querySelector('#dex-back').addEventListener('click', () => {
      if (confirm('Quitter le donjon ? La progression sera sauvegardée.')) {
        this._saveState();
        this.onNavigate('menu');
      }
    });

    attachGuideButton(this.el.querySelector('#dex-guide'), 'dungeons');

    this.el.querySelectorAll('.dex-room-available').forEach(room => {
      room.addEventListener('click', () => {
        const roomId = parseInt(room.dataset.room);
        this._startRoom(roomId);
      });
    });

    this.el.querySelectorAll('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._applyChoice(btn.dataset.choice);
      });
    });

    // Inventaire entre les salles
    this.el.querySelector('#dex-inventory')?.addEventListener('click', () => {
      if (!this._invModal) this._invModal = new InventoryModal({ game: null });
      this._invModal.modal.open();
    });

    this.el.querySelector('#dex-victory-back')?.addEventListener('click', () => {
      this._clearSave();
      this.onNavigate('menu');
    });
  }

  // ─── Progression linéaire ─────────────────────────────────────────────

  /** Prochaine salle = première non cleared dans l'ordre. */
  _getNextRoom() {
    for (const id of PATH_ORDER) {
      if (!this.state.roomsCleared[id]) return id;
    }
    return -1;
  }

  _startRoom(roomId) {
    this.state.currentRoom = roomId;
    this.state.showChoice = false;
    this._saveState();

    const room = ROOMS[roomId];
    this.onNavigate('dungeon_combat', {
      roomIndex: roomId,
      isBoss: room.isBoss || false,
      mobCount: room.mobCount,
      mobTypes: room.mobTypes,
      atkMult: room.atkMult,
      hpMult: room.hpMult,
      dungeonId: this.state.dungeonId,
      heroHp: this.state.heroHp,
      buffs: this.state.buffs,
    });
  }

  /** Appelé par main.js après un combat. */
  onCombatResult(result) {
    if (result.victory) {
      const room = ROOMS[this.state.currentRoom];
      this.state.roomsCleared[this.state.currentRoom] = true;
      if (result.heroHp) this.state.heroHp = result.heroHp;

      // Récompenses par salle
      const gold = room.goldReward || 0;
      const gems = room.gemsReward || 0;
      if (gold > 0) ResourceSystem.addGold(gold);
      if (gems > 0) ResourceSystem.addGems(gems);
      this.state.totalGold += gold;
      this.state.totalGems = (this.state.totalGems || 0) + gems;
      this.state.totalKills += result.kills || 0;

      // Mission tracking
      MissionSystem.track('dungeon_floors', 1);

      const allCleared = this.state.roomsCleared.every(c => c);
      if (allCleared) {
        // Bonus de complétion
        ResourceSystem.addGold(COMPLETION_BONUS.gold);
        ResourceSystem.addGems(COMPLETION_BONUS.gems);
        this.state.totalGold += COMPLETION_BONUS.gold;
        this.state.totalGems = (this.state.totalGems || 0) + COMPLETION_BONUS.gems;
        MissionSystem.track('dungeon_clears', 1);
      } else {
        this.state.showChoice = true;
      }
      this._saveState();
    } else {
      this._saveState();
    }
    this._render();
  }

  // ─── Choix entre salles ───────────────────────────────────────────────

  _renderChoicePanel() {
    return `
      <div class="dex-choice-panel">
        <div class="dex-choice-title">Salle terminée ! Choisissez :</div>
        <div class="dex-choice-options">
          <button class="dex-choice-btn dex-choice-heal" data-choice="heal">
            <span class="dex-choice-icon">💚</span>
            <span class="dex-choice-label">Repos</span>
            <span class="dex-choice-desc">Heal 40% HP</span>
          </button>
          <button class="dex-choice-btn dex-choice-scout" data-choice="scout">
            <span class="dex-choice-icon">🔍</span>
            <span class="dex-choice-label">Éclaireur</span>
            <span class="dex-choice-desc">Voir la prochaine salle</span>
          </button>
          <button class="dex-choice-btn dex-choice-forge" data-choice="forge">
            <span class="dex-choice-icon">⚔</span>
            <span class="dex-choice-label">Forge</span>
            <span class="dex-choice-desc">+15% ATK temporaire</span>
          </button>
        </div>
        <button class="dex-inventory-btn" id="dex-inventory">🎒 Gérer l'inventaire</button>
      </div>
    `;
  }

  _applyChoice(choice) {
    switch (choice) {
      case 'heal':
        if (this.state.heroHp) {
          this.state.heroHp = this.state.heroHp.map(hp => ({
            ...hp, current: Math.min(hp.max, Math.round(hp.current + hp.max * 0.4))
          }));
        }
        break;
      case 'scout': {
        // Révèle la composition de la prochaine salle
        const nextId = this._getNextRoom();
        if (nextId >= 0) {
          this.state.scoutedRoom = nextId;
        }
        break;
      }
      case 'forge':
        this.state.buffs.push({ id: 'atk_boost', name: '+15% ATK', atkPercent: 15 });
        break;
    }
    this.state.showChoice = false;
    this._saveState();
    this._render();
  }

  // ─── Victoire finale ──────────────────────────────────────────────────

  _renderVictory() {
    const totalGems = this.state.totalGems || 0;
    return `
      <div class="dex-victory">
        <div class="dex-victory-title">DONJON TERMINÉ !</div>
        <div class="dex-victory-subtitle">Bonus complétion : +${COMPLETION_BONUS.gold} or, +${COMPLETION_BONUS.gems} gemmes</div>
        <div class="dex-victory-stats">
          <div class="dex-victory-stat"><span class="dex-stat-value">${this.state.totalGold}</span><span class="dex-stat-label">Or total</span></div>
          <div class="dex-victory-stat"><span class="dex-stat-value">${totalGems}</span><span class="dex-stat-label">Gemmes</span></div>
          <div class="dex-victory-stat"><span class="dex-stat-value">${this.state.totalKills}</span><span class="dex-stat-label">Monstres</span></div>
          <div class="dex-victory-stat"><span class="dex-stat-value">5/5</span><span class="dex-stat-label">Salles</span></div>
        </div>
        <button class="dex-victory-btn" id="dex-victory-back">← Retour au menu</button>
      </div>
    `;
  }

  // ─── Sauvegarde localStorage ──────────────────────────────────────────

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {}
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  _clearSave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
