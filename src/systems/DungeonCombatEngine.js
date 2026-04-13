// DungeonCombatEngine — orchestre le combat tour par tour en donjon.
// Résout les sorts, applique les dégâts, gère le win/lose,
// et coordonne GridSystem + TurnSystem.

import { GridSystem } from './GridSystem.js';
import { TurnSystem } from './TurnSystem.js';
import { DAMAGE } from '../data/dungeonConfig.js';

export class DungeonCombatEngine {
  /**
   * @param {DungeonFighter[]} playerTeam
   * @param {DungeonFighter[]} enemyTeam
   */
  constructor(playerTeam, enemyTeam) {
    this.grid = new GridSystem();
    this.turns = new TurnSystem();

    this.playerTeam = playerTeam;
    this.enemyTeam = enemyTeam;
    this.allFighters = [...playerTeam, ...enemyTeam];

    this.state = 'idle'; // 'idle' | 'player_turn' | 'ai_turn' | 'resolving' | 'victory' | 'defeat'
    this.currentFighter = null;

    // Callbacks pour la scène Phaser (animation, UI updates)
    this._onDamage = null;      // (target, amount, isCrit) => void
    this._onHeal = null;        // (target, amount) => void
    this._onDeath = null;       // (fighter) => void
    this._onMove = null;        // (fighter, path) => void — path = [{col,row}]
    this._onAbilityUsed = null; // (caster, ability, targets) => void
    this._onTurnStart = null;   // (fighter) => void
    this._onCombatEnd = null;   // (result: 'victory'|'defeat') => void
    this._onStatusEffect = null; // (fighter, effect) => void
  }

  // ─── Setup ────────────────────────────────────────────────────────────

  /** Place les fighters sur la grille selon leurs gridCol/gridRow initiaux. */
  setup() {
    this.grid.reset();
    for (const f of this.allFighters) {
      if (f.isAlive) {
        this.grid.setOccupant(f.gridCol, f.gridRow, f);
      }
    }
  }

  /** Démarre le premier round. */
  start() {
    this.turns.buildTurnOrder(this.allFighters);
    this._beginTurn();
  }

  // ─── Tour ─────────────────────────────────────────────────────────────

  _beginTurn() {
    const fighter = this.turns.startCurrentTurn();
    if (!fighter) {
      // Round terminé → nouveau round
      this.grid.tickTempTerrain();
      this.turns.newRound(this.allFighters.filter(f => f.isAlive));
      this._beginTurn();
      return;
    }

    // Check si le fighter est mort suite au tick des status effects
    if (!fighter.isAlive) {
      this._handleDeath(fighter);
      if (this._checkCombatEnd()) return;
      this._advanceTurn();
      return;
    }

    this.currentFighter = fighter;

    if (fighter.isPlayer) {
      this.state = 'player_turn';
    } else {
      this.state = 'ai_turn';
    }

    if (this._onTurnStart) this._onTurnStart(fighter);
  }

  /** Passe au tour suivant (appelé quand le joueur clique "Fin de tour" ou après l'IA). */
  endTurn() {
    if (!this.currentFighter) return;
    this.currentFighter.tickCooldowns();
    this._advanceTurn();
  }

  _advanceTurn() {
    const hasNext = this.turns.nextTurn();
    if (!hasNext) {
      // Round fini → nouveau round
      this.grid.tickTempTerrain();
      this.turns.newRound(this.allFighters.filter(f => f.isAlive));
    }
    this._beginTurn();
  }

  // ─── Actions Joueur ───────────────────────────────────────────────────

  /**
   * Déplace le fighter courant vers (toCol, toRow).
   * @returns {boolean} succès
   */
  moveUnit(toCol, toRow) {
    const f = this.currentFighter;
    if (!f || (this.state !== 'player_turn' && this.state !== 'ai_turn')) return false;

    const effectivePm = f.getEffectivePm();
    const reachable = this.grid.getReachableCells(f.gridCol, f.gridRow, effectivePm);
    const target = reachable.find(c => c.col === toCol && c.row === toRow);
    if (!target) return false;

    // Dépense les PM
    f.spendPm(target.cost);

    // Déplace sur la grille
    this.grid.moveOccupant(f.gridCol, f.gridRow, toCol, toRow);

    // Check terrain effects (feu, piège)
    this._checkTerrainEffects(f);

    if (this._onMove) this._onMove(f, target.path);
    return true;
  }

