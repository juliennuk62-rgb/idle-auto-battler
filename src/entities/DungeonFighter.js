// DungeonFighter — entité de combat tour par tour en donjon.
// Ne extend PAS Fighter directement (évite les dépendances Phaser dans le constructeur).
// C'est une entité autonome qui porte ses propres stats, position grille,
// PA/PM, sorts, et status effects. Le rendu Phaser est géré par DungeonCombatScene.

import { CLASS_STATS, DAMAGE } from '../data/dungeonConfig.js';

let _nextId = 1;

export class DungeonFighter {
  /**
   * @param {object} config
   * @param {string} config.id — identifiant unique
   * @param {string} config.name — nom affiché
   * @param {string} config.class — 'warrior'|'archer'|'mage'|'healer'|'monster'
   * @param {boolean} config.isPlayer — true si contrôlé par le joueur
   * @param {number} config.hp — HP max
   * @param {number} config.atk — ATK de base
   * @param {number} config.gridCol — position initiale colonne
   * @param {number} config.gridRow — position initiale ligne
   * @param {number} [config.pa] — PA max (override)
   * @param {number} [config.pm] — PM max (override)
   * @param {number} [config.initiative] — initiative (override)
   * @param {object[]} [config.abilities] — sorts disponibles
   * @param {string} [config.spriteKey] — clé sprite Phaser
   * @param {string} [config.aiType] — type d'IA ('rush'|'kite'|'heal'|'support')
   * @param {boolean} [config.isBoss] — est un boss
   */
  constructor(config) {
    this.id = config.id || `df_${_nextId++}`;
    this.name = config.name || 'Unknown';
    this.class = config.class || 'monster';
    this.isPlayer = config.isPlayer ?? false;
    this.isBoss = config.isBoss ?? false;
    this.spriteKey = config.spriteKey || null;
    this.aiType = config.aiType || 'rush';

    // Stats de base
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.atk = config.atk;

    // Position sur la grille
    this.gridCol = config.gridCol ?? 0;
    this.gridRow = config.gridRow ?? 0;

    // PA / PM
    const classStats = CLASS_STATS[this.class] || {};
    this.maxPa = config.pa ?? classStats.pa ?? 5;
    this.maxPm = config.pm ?? classStats.pm ?? 3;
    this.pa = this.maxPa;
    this.pm = this.maxPm;
    this.initiative = config.initiative ?? classStats.initiative ?? 15;

    // Sorts (abilities)
    this.abilities = (config.abilities || []).map(a => ({
      ...a,
      currentCooldown: 0,
      usesThisTurn: 0,
    }));

    // Status effects : [{ id, name, duration, effect: {...}, source }]
    this.statusEffects = [];

    // État
    this.isAlive = true;
    this.isDefending = false;
    this.damageReduction = 0; // bonus from Defend + buffs

    // Référence au container Phaser (set par DungeonCombatScene)
    this.container = null;
    this.hpBarFill = null;
    this.hpBarBg = null;
    this.label = null;
  }

  // ─── Tour ─────────────────────────────────────────────────────────────

  /** Reset PA/PM en début de tour. */
  resetTurnResources() {
    this.pa = this.maxPa;
    this.pm = this.maxPm;
    this.isDefending = false;
    this.damageReduction = this._computeDamageReduction();

    // Reset uses per turn sur les sorts
    for (const a of this.abilities) {
      a.usesThisTurn = 0;
    }
  }

  /** Tick les status effects (appelé en début de tour). */
  tickStatusEffects() {
    const toRemove = [];
    for (const se of this.statusEffects) {
      // Appliquer les effets de tick (poison, regen, etc.)
      if (se.effect.poisonPercent && this.isAlive) {
        const dmg = Math.round(this.maxHp * se.effect.poisonPercent / 100);
        this.takeDamage(dmg, null, true); // true = ignoreReduction
      }
      if (se.effect.healPercent && this.isAlive) {
        const heal = Math.round(this.maxHp * se.effect.healPercent / 100);
        this.heal(heal);
      }

      se.duration--;
      if (se.duration <= 0) toRemove.push(se);
    }
    for (const se of toRemove) {
      this.removeStatusEffect(se.id);
    }
  }

