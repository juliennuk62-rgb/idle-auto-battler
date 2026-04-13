// DungeonCombatScene — scène Phaser pour le combat tour par tour en donjon.
// Rend la grille 10×8, les fighters, l'UI tour par tour (barre d'ordre,
// panneau actions, overlays de portée). Gère l'input click.

import { DungeonCombatEngine } from '../systems/DungeonCombatEngine.js';
import { DungeonFighter } from '../entities/DungeonFighter.js';
import { DungeonUI } from '../ui/DungeonUI.js';
import { GRID, GRID_COLORS } from '../data/dungeonConfig.js';

export class DungeonCombatScene extends Phaser.Scene {
  constructor() {
    super('DungeonCombatScene');
  }

  init(data) {
    // data vient soit de scene.restart(data) soit du global au premier lancement
    this.setupData = data || window.__dungeonCombatData || {};
    window.__dungeonCombatData = null;
  }

  preload() {
    // Réutilise les sprites déjà chargés par CombatScene (s'ils existent)
    if (!this.textures.exists('warrior')) {
      this.load.image('warrior', 'assets/sprites/allies/warrior.png');
      this.load.image('archer', 'assets/sprites/allies/archer.png');
      this.load.image('mage', 'assets/sprites/allies/mage.png');
      this.load.image('healer', 'assets/sprites/allies/healer.png');
      this.load.image('gobelin', 'assets/sprites/monsters/gobelin.png');
      this.load.image('loup', 'assets/sprites/monsters/loup.png');
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f1e');

    // ─── Création des teams de test ──────────────────────────────────
    const playerTeam = this._createTestPlayerTeam();
    const enemyTeam = this._createTestEnemyTeam();

    // ─── Engine ──────────────────────────────────────────────────────
    this.engine = new DungeonCombatEngine(playerTeam, enemyTeam);
    this.engine.setup();

    // ─── State machine UI ────────────────────────────────────────────
    this.uiState = 'idle'; // 'idle' | 'move' | 'ability_select' | 'target' | 'resolving' | 'ai'
    this.selectedAbilityId = null;
    this.hoveredCell = null;
    this._aiProcessing = false; // empêche l'empilement des tours IA

    // ─── Rendu grille ────────────────────────────────────────────────
    this._drawGrid();

    // ─── Rendu fighters ──────────────────────────────────────────────
    this._createFighterSprites();

    // ─── Overlay (highlight cases) ───────────────────────────────────
    this.overlayGfx = this.add.graphics().setDepth(5);

    // ─── UI DOM HD (overlay au-dessus du canvas) ─────────────────────
    const dungeonDiv = document.getElementById('dungeon-game');
    this.dungeonUI = new DungeonUI(dungeonDiv, {
      onMove: () => {
        this.uiState = this.uiState === 'move' ? 'idle' : 'move';
        this.selectedAbilityId = null;
        this._refreshOverlay();
        this._refreshUI();
      },
      onAbility: (id) => {
        if (this.uiState === 'target' && this.selectedAbilityId === id) {
          this.uiState = 'idle';
          this.selectedAbilityId = null;
        } else {
          this.uiState = 'target';
          this.selectedAbilityId = id;
        }
        this._refreshOverlay();
        this._refreshUI();
      },
      onDefend: () => this.engine.defend(),
      onEndTurn: () => {
        this.uiState = 'idle';
        this.selectedAbilityId = null;
        this._clearOverlay();
        this.engine.endTurn();
      },
      onQuit: () => {
        this.dungeonUI.destroy();
        const onEnd = this.game.registry.get('onDungeonCombatEnd');
        if (onEnd) onEnd({ victory: false, quit: true });
      },
    });

    // ─── Input ───────────────────────────────────────────────────────
    this.input.on('pointerdown', (pointer) => this._onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this._onPointerMove(pointer));

    // ─── Callbacks engine ────────────────────────────────────────────
    this.engine.onDamage((target, amount) => this._showDamage(target, amount));
    this.engine.onHeal((target, amount) => this._showHeal(target, amount));
    this.engine.onDeath((fighter) => this._onFighterDeath(fighter));
    this.engine.onMove((fighter, path) => this._animateMovement(fighter, path));
    this.engine.onTurnStart((fighter) => this._onTurnStart(fighter));
    this.engine.onCombatEnd((result) => this._onCombatEnd(result));

    // ─── Debug global ─────────────────────────────────────────────────
    window.__dungeonScene = this;
    window.__dungeonEngine = this.engine;

    // ─── Nettoyage au shutdown (restart ou destroy) ──────────────────
    this.events.once('shutdown', () => {
      if (this.dungeonUI) { this.dungeonUI.destroy(); this.dungeonUI = null; }
    });

    // ─── Démarrer le combat ──────────────────────────────────────────
    this.engine.start();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TEST DATA — sera remplacé par les vraies données de donjon
  // ═══════════════════════════════════════════════════════════════════════

  _createTestPlayerTeam() {
    return [
      new DungeonFighter({
        name: 'Guerrier', class: 'warrior', isPlayer: true,
        hp: 200, atk: 25, gridCol: 1, gridRow: 3,
        spriteKey: 'warrior',
        abilities: [
          { id: 'strike', name: 'Frappe', paCost: 3, minRange: 1, maxRange: 1,
            aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 1.0 },
            needsLOS: false, cooldown: 0, maxUsesPerTurn: -1, icon: '⚔' },
          { id: 'shield_bash', name: 'Coup de bouclier', paCost: 4, minRange: 1, maxRange: 1,
            aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 0.8 },
            needsLOS: false, cooldown: 2, maxUsesPerTurn: 1, icon: '🛡',
            special: { push: 1 },
            statusEffect: { id: 'pm_down', name: '-2 PM', duration: 1, effect: { pmModifier: -2, isDebuff: true } } },
        ],
      }),
      new DungeonFighter({
        name: 'Archer', class: 'archer', isPlayer: true,
        hp: 100, atk: 35, gridCol: 0, gridRow: 2,
        spriteKey: 'archer',
        abilities: [
          { id: 'arrow', name: 'Tir', paCost: 3, minRange: 2, maxRange: 6,
            aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 1.0 },
            needsLOS: true, cooldown: 0, maxUsesPerTurn: -1, icon: '🏹' },
        ],
      }),
      new DungeonFighter({
        name: 'Mage', class: 'mage', isPlayer: true,
        hp: 120, atk: 40, gridCol: 0, gridRow: 4,
        spriteKey: 'mage',
        abilities: [
          { id: 'arcane', name: 'Trait arcanique', paCost: 3, minRange: 1, maxRange: 5,
            aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 1.1 },
            needsLOS: true, cooldown: 0, maxUsesPerTurn: -1, icon: '✨' },
          { id: 'fireball', name: 'Boule de feu', paCost: 4, minRange: 2, maxRange: 6,
            aoeShape: 'circle', aoeSize: 1, targetType: 'enemy', damage: { base: 0, scaling: 0.8 },
            needsLOS: false, cooldown: 2, maxUsesPerTurn: 1, icon: '🔥' },
        ],
      }),
      new DungeonFighter({
        name: 'Healer', class: 'healer', isPlayer: true,
        hp: 110, atk: 20, gridCol: 0, gridRow: 5,
        spriteKey: 'healer',
        abilities: [
          { id: 'heal', name: 'Soin', paCost: 3, minRange: 1, maxRange: 4,
            aoeShape: 'single', targetType: 'ally', heal: { base: 0, scaling: 1.2 },
            needsLOS: false, cooldown: 0, maxUsesPerTurn: -1, icon: '💚' },
        ],
      }),
    ];
  }

  _createTestEnemyTeam() {
    const data = this.setupData || {};
    const count = data.mobCount || 3;
    const atkMult = data.atkMult || 1.0;
    const hpMult = data.hpMult || 1.0;
    const isBoss = data.isBoss || false;

    // Pool de mobs de la famille gobeline
    const MOB_TEMPLATES = [
      { name: 'Gobelin', sprite: 'gobelin', baseHp: 80, baseAtk: 12, pm: 3, initiative: 15,
        ability: { id: 'slash', name: 'Griffure', paCost: 3, minRange: 1, maxRange: 1,
          aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 1.0 },
          needsLOS: false, cooldown: 0, maxUsesPerTurn: -1, icon: '🗡' } },
      { name: 'Loup', sprite: 'loup', baseHp: 60, baseAtk: 15, pm: 5, initiative: 30,
        ability: { id: 'bite', name: 'Morsure', paCost: 3, minRange: 1, maxRange: 1,
          aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 1.2 },
          needsLOS: false, cooldown: 0, maxUsesPerTurn: -1, icon: '🐺' } },
      { name: 'Araignée', sprite: 'gobelin', baseHp: 70, baseAtk: 10, pm: 3, initiative: 20,
        ability: { id: 'web', name: 'Toile', paCost: 3, minRange: 1, maxRange: 2,
          aoeShape: 'single', targetType: 'enemy', damage: { base: 0, scaling: 0.6 },
          statusEffect: { id: 'slow', name: 'Ralenti', duration: 1, effect: { pmModifier: -2, isDebuff: true } },
          needsLOS: false, cooldown: 2, maxUsesPerTurn: 1, icon: '🕸' } },
    ];

    const BOSS_TEMPLATE = {
      name: 'Roi Gobelin', sprite: 'gobelin', baseHp: 300, baseAtk: 20, pm: 3, initiative: 25,
      pa: 8, isBoss: true,
      abilities: [
        { id: 'royal_strike', name: 'Frappe royale', paCost: 4, minRange: 1, maxRange: 1,
          aoeShape: 'single', targetType: 'enemy', damage: { base: 5, scaling: 1.5 },
          needsLOS: false, cooldown: 0, maxUsesPerTurn: -1, icon: '👑' },
        { id: 'war_cry', name: 'Cri de guerre', paCost: 3, minRange: 0, maxRange: 0,
          aoeShape: 'circle', aoeSize: 2, targetType: 'ally', heal: { base: 10, scaling: 0.3 },
          needsLOS: false, cooldown: 3, maxUsesPerTurn: 1, icon: '📯' },
      ],
    };

    const enemies = [];
    // Positions : colonnes 7-9, lignes réparties uniformément
    const positions = [];
    for (let i = 0; i < count; i++) {
      const col = 7 + (i % 3);
      const row = Math.round(1 + (i / count) * 6);
      positions.push({ col, row });
    }
    // Éviter les doublons de position
    const usedPositions = new Set();

    const spawnCount = isBoss ? count - 1 : count; // Le boss prend 1 place

    // Spawn le boss d'abord si c'est la salle boss
    if (isBoss) {
      const pos = { col: 8, row: 4 };
      usedPositions.add(`${pos.col},${pos.row}`);
      enemies.push(new DungeonFighter({
        name: BOSS_TEMPLATE.name,
        class: 'monster', isPlayer: false, isBoss: true,
        hp: Math.round(BOSS_TEMPLATE.baseHp * hpMult),
        atk: Math.round(BOSS_TEMPLATE.baseAtk * atkMult),
        gridCol: pos.col, gridRow: pos.row,
        spriteKey: BOSS_TEMPLATE.sprite, aiType: 'rush',
        pa: BOSS_TEMPLATE.pa, pm: BOSS_TEMPLATE.pm, initiative: BOSS_TEMPLATE.initiative,
        abilities: BOSS_TEMPLATE.abilities.map(a => ({ ...a })),
      }));
    }

    // Spawn les mobs normaux
    for (let i = 0; i < spawnCount; i++) {
      const template = MOB_TEMPLATES[i % MOB_TEMPLATES.length];
      // Trouver une position libre
      let col, row;
      do {
        col = 7 + Math.floor(Math.random() * 3);
        row = 1 + Math.floor(Math.random() * 6);
      } while (usedPositions.has(`${col},${row}`));
      usedPositions.add(`${col},${row}`);

      enemies.push(new DungeonFighter({
        name: `${template.name} ${i + 1}`,
        class: 'monster', isPlayer: false,
        hp: Math.round(template.baseHp * hpMult),
        atk: Math.round(template.baseAtk * atkMult),
        gridCol: col, gridRow: row,
        spriteKey: template.sprite, aiType: 'rush',
        pm: template.pm, initiative: template.initiative + Math.floor(Math.random() * 5),
        abilities: [{ ...template.ability }],
      }));
    }

    return enemies;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════

  _drawGrid() {
    const gfx = this.add.graphics().setDepth(0);
    const { cols, rows, cellSize, originX, originY } = GRID;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = originX + c * cellSize;
        const y = originY + r * cellSize;
        const isEven = (r + c) % 2 === 0;
        gfx.fillStyle(isEven ? 0x1a1a2e : 0x16162a, 1);
        gfx.fillRect(x, y, cellSize, cellSize);
        gfx.lineStyle(1, GRID_COLORS.cellBorder, 0.4);
        gfx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  _createFighterSprites() {
    for (const f of this.engine.allFighters) {
      const pos = this.engine.grid.cellToPixel(f.gridCol, f.gridRow);
      const container = this.add.container(pos.x, pos.y).setDepth(10);

      // Sprite ou rectangle
      let body;
      if (f.spriteKey && this.textures.exists(f.spriteKey)) {
        body = this.add.sprite(0, 0, f.spriteKey).setScale(0.8);
        if (!f.isPlayer) body.setFlipX(true);
      } else {
        const color = f.isPlayer ? 0x22c55e : 0xef4444;
        body = this.add.rectangle(0, 0, 36, 36, color).setStrokeStyle(2, 0x000000);
      }

      // Nom
      const label = this.add.text(0, -28, f.name, {
        fontFamily: 'Arial', fontSize: '9px', fontStyle: 'bold',
        color: f.isPlayer ? '#88ff88' : '#ff8888',
      }).setOrigin(0.5);

      // HP bar
      const hpBarBg = this.add.rectangle(0, -20, 40, 4, 0x222222);
      const hpBarFill = this.add.rectangle(-20, -20, 40, 4, f.isPlayer ? 0x22c55e : 0xef4444).setOrigin(0, 0.5);

      container.add([body, label, hpBarBg, hpBarFill]);

      f.container = container;
      f.body = body;
      f.label = label;
      f.hpBarFill = hpBarFill;
      f.hpBarBg = hpBarBg;
    }
  }

  _updateHpBar(fighter) {
    if (!fighter.hpBarFill) return;
    const pct = fighter.hpPercent();
    fighter.hpBarFill.scaleX = pct;
    // Couleur selon HP
    if (pct < 0.25) fighter.hpBarFill.setFillStyle(0xef4444);
    else if (pct < 0.5) fighter.hpBarFill.setFillStyle(0xfbbf24);
  }

  /** Met à jour toute l'UI DOM. */
  _refreshUI() {
    const f = this.engine.currentFighter;
    this.dungeonUI.updateTimeline(
      this.engine.turns.getUpcoming(12),
      f,
      this.engine.turns.roundNumber
    );
    this.dungeonUI.updateActions(f, this.uiState, this.selectedAbilityId);
    this.dungeonUI.updateInfo(f);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEGACY STUBS (remplacées par DungeonUI DOM)
  // ═══════════════════════════════════════════════════════════════════════

  // (anciennes méthodes UI Phaser supprimées — remplacées par DungeonUI DOM)

  // ═══════════════════════════════════════════════════════════════════════
  // OVERLAY GRILLE
  // ═══════════════════════════════════════════════════════════════════════

  _refreshOverlay() {
    this._clearOverlay();
    const gfx = this.overlayGfx;
    const { cellSize, originX, originY } = GRID;

    if (this.uiState === 'move') {
      // Afficher les cases de déplacement
      const reachable = this.engine.getMovementRange();
      for (const cell of reachable) {
        gfx.fillStyle(GRID_COLORS.moveRange, 0.3);
        gfx.fillRect(originX + cell.col * cellSize, originY + cell.row * cellSize, cellSize, cellSize);
      }
    }

    if (this.uiState === 'target' && this.selectedAbilityId) {
      // Afficher la portée du sort
      const range = this.engine.getAbilityRange(this.selectedAbilityId);
      const ability = this.engine.currentFighter?.getAbility(this.selectedAbilityId);
      const isHeal = ability?.targetType === 'ally';
      const color = isHeal ? GRID_COLORS.healRange : GRID_COLORS.attackRange;

      for (const cell of range) {
        gfx.fillStyle(color, 0.2);
        gfx.fillRect(originX + cell.col * cellSize, originY + cell.row * cellSize, cellSize, cellSize);
      }

      // AoE preview sur la case hover
      if (this.hoveredCell) {
        const aoe = this.engine.getAoePreview(this.selectedAbilityId, this.hoveredCell.col, this.hoveredCell.row);
        for (const cell of aoe) {
          gfx.fillStyle(GRID_COLORS.aoePreview, 0.4);
          gfx.fillRect(originX + cell.col * cellSize, originY + cell.row * cellSize, cellSize, cellSize);
        }
      }
    }

    // Highlight du fighter courant
    const f = this.engine.currentFighter;
    if (f && f.isAlive) {
      gfx.lineStyle(2, GRID_COLORS.selectedUnit, 0.8);
      gfx.strokeRect(
        originX + f.gridCol * cellSize + 1,
        originY + f.gridRow * cellSize + 1,
        cellSize - 2, cellSize - 2
      );
    }
  }

  _clearOverlay() {
    this.overlayGfx.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INPUT
  // ═══════════════════════════════════════════════════════════════════════

  _onPointerDown(pointer) {
    if (this.engine.isOver()) return;
    if (this.engine.state !== 'player_turn') return;

    const cell = this.engine.grid.pixelToCell(pointer.x, pointer.y);
    if (!cell) return;

    if (this.uiState === 'move') {
      const moved = this.engine.moveUnit(cell.col, cell.row);
      if (moved) {
        // Rester en mode move si PM restant
        if (this.engine.currentFighter.getEffectivePm() <= 0) {
          this.uiState = 'idle';
        }
        this._refreshUI();
        this._refreshOverlay();
      }
    }

    if (this.uiState === 'target' && this.selectedAbilityId) {
      const result = this.engine.useAbility(this.selectedAbilityId, cell.col, cell.row);
      if (result.success) {
        this.uiState = 'idle';
        this.selectedAbilityId = null;
        this._refreshUI();
        this._refreshOverlay();
      }
    }

    // Clic sur un fighter pour voir ses infos
    const occupant = this.engine.grid.getOccupant(cell.col, cell.row);
    if (occupant) {
      this._showFighterInfo(occupant);
    }
  }

  _onPointerMove(pointer) {
    const cell = this.engine.grid.pixelToCell(pointer.x, pointer.y);
    if (!cell) {
      this.hoveredCell = null;
      this.dungeonUI.hideTooltip();
      return;
    }

    if (this.hoveredCell?.col !== cell.col || this.hoveredCell?.row !== cell.row) {
      this.hoveredCell = cell;
      if (this.uiState === 'target') {
        this._refreshOverlay();
      }

      // Tooltip sur les entités
      const occupant = this.engine.grid.getOccupant(cell.col, cell.row);
      if (occupant && occupant.isAlive) {
        // Convertir les coordonnées Phaser → écran pour positionner le tooltip
        const canvas = this.sys.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        const screenX = rect.left + pointer.x * scaleX;
        const screenY = rect.top + pointer.y * scaleY;
        this.dungeonUI.showTooltip(occupant, screenX, screenY);
      } else {
        this.dungeonUI.hideTooltip();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CALLBACKS ENGINE
  // ═══════════════════════════════════════════════════════════════════════

  _onTurnStart(fighter) {
    this._refreshUI();
    this._refreshOverlay();

    // Si c'est un monstre → IA après un petit délai
    if (!fighter.isPlayer) {
      if (this._aiProcessing) return;
      this._aiProcessing = true;
      this.time.delayedCall(400, () => this._runAI(fighter));
    }
  }

  _showDamage(target, amount) {
    if (!target.container) return;
    const txt = this.add.text(target.container.x, target.container.y - 35, `-${amount}`, {
      fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#ef4444',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt, y: txt.y - 30, alpha: 0, duration: 800,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });

    this._updateHpBar(target);
  }

  _showHeal(target, amount) {
    if (!target.container) return;
    const txt = this.add.text(target.container.x, target.container.y - 35, `+${amount}`, {
      fontFamily: 'Arial', fontSize: '14px', fontStyle: 'bold', color: '#22c55e',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txt, y: txt.y - 30, alpha: 0, duration: 800,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });

    this._updateHpBar(target);
  }

  _onFighterDeath(fighter) {
    if (!fighter.container) return;
    this.tweens.add({
      targets: fighter.container, alpha: 0, scaleX: 0, scaleY: 0,
      duration: 400, ease: 'Power2',
    });
  }

  _animateMovement(fighter, path) {
    if (!fighter.container || path.length === 0) return;

    const tweens = [];
    for (const step of path) {
      const pos = this.engine.grid.cellToPixel(step.col, step.row);
      tweens.push({
        targets: fighter.container,
        x: pos.x, y: pos.y,
        duration: 120,
        ease: 'Linear',
      });
    }

    // Enchaîne les tweens séquentiellement
    this.tweens.chain({ tweens });
  }

  _onCombatEnd(result) {
    this._clearOverlay();
    this.uiState = 'idle';

    // Masque l'UI d'actions
    this.dungeonUI.updateActions(null, 'idle', null);

    // Overlay résultat en DOM (HD)
    const isVictory = result === 'victory';
    const overlay = document.createElement('div');
    overlay.className = 'dui-result-overlay';
    overlay.innerHTML = `
      <div class="dui-result ${isVictory ? 'dui-result-win' : 'dui-result-lose'}">
        <div class="dui-result-title">${isVictory ? 'VICTOIRE !' : 'DÉFAITE...'}</div>
        <button class="dui-btn dui-result-btn" id="dui-result-back">← Retour</button>
      </div>
    `;
    this.dungeonUI.el.appendChild(overlay);

    overlay.querySelector('#dui-result-back').addEventListener('click', () => {
      this.dungeonUI.destroy();
      const onEnd = this.game.registry.get('onDungeonCombatEnd');
      if (onEnd) onEnd({ victory: isVictory });
    });
  }

  _showFighterInfo(fighter) {
    // no-op — remplacé par le tooltip hover
  }

  // ═══════════════════════════════════════════════════════════════════════
  // IA MONSTRE (basique — sera étendu dans MonsterAI.js)
  // ═══════════════════════════════════════════════════════════════════════

  _runAI(fighter) {
    const finishAI = () => {
      this._aiProcessing = false;
      this.engine.endTurn();
    };

    if (!fighter.isAlive || this.engine.isOver()) {
      finishAI();
      return;
    }

    // IA "rush" basique : se rapprocher du héros le plus proche et attaquer
    const targets = this.engine.playerTeam.filter(f => f.isAlive);
    if (targets.length === 0) { finishAI(); return; }

    // Trouver le héros le plus proche
    let closest = null;
    let closestDist = Infinity;
    for (const t of targets) {
      const d = this.engine.grid.manhattan(fighter.gridCol, fighter.gridRow, t.gridCol, t.gridRow);
      if (d < closestDist) { closestDist = d; closest = t; }
    }

    // Phase 1 : mouvement
    let moveDelay = 0;
    const pm = fighter.getEffectivePm();
    if (pm > 0 && closestDist > 1) {
      const reachable = this.engine.grid.getReachableCells(fighter.gridCol, fighter.gridRow, pm);
      reachable.sort((a, b) => {
        const da = this.engine.grid.manhattan(a.col, a.row, closest.gridCol, closest.gridRow);
        const db = this.engine.grid.manhattan(b.col, b.row, closest.gridCol, closest.gridRow);
        return da - db;
      });
      if (reachable.length > 0) {
        const best = reachable[0];
        this.engine.moveUnit(best.col, best.row);
        moveDelay = (best.path?.length || 1) * 120 + 300;
      }
    }

    // Phase 2 : attaque (après la fin du mouvement)
    this.time.delayedCall(moveDelay + 200, () => {
      if (!fighter.isAlive || this.engine.isOver()) { finishAI(); return; }

      // Re-calculer la distance après mouvement
      const newDist = this.engine.grid.manhattan(fighter.gridCol, fighter.gridRow, closest.gridCol, closest.gridRow);

      let attacked = false;
      for (const a of fighter.abilities) {
        if (!fighter.canUseAbility(a.id)) continue;
        if (newDist >= (a.minRange || 1) && newDist <= (a.maxRange || 1)) {
          this.engine.useAbility(a.id, closest.gridCol, closest.gridRow);
          attacked = true;
          break;
        }
      }

      // Phase 3 : fin de tour
      this.time.delayedCall(attacked ? 500 : 100, () => {
        finishAI();
      });
    });
  }

  // ─── Pas d'update loop (event-driven) ─────────────────────────────────
  update() {}
}