  /**
   * Utilise un sort du fighter courant sur une case cible.
   * @returns {{ success, damage?, heal?, targets? }}
   */
  useAbility(abilityId, targetCol, targetRow) {
    const f = this.currentFighter;
    if (!f || (this.state !== 'player_turn' && this.state !== 'ai_turn')) return { success: false };
    if (!f.canUseAbility(abilityId)) return { success: false };

    const ability = f.getAbility(abilityId);
    if (!ability) return { success: false };

    // Vérifier la portée
    const dist = this.grid.manhattan(f.gridCol, f.gridRow, targetCol, targetRow);
    if (dist < ability.minRange || dist > ability.maxRange) return { success: false };

    // LdV si nécessaire
    if (ability.needsLOS && !this.grid.hasLineOfSight(f.gridCol, f.gridRow, targetCol, targetRow)) {
      return { success: false };
    }

    // Consomme PA
    f.spendPa(ability.paCost);
    ability.usesThisTurn++;
    if (ability.cooldown) ability.currentCooldown = ability.cooldown;

    // Résout l'ability
    return this._resolveAbility(f, ability, targetCol, targetRow);
  }

  /** Le fighter courant se met en mode Défense. */
  defend() {
    const f = this.currentFighter;
    if (!f || this.state !== 'player_turn') return;
    f.defend();
    this.endTurn();
  }

  // ─── Résolution ───────────────────────────────────────────────────────

  _resolveAbility(caster, ability, targetCol, targetRow) {
    // Déterminer les cases affectées
    let dirCol = 0, dirRow = 0;
    if (ability.aoeShape === 'line' || ability.aoeShape === 'cone') {
      dirCol = Math.sign(targetCol - caster.gridCol);
      dirRow = Math.sign(targetRow - caster.gridRow);
    }

    const aoeCells = this.grid.getAoeCells(
      ability.aoeShape || 'single',
      targetCol, targetRow,
      ability.aoeSize || 0,
      dirCol, dirRow
    );

    const targets = [];
    const results = [];

    for (const cell of aoeCells) {
      const occupant = this.grid.getOccupant(cell.col, cell.row);
      if (!occupant || !occupant.isAlive) continue;

      // Filtrer par targetType
      if (ability.targetType === 'enemy' && occupant.isPlayer === caster.isPlayer) continue;
      if (ability.targetType === 'ally' && occupant.isPlayer !== caster.isPlayer) continue;
      if (ability.targetType === 'self' && occupant !== caster) continue;

      targets.push(occupant);

      // Dégâts
      if (ability.damage) {
        const rawDmg = ability.damage.base + caster.getEffectiveAtk() * ability.damage.scaling;
        const variance = DAMAGE.varianceMin + Math.random() * (DAMAGE.varianceMax - DAMAGE.varianceMin);
        const finalDmg = occupant.takeDamage(Math.round(rawDmg * variance));
        results.push({ target: occupant, damage: finalDmg });
        if (this._onDamage) this._onDamage(occupant, finalDmg, false);

        if (!occupant.isAlive) {
          this._handleDeath(occupant);
        }
      }

      // Soin
      if (ability.heal) {
        const rawHeal = ability.heal.base + caster.getEffectiveAtk() * ability.heal.scaling;
        const healed = occupant.heal(Math.round(rawHeal));
        results.push({ target: occupant, heal: healed });
        if (this._onHeal) this._onHeal(occupant, healed);
      }

      // Status effect
      if (ability.statusEffect) {
        const se = ability.statusEffect;
        const chance = se.chance ?? 1;
        if (Math.random() < chance) {
          occupant.addStatusEffect({
            id: se.id,
            name: se.name || se.id,
            duration: se.duration,
            effect: { ...se.effect },
          });
          if (this._onStatusEffect) this._onStatusEffect(occupant, se);
        }
      }
    }

    // Effets spéciaux du sort
    if (ability.special) {
      this._resolveSpecialEffect(caster, ability, targetCol, targetRow, targets);
    }

    if (this._onAbilityUsed) this._onAbilityUsed(caster, ability, targets);

    // Vérifier fin de combat après résolution
    this._checkCombatEnd();

    return { success: true, targets, results };
  }