  /** Réduit les cooldowns de tous les sorts (appelé en fin de tour). */
  tickCooldowns() {
    for (const a of this.abilities) {
      if (a.currentCooldown > 0) a.currentCooldown--;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────

  canSpendPa(amount) { return this.pa >= amount; }
  canSpendPm(amount) { return this.pm >= amount; }

  spendPa(amount) {
    this.pa = Math.max(0, this.pa - amount);
  }

  spendPm(amount) {
    this.pm = Math.max(0, this.pm - amount);
  }

  /** Le fighter passe en mode Défense (consomme tout PA restant). */
  defend() {
    this.isDefending = true;
    this.pa = 0;
    this.damageReduction = this._computeDamageReduction();
  }

  // ─── Dégâts / Soin ────────────────────────────────────────────────────

  /**
   * Inflige des dégâts au fighter.
   * @returns {number} dégâts réels infligés
   */
  takeDamage(rawDamage, source = null, ignoreReduction = false) {
    if (!this.isAlive) return 0;

    let finalDamage = rawDamage;
    if (!ignoreReduction) {
      finalDamage = Math.round(rawDamage * (1 - this.damageReduction));
    }
    finalDamage = Math.max(1, finalDamage);

    this.hp = Math.max(0, this.hp - finalDamage);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
    }
    return finalDamage;
  }

  heal(amount) {
    if (!this.isAlive) return 0;
    // Check anti-heal status
    if (this.hasStatusEffect('no_heal')) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  // ─── Status Effects ───────────────────────────────────────────────────

  addStatusEffect(se) {
    // Remplace si même id existe déjà (refresh durée)
    const existing = this.statusEffects.find(s => s.id === se.id);
    if (existing) {
      existing.duration = Math.max(existing.duration, se.duration);
      existing.effect = { ...existing.effect, ...se.effect };
      return;
    }
    this.statusEffects.push({ ...se });
    this.damageReduction = this._computeDamageReduction();
  }

  removeStatusEffect(id) {
    this.statusEffects = this.statusEffects.filter(s => s.id !== id);
    this.damageReduction = this._computeDamageReduction();
  }

  hasStatusEffect(id) {
    return this.statusEffects.some(s => s.id === id);
  }

  /** Retire tous les debuffs (pour Purification). */
  purgeDebuffs() {
    this.statusEffects = this.statusEffects.filter(s => !s.effect.isDebuff);
    this.damageReduction = this._computeDamageReduction();
  }

  // ─── Calculs internes ─────────────────────────────────────────────────

  _computeDamageReduction() {
    let reduction = 0;
    if (this.isDefending) reduction += DAMAGE.defendReduction;
    for (const se of this.statusEffects) {
      if (se.effect.damageReduction) reduction += se.effect.damageReduction;
    }
    return Math.min(0.75, reduction); // cap 75%
  }

  /** ATK effective (base + buffs). */
  getEffectiveAtk() {
    let atk = this.atk;
    for (const se of this.statusEffects) {
      if (se.effect.atkPercent) atk = Math.round(atk * (1 + se.effect.atkPercent / 100));
      if (se.effect.atkFlat) atk += se.effect.atkFlat;
    }
    return Math.max(1, atk);
  }

  /** PM effectif (base - debuffs). */
  getEffectivePm() {
    let pm = this.pm;
    for (const se of this.statusEffects) {
      if (se.effect.pmModifier) pm += se.effect.pmModifier;
    }
    return Math.max(0, pm);
  }

  /** PA effectif (base - debuffs). */
  getEffectivePa() {
    let pa = this.pa;
    for (const se of this.statusEffects) {
      if (se.effect.paModifier) pa += se.effect.paModifier;
    }
    return Math.max(0, pa);
  }

  // ─── Queries ──────────────────────────────────────────────────────────

  /** Peut utiliser ce sort ? (assez de PA, pas en CD, pas max uses/tour) */
  canUseAbility(abilityId) {
    const a = this.abilities.find(ab => ab.id === abilityId);
    if (!a) return false;
    if (a.currentCooldown > 0) return false;
    if (a.maxUsesPerTurn > 0 && a.usesThisTurn >= a.maxUsesPerTurn) return false;
    if (this.getEffectivePa() < a.paCost) return false;
    if (this.hasStatusEffect('frozen')) return false;
    return true;
  }

  getAbility(abilityId) {
    return this.abilities.find(a => a.id === abilityId) || null;
  }

  /** HP en pourcentage (0-1). */
  hpPercent() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}