  _resolveSpecialEffect(caster, ability, targetCol, targetRow, targets) {
    const special = ability.special;

    // Repousse (push)
    if (special.push && targets.length > 0) {
      for (const t of targets) {
        const pushDir = {
          col: Math.sign(t.gridCol - caster.gridCol),
          row: Math.sign(t.gridRow - caster.gridRow),
        };
        const newCol = t.gridCol + pushDir.col * special.push;
        const newRow = t.gridRow + pushDir.row * special.push;
        if (this.grid.isWalkable(newCol, newRow)) {
          this.grid.moveOccupant(t.gridCol, t.gridRow, newCol, newRow);
        }
      }
    }

    // Recul soi (selfPush)
    if (special.selfPush) {
      const pushDir = {
        col: Math.sign(caster.gridCol - targetCol),
        row: Math.sign(caster.gridRow - targetRow),
      };
      let newCol = caster.gridCol + pushDir.col * special.selfPush;
      let newRow = caster.gridRow + pushDir.row * special.selfPush;
      // Trouver la case la plus loin accessible
      while (!this.grid.isWalkable(newCol, newRow) && (newCol !== caster.gridCol || newRow !== caster.gridRow)) {
        newCol -= pushDir.col;
        newRow -= pushDir.row;
      }
      if (this.grid.isWalkable(newCol, newRow)) {
        this.grid.moveOccupant(caster.gridCol, caster.gridRow, newCol, newRow);
      }
    }

    // Téléportation
    if (special.teleport) {
      if (this.grid.isWalkable(targetCol, targetRow)) {
        this.grid.moveOccupant(caster.gridCol, caster.gridRow, targetCol, targetRow);
      }
    }

    // Placement terrain
    if (special.placeTerrain) {
      const cells = this.grid.getAoeCells(
        special.placeTerrain.shape || 'single',
        targetCol, targetRow,
        special.placeTerrain.size || 0
      );
      for (const c of cells) {
        if (!this.grid.getOccupant(c.col, c.row)) {
          this.grid.setTempTerrain(c.col, c.row, special.placeTerrain.type, special.placeTerrain.duration);
        }
      }
    }
  }

  // ─── Mort / Terrain ───────────────────────────────────────────────────

  _handleDeath(fighter) {
    this.grid.clearOccupant(fighter.gridCol, fighter.gridRow);
    this.turns.removeFighter(fighter);
    if (this._onDeath) this._onDeath(fighter);
  }

  _checkTerrainEffects(fighter) {
    const terrain = this.grid.getTerrain(fighter.gridCol, fighter.gridRow);
    if (terrain.damagePercent) {
      const dmg = Math.round(fighter.maxHp * terrain.damagePercent / 100);
      fighter.takeDamage(dmg, null, true);
      if (this._onDamage) this._onDamage(fighter, dmg, false);
      if (!fighter.isAlive) this._handleDeath(fighter);
    }
  }

  // ─── Win/Lose ─────────────────────────────────────────────────────────

  _checkCombatEnd() {
    const playersAlive = this.playerTeam.some(f => f.isAlive);
    const enemiesAlive = this.enemyTeam.some(f => f.isAlive);

    if (!enemiesAlive) {
      this.state = 'victory';
      if (this._onCombatEnd) this._onCombatEnd('victory');
      return true;
    }
    if (!playersAlive) {
      this.state = 'defeat';
      if (this._onCombatEnd) this._onCombatEnd('defeat');
      return true;
    }
    return false;
  }

  isOver() { return this.state === 'victory' || this.state === 'defeat'; }

  // ─── Queries pour la scène ────────────────────────────────────────────

  /** Cases de déplacement valides pour le fighter courant. */
  getMovementRange() {
    const f = this.currentFighter;
    if (!f) return [];
    return this.grid.getReachableCells(f.gridCol, f.gridRow, f.getEffectivePm());
  }

  /** Cases de ciblage valides pour un sort donné. */
  getAbilityRange(abilityId) {
    const f = this.currentFighter;
    if (!f) return [];
    const ability = f.getAbility(abilityId);
    if (!ability) return [];
    return this.grid.getCellsInRange(
      f.gridCol, f.gridRow,
      ability.minRange, ability.maxRange,
      ability.needsLOS ?? false
    );
  }

  /** Cases AoE si on vise (targetCol, targetRow) avec un sort. */
  getAoePreview(abilityId, targetCol, targetRow) {
    const f = this.currentFighter;
    if (!f) return [];
    const ability = f.getAbility(abilityId);
    if (!ability) return [];

    let dirCol = 0, dirRow = 0;
    if (ability.aoeShape === 'line' || ability.aoeShape === 'cone') {
      dirCol = Math.sign(targetCol - f.gridCol);
      dirRow = Math.sign(targetRow - f.gridRow);
    }

    return this.grid.getAoeCells(
      ability.aoeShape || 'single',
      targetCol, targetRow,
      ability.aoeSize || 0,
      dirCol, dirRow
    );
  }

  // ─── Callbacks ────────────────────────────────────────────────────────

  onDamage(fn) { this._onDamage = fn; }
  onHeal(fn) { this._onHeal = fn; }
  onDeath(fn) { this._onDeath = fn; }
  onMove(fn) { this._onMove = fn; }
  onAbilityUsed(fn) { this._onAbilityUsed = fn; }
  onTurnStart(fn) { this._onTurnStart = fn; }
  onCombatEnd(fn) { this._onCombatEnd = fn; }
  onStatusEffect(fn) { this._onStatusEffect = fn; }
}
