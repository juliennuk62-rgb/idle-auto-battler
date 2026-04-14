// Combattant générique — guerrier OU monstre.
// La couche de rendu (rectangle placeholder) est isolée dans _createVisual()
// pour permettre le swap vers un vrai sprite sans toucher à la logique.

import { xpToNextLevel, statsForGradeLevel } from '../systems/Progression.js';
import { BALANCE } from '../data/balance.js';
import { gradeName, gradeTint, gradeScale, MAX_GRADE } from '../data/grades.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { TalentSystem } from '../systems/TalentSystem.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { computeSetBonus } from '../data/items.js';

export class Fighter {
  // Compteur global pour générer un id unique par instance.
  // Les ids sont consommés par la télémétrie pour corréler events et unités.
  static _nextId = 1;

  constructor(scene, x, y, config) {
    this.scene = scene;
    this.startX = x;
    this.startY = y;

    // Identification — utilisée par la télémétrie et future sauvegarde.
    this.id = config.id ?? `u${Fighter._nextId++}`;
    this.class = config.class ?? 'unknown';
    this.grade = config.grade ?? 1;
    this.level = config.level ?? 1;
    this.xp = 0; // XP accumulée dans le niveau courant (reset à chaque levelup)

    // Stats de base — mémorisées pour recomputer à chaque levelup.
    // La HP courante part à baseHp, elle sera recalculée quand level > 1.
    this.baseHp = config.hp;
    this.baseAtk = config.atk;

    this.name = config.name;
    this.color = config.color;
    this.spriteKey = config.spriteKey ?? null;
    this.spriteScale = config.spriteScale ?? 1;
    this.facing = config.facing ?? 1; // 1 = nudge vers la droite, -1 = vers la gauche
    this.targeting = config.targeting ?? 'closest'; // stratégie de ciblage
    this.abilityType = config.abilityType ?? 'single'; // 'single' | 'aoe' | 'heal'
    this.line = config.line ?? 'front'; // 'front' | 'back' — formation

    // Couleurs de classe (HP bar + label). Defaults aux valeurs historiques
    // pour ne pas casser les appels existants qui ne passent pas ces champs.
    this.hpBarColor = config.hpBarColor ?? 0x22c55e;
    this.labelColor = config.labelColor ?? '#ffffff';

    // "Rest scale" — échelle au repos du container. Vaut 1 pour un mob
    // normal, augmente pour un boss (voir setBossVisual). Tous les tweens
    // d'attaque/mort/respawn utilisent cette valeur comme référence pour
    // leurs facteurs intermédiaires.
    this.currentScale = 1;
    this.isBoss = false;

    this.maxHp = config.hp;
    this.hp = config.hp;
    this.atk = config.atk;
    this.atkSpeed = config.atk_speed;
    this.respawnDelay = config.respawn_delay;

    this.isAlive = true;
    this.attackTimer = null; // rempli par CombatSystem

    // Mouvement TD — stats lues depuis BALANCE.movement.
    const mvCfg = BALANCE.movement?.[this.class] || BALANCE.movement?.monster || {};
    this.moveSpeed = mvCfg.moveSpeed ?? 0;
    this.attackRange = mvCfg.attackRange ?? 50;
    this.isRanged = mvCfg.isRanged ?? false;
    this.engaged = false;
    this.engagedWith = null;

    // Ultimate — jauge qui se charge à chaque hit, déclenchement manuel.
    const ultCfg = BALANCE.ultimate?.[this.class];
    this.ultimateMax = ultCfg?.charges ?? 0;
    this.ultimateCharge = 0;
    this.ultimateReady = false;
    this.ultimateName = ultCfg?.name ?? null;

    this._createVisual();

    // Clamp : aucune entité ne sort du canvas (800×480). On ajuste le Y
    // pour que le bas du sprite ne dépasse pas y=475 (5px de marge).
    this._clampToCanvas();

    // Applique le visuel du grade (tint + scale) si grade > 1. Les grades
    // > 1 ne peuvent apparaître qu'après une fusion, mais on supporte le
    // cas save/load dès maintenant.
    if (this.grade > 1 && this.class !== 'monster') {
      this._applyGradeVisual();
    }

    // Si le fighter est instancié à un niveau > 1 ou grade > 1, recompute
    // les stats tout de suite.
    if (this.level > 1 || this.grade > 1) this._recomputeStats();
  }

  // --- Rendu (isolé pour swap futur vers Phaser.GameObjects.Sprite) ---

  _createVisual() {
    this.container = this.scene.add.container(this.startX, this.startY);

    // Corps : sprite PNG/GIF si fourni, sinon rectangle placeholder.
    // L'API publique (takeDamage, playAttackTween, die, respawn) ne change pas
    // entre les deux modes — _playHurtFlash() branche en interne.
    if (this.spriteKey && this.scene.textures.exists(this.spriteKey)) {
      this.body = this.scene.add.sprite(0, 0, this.spriteKey);
      this.body.setScale(this.spriteScale);
    } else {
      this.body = this.scene.add.rectangle(0, 0, 64, 64, this.color);
      this.body.setStrokeStyle(2, 0x000000);
    }

    // Label nom au-dessus — couleur selon la classe, niveau affiché en suffixe
    // pour les alliés (pas les monstres dont le "niveau" est implicite dans
    // la vague).
    this.label = this.scene.add
      .text(0, -60, this._labelText(), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: this.labelColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Barre de vie : fond gris sombre + remplissage coloré par classe.
    const hpBarY = -45;
    const hpBarWidth = 60;
    const hpBarHeight = 6;
    this.hpBarBg = this.scene.add.rectangle(0, hpBarY, hpBarWidth, hpBarHeight, 0x222222);
    this.hpBarBg.setStrokeStyle(1, 0x000000);
    this.hpBarFill = this.scene.add.rectangle(0, hpBarY, hpBarWidth, hpBarHeight, this.hpBarColor);

    // Barre d'XP (alliés uniquement) — fine, dorée, juste sous la HP bar.
    // Left-origin pour qu'elle se remplisse de gauche à droite proprement.
    // Les monstres n'ont pas d'XP, on skip la création pour eux.
    if (this.class !== 'monster') {
      const xpBarY = -36;
      const xpBarWidth = 60;
      const xpBarHeight = 2;
      this.xpBarBg = this.scene.add.rectangle(0, xpBarY, xpBarWidth, xpBarHeight, 0x333333);
      this.xpBarFill = this.scene.add
        .rectangle(-xpBarWidth / 2, xpBarY, xpBarWidth, xpBarHeight, 0xfbbf24)
        .setOrigin(0, 0.5);
      this.xpBarFill.scaleX = 0; // start empty
      this.container.add([this.body, this.label, this.hpBarBg, this.hpBarFill, this.xpBarBg, this.xpBarFill]);
    } else {
      this.container.add([this.body, this.label, this.hpBarBg, this.hpBarFill]);
    }

    // Idle breathing — légère oscillation Y du body uniquement (pas du container)
    // pour ne pas désynchroniser les barres HP
    this._startIdleAnim();
  }

  _startIdleAnim() {
    if (!this.body) return;
    // Phase aléatoire pour que toutes les unités ne respirent pas en sync
    const phase = Math.random() * Math.PI * 2;
    const baseY = this.body.y;
    this._idleTween = this.scene.tweens.addCounter({
      from: 0, to: Math.PI * 2,
      duration: 2200 + Math.random() * 600, // 2.2-2.8s
      repeat: -1,
      onUpdate: (tween) => {
        if (!this.body || !this.isAlive) return;
        // Skip si l'unité attaque ou se déplace
        if (this._isAttacking || this._isWalking) return;
        const v = tween.getValue();
        this.body.y = baseY + Math.sin(v + phase) * 1.5;
      },
    });
  }

  _labelText() {
    // Monstres : juste le nom. Alliés : [Grade] [nom] L<niveau>.
    //   Ex : "Soldat L3" (grade 2 d'un guerrier au niveau 3)
    //   Ex : "Archer L5" (grade 3 d'un archer au niveau 5 — nom du grade)
    if (this.class === 'monster') return this.name;
    const gName = gradeName(this.class, this.grade) || this.name;
    return `${gName} L${this.level}`;
  }

  /**
   * Empêche l'entité de sortir du canvas. Le bas du sprite (centre + demi-hauteur
   * × scale) ne doit pas dépasser y=475. Appelé à la création et au respawn.
   */
  _clampToCanvas() {
    if (!this.container || !this.body) return;
    const halfH = (this.body.height * this.body.scaleY * this.currentScale) / 2;
    const maxY = 475 - halfH;
    const minY = halfH + 20; // 20px marge haute (sous les labels)
    if (this.container.y > maxY) {
      this.container.y = maxY;
      this.startY = maxY;
    }
    if (this.container.y < minY) {
      this.container.y = minY;
      this.startY = minY;
    }
  }

  _updateHealthBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.scaleX = ratio;
  }

  // --- API publique utilisée par CombatSystem ---

  takeDamage(amount) {
    if (!this.isAlive) return;
    // Damage reduction (ex: ultimate Rempart du warrior).
    const reduction = this._dmgReduction || 0;
    const finalDmg = Math.max(1, Math.round(amount * (1 - reduction)));
    this.hp = Math.max(0, this.hp - finalDmg);
    this._updateHealthBar();
    this._playHurtFlash();
    if (this.hp <= 0) {
      this.die();
    }
  }

  /**
   * Restaure des HP. Utilisé par le Soigneur via CombatSystem._resolveHeal.
   * Ne dépasse pas maxHp. Déclenche un flash vert bref.
   */
  heal(amount) {
    if (!this.isAlive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._updateHealthBar();
    if (this.hp > before) this._playHealFlash();
  }

  _playHealFlash() {
    // Pulse scale bref + vert — plus subtil que le hurt flash blanc.
    // On ne touche pas au tint (risque de conflit avec grade tint).
    const rest = this.currentScale;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: rest * 1.08,
      scaleY: rest * 1.08,
      duration: 100,
      ease: 'Quad.Out',
      yoyo: true,
    });
  }

  playAttackTween() {
    if (!this.isAlive) return;

    // Animation d'attaque en 5 phases : anticipation → recul → frappe → retour → recoil
    const dir = this.facing;
    const rest = this.currentScale;
    const cx = this.container.x;
    this._isAttacking = true;

    this.scene.tweens.chain({
      targets: this.container,
      tweens: [
        // Phase 0 : anticipation (wind-up subtle, recule un peu)
        {
          x: cx - 2 * dir,
          scaleX: rest * 0.95,
          duration: 50,
          ease: 'Sine.In',
        },
        // Phase 1 : recul de préparation (squash)
        {
          x: cx - 6 * dir,
          scaleX: rest * 0.9,
          scaleY: rest * 1.1,
          duration: 60,
          ease: 'Quad.Out',
        },
        // Phase 2 : frappe rapide (stretch + lunge)
        {
          x: cx + 16 * dir,
          scaleX: rest * 1.1,
          scaleY: rest * 0.9,
          duration: 70,
          ease: 'Back.Out',
        },
        // Phase 3 : retour à la position de repos
        {
          x: cx,
          scaleX: rest,
          scaleY: rest,
          duration: 90,
          ease: 'Quad.Out',
        },
        // Phase 4 : recoil/respiration finale (micro-bounce)
        {
          scaleX: rest * 1.04,
          scaleY: rest * 0.96,
          duration: 60,
          yoyo: true,
          ease: 'Sine.InOut',
          onComplete: () => { this._isAttacking = false; },
        },
      ],
    });
  }

  die() {
    this.isAlive = false;
    if (this.attackTimer) this.attackTimer.paused = true;

    // TD : désengager le partenaire pour qu'il reprenne sa marche.
    if (this.engagedWith) {
      if (this.engagedWith.engagedWith === this) {
        this.engagedWith.disengage();
      }
      this.disengage();
    }

    // Stoppe tout tween en cours. En mode TD, l'unité meurt SUR PLACE
    // (pas de téléportation à startX — elle est peut-être au milieu du terrain).
    this.scene.tweens.killTweensOf(this.container);
    this.container.setScale(this.currentScale);
    this.container.setAngle(0);

    // Burst de particules — plus gros pour un boss (visible + mérité).
    if (this.scene.impactEmitter) {
      const count = this.isBoss ? 40 : 16;
      this.scene.impactEmitter.explode(count, this.container.x, this.container.y);
    }

    // Flash blanc à la mort
    if (this.body?.setTintFill) {
      this.body.setTintFill(0xffffff);
      this.scene.time.delayedCall(80, () => {
        if (this.body?.clearTint) this.body.clearTint();
      });
    }

    // Mort en 2 phases pour une sensation "rituelle" :
    //
    //   Phase 1 (0-120 ms)   : pop-up explosif — scale rest→rest*1.25 Back.Out.
    //   Phase 2 (120-620 ms) : shrink + rotation + fade. Quad.In accélère.
    //
    // Tous les scales sont multiplicatifs sur currentScale (rest) pour que
    // le boss (x1.4) conserve un pop-up/shrink proportionnel.
    const rest = this.currentScale;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: rest * 1.25,
      scaleY: rest * 1.25,
      duration: 120,
      ease: 'Back.Out',
      onComplete: () => {
        // Safety : le container peut avoir été détruit entre-temps.
        if (!this.container || !this.container.scene) return;
        this.scene.tweens.add({
          targets: this.container,
          alpha: 0,
          scaleX: rest * 0.15,
          scaleY: rest * 0.15,
          angle: this.facing * 180,
          duration: 500,
          ease: 'Quad.In',
          onComplete: () => {
            if (!this.container) return;
            this.container.setVisible(false);
            this.container.setAngle(0);
          },
        });
      },
    });
  }

  respawn() {
    this.hp = this.maxHp;
    this.isAlive = true;
    this._updateHealthBar();

    // Pop-in animé à la place d'une réapparition brutale :
    // on démarre à échelle 0 et on tween vers 1 avec Back.Out pour le petit
    // dépassement élastique. Sensation de "j'arrive" visible.
    this.container.x = this.startX;
    this.container.y = this.startY;
    this.container.setAngle(0); // reset la rotation laissée par die()
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setScale(0);

    // Tween vers currentScale (1 pour un mob normal, 1.4 pour un boss).
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: this.currentScale,
      scaleY: this.currentScale,
      duration: 250,
      ease: 'Back.Out',
    });

    if (this.attackTimer) this.attackTimer.paused = false;
  }

  // ---------------------------------------------------------------------------
  // API publique — modification runtime (scaling vagues, bosses)
  // ---------------------------------------------------------------------------

  /**
   * Applique de nouvelles stats à la volée (scaling vague, fusion future).
   * La HP courante est remontée à maxHp pour éviter les cas bizarres où une
   * unité à moitié morte se retrouve avec un max diminué.
   */
  rescaleStats({ hp, atk }) {
    if (typeof hp === 'number') {
      this.maxHp = hp;
      this.hp = hp;
    }
    if (typeof atk === 'number') this.atk = atk;
    this._updateHealthBar();
  }

  // ---------------------------------------------------------------------------
  // Progression — XP et niveau
  // ---------------------------------------------------------------------------

  /**
   * Ajoute de l'XP au fighter. Déclenche un (ou plusieurs) level-up si
   * le seuil est franchi. Les monstres ne gagnent pas d'XP.
   *
   * @returns {number} nombre de niveaux gagnés (0 si rien)
   */
  gainXp(amount) {
    if (this.class === 'monster') return 0;
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    // Déjà cappé : on ne stocke pas l'XP supplémentaire (sinon elle
    // s'accumulerait indéfiniment sans effet visible).
    if (xpToNextLevel(this.level) === Infinity) return 0;

    this.xp += Math.round(amount);
    let levelsGained = 0;
    let needed = xpToNextLevel(this.level);
    while (this.xp >= needed && needed !== Infinity) {
      this.xp -= needed;
      this.level += 1;
      levelsGained += 1;
      needed = xpToNextLevel(this.level);
    }

    // Une fois capé, on oublie l'excédent (la barre sera pleine).
    if (needed === Infinity) this.xp = 0;

    if (levelsGained > 0) {
      this._recomputeStats();
      this._updateLabel();
      this._playLevelUpFeedback();
    }
    this._updateXpBar();

    return levelsGained;
  }

  _recomputeStats() {
    const stats = statsForGradeLevel(
      { hp: this.baseHp, atk: this.baseAtk },
      this.grade,
      this.level
    );

    if (this.class !== 'monster') {
      // Prestige multiplicateurs.
      let hp = Math.round(stats.hp * PrestigeSystem.getHpMultiplier());
      let atk = Math.round(stats.atk * PrestigeSystem.getAtkMultiplier());

      // Hero gacha multiplicateurs + passifs.
      const heroMods = GachaSystem.getHeroModifiers(this.id);
      if (heroMods.statMult !== 1) {
        hp = Math.round(hp * heroMods.statMult);
        atk = Math.round(atk * heroMods.statMult);
      }

      // Cache les effets passifs sur le fighter pour accès rapide en combat.
      this.heroPassifs = {};
      for (const p of heroMods.passifs) {
        if (p.effect) Object.assign(this.heroPassifs, p.effect);
      }
      // Flags de passifs one-shot (reset chaque combat)
      if (this.heroPassifs.lastStand && !this._lastStandUsed) this._lastStandUsed = false;
      if (this.heroPassifs.autoRevive && !this._reviveUsed) this._reviveUsed = false;

      // Equipment bonus — items flat stats.
      const equipped = ItemSystem.getEquipped(this.id);
      const items = [equipped.weapon, equipped.armor, equipped.accessory].filter(Boolean);
      for (const item of items) {
        atk += item.stats.atk || 0;
        hp += item.stats.hp || 0;
        // Enchantements flat
        for (const e of (item.enchants || [])) {
          if (e.mode === 'flat' && e.stat === 'atk') atk += e.value;
          if (e.mode === 'flat' && e.stat === 'hp') hp += e.value;
        }
      }

      // Talents bonus.
      const talents = TalentSystem.getModifiers(this.id, this.class);
      if (talents.atkPercent) atk += Math.round(atk * talents.atkPercent / 100);
      if (talents.hpPercent) hp += Math.round(hp * talents.hpPercent / 100);

      // Hero passif aura_hp — "+20% HP alliés" (Paladin Céleste SSR).
      // Note : ce bonus s'applique uniquement au fighter porteur pour l'instant.
      for (const p of heroMods.passifs) {
        if (p.effect?.teamHpPercent) hp += Math.round(hp * p.effect.teamHpPercent / 100);
      }

      // Enchantements percent + set bonuses
      let atkPct = 0;
      let hpPct = 0;
      let speedPct = 0;
      let goldPct = 0;
      let xpPct = 0;
      for (const item of items) {
        for (const e of (item.enchants || [])) {
          if (e.mode === 'percent' && e.stat === 'atk') atkPct += e.value;
          if (e.mode === 'percent' && e.stat === 'hp') hpPct += e.value;
          if (e.mode === 'percent' && e.stat === 'speed') speedPct += e.value;
          if (e.mode === 'percent' && e.stat === 'gold') goldPct += e.value;
          if (e.mode === 'percent' && e.stat === 'xp') xpPct += e.value;
        }
      }
      const setBonus = computeSetBonus(items);
      atkPct += setBonus.atk_percent || 0;
      hpPct += setBonus.hp_percent || 0;

      this.maxHp = Math.round(hp * (1 + hpPct / 100));
      this.atk = Math.round(atk * (1 + atkPct / 100));

      // Enchantements speed, gold, xp — stockés pour lecture par CombatSystem
      if (speedPct) this.atkSpeed = Math.max(0.3, this.atkSpeed * (1 - speedPct / 100));
      this.goldBonus = goldPct;
      this.xpBonus = xpPct;
    } else {
      this.maxHp = stats.hp;
      this.atk = stats.atk;
    }
    this.hp = this.maxHp; // full heal au levelup
    this._updateHealthBar();
  }

  _updateXpBar() {
    if (!this.xpBarFill) return;
    const needed = xpToNextLevel(this.level);
    if (needed === Infinity) {
      // Cappé → barre pleine
      this.xpBarFill.scaleX = 1;
      return;
    }
    const progress = Math.max(0, Math.min(1, this.xp / needed));
    this.xpBarFill.scaleX = progress;
  }

  _updateLabel() {
    if (this.label) this.label.setText(this._labelText());
  }

  _playLevelUpFeedback() {
    // Pulse de scale sur le container — bref pop visible.
    const rest = this.currentScale;
    this.scene.tweens.add({
      targets: this.container,
      scaleX: rest * 1.22,
      scaleY: rest * 1.22,
      duration: 120,
      ease: 'Back.Out',
      yoyo: true,
    });

    // Floating text "LVL X" doré, décalé vers le haut pour ne pas se mélanger
    // avec les dégâts flottants. Reuse du pool de FloatingDamage.
    if (this.scene.floatingDamage) {
      this.scene.floatingDamage.spawn(
        this.container.x,
        this.container.y - 85,
        `LVL ${this.level}`,
        { color: '#fbbf24', critical: true }
      );
    }

    // Burst de particules doré — pas d'émetteur dédié pour les levelup, on
    // recycle impactEmitter avec un quantity plus modéré. Visible mais pas
    // envahissant vu qu'on est déjà sous le flot de particules de combat.
    if (this.scene.impactEmitter) {
      this.scene.impactEmitter.explode(10, this.container.x, this.container.y);
    }
  }

  /**
   * Applique le visuel correspondant au grade courant : tint progressif
   * sur le sprite + scale de repos (qui se propage aux tweens
   * d'attaque/mort/respawn puisqu'ils utilisent currentScale).
   *
   * Les monstres ne sont pas concernés — leur visuel boss override toute
   * logique de grade (un monstre n'a pas de grade de toute façon).
   */
  _applyGradeVisual() {
    if (this.class === 'monster') return;
    const tint = gradeTint(this.grade);
    const scale = gradeScale(this.grade);
    // Mémorise le scale au repos — les tweens d'attaque/mort/respawn le lisent.
    this.currentScale = scale;
    if (this.container) this.container.setScale(scale);
    // Tint : setTint sur un sprite multiplie. Grade 1 est 0xffffff donc no-op.
    if (this.body && this.body.setTint) {
      this.body.setTint(tint);
    }
  }

  // ---------------------------------------------------------------------------
  // Mouvement Tower Defense
  // ---------------------------------------------------------------------------

  /**
   * Appelé chaque frame par CombatScene.update(). Gère le déplacement et
   * l'engagement au contact. Les ranged ne bougent pas (moveSpeed=0).
   *
   * @param {number} delta - ms depuis la dernière frame
   * @param {Fighter[]} enemies - l'équipe adverse (pour trouver la cible)
   */
  updateMovement(delta, enemies) {
    if (!this.isAlive || !this.container) return;

    // Ranged = statique. Pas de mouvement.
    if (this.isRanged) return;

    // Si engagé avec une cible vivante et à portée → reste immobile.
    if (this.engaged && this.engagedWith) {
      if (!this.engagedWith.isAlive) {
        // La cible est morte → désengagement, reprendre la marche.
        this.disengage();
      } else {
        return; // combat en cours, pas de mouvement
      }
    }

    // Pas engagé → cherche la cible vivante la plus proche.
    const target = this._findClosestAlive(enemies);
    if (!target) return;

    const dx = target.container.x - this.container.x;
    const dist = Math.abs(dx);

    if (dist <= this.attackRange) {
      // À portée → ENGAGEMENT. Stop walking.
      this._stopWalking();
      this.engaged = true;
      this.engagedWith = target;
      // L'autre s'engage aussi si c'est un mêlée.
      if (!target.isRanged && !target.engaged) {
        target.engaged = true;
        target.engagedWith = this;
      }
      // Flash d'engagement.
      this._playHurtFlash();
    } else {
      // Trop loin → marche vers la cible.
      const direction = dx > 0 ? 1 : -1;
      this.container.x += direction * this.moveSpeed * (delta / 1000);
      // Bobbing : oscillation Y du body pendant la marche
      this._isWalking = true;
      this._walkPhase = (this._walkPhase || 0) + delta * 0.012;
      if (this.body) {
        this.body.y = Math.sin(this._walkPhase) * 2.5;
      }
    }
  }

  _stopWalking() {
    if (this._isWalking) {
      this._isWalking = false;
      if (this.body) this.body.y = 0;
    }
  }

  disengage() {
    this.engaged = false;
    this.engagedWith = null;
  }

  _findClosestAlive(enemies) {
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.isAlive || !e.container) continue;
      const d = Math.abs(this.container.x - e.container.x);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  /**
   * Vérifie si cette unité a au moins un ennemi dans sa portée d'attaque.
   */
  hasEnemyInRange(enemies) {
    for (const e of enemies) {
      if (!e.isAlive || !e.container) continue;
      const d = Math.abs(this.container.x - e.container.x);
      if (d <= this.attackRange) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Ultimates
  // ---------------------------------------------------------------------------

  chargeUltimate() {
    if (this.ultimateMax <= 0 || this.ultimateReady) return;
    // Passif charge_rapide : ultime charge 2× plus vite
    const chargeAmount = this.heroPassifs?.ultChargeBonus ? 2 : 1;
    this.ultimateCharge = Math.min(this.ultimateMax, this.ultimateCharge + chargeAmount);
    if (this.ultimateCharge >= this.ultimateMax) {
      this.ultimateReady = true;
    }
    this._updateUltimateGlow();
  }

  _updateUltimateGlow() {
    if (!this.container || this.ultimateMax <= 0) return;
    const ratio = this.ultimateCharge / this.ultimateMax;
    if (ratio < 0.3) {
      // Pas assez chargé pour afficher l'aura
      if (this._ultGlow) { this._ultGlow.destroy(); this._ultGlow = null; }
      return;
    }
    // Crée l'aura si pas encore là
    if (!this._ultGlow) {
      this._ultGlow = this.scene.add.circle(0, 5, 28, 0xfbbf24, 0.15);
      this._ultGlow.setDepth(-1);
      this.container.addAt(this._ultGlow, 0); // derrière le sprite
    }
    // Intensité proportionnelle à la charge
    this._ultGlow.setAlpha(0.1 + ratio * 0.35);
    this._ultGlow.setScale(0.8 + ratio * 0.4);

    // Si plein → pulse continu
    if (this.ultimateReady && !this._ultGlowPulse) {
      this._ultGlowPulse = this.scene.tweens.add({
        targets: this._ultGlow,
        scale: 1.4,
        alpha: 0.55,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  resetUltimate() {
    this.ultimateCharge = 0;
    this.ultimateReady = false;
    if (this._ultGlowPulse) { this._ultGlowPulse.stop(); this._ultGlowPulse = null; }
    if (this._ultGlow) { this._ultGlow.destroy(); this._ultGlow = null; }
  }

  /**
   * Bascule entre visuel "mob normal" et "boss" : tint rouge sur le sprite,
   * scale au repos augmenté. Les tweens (attaque/mort/respawn) utilisent
   * currentScale comme ancre, donc le changement se propage automatiquement.
   */
  setBossVisual(isBoss) {
    this.isBoss = isBoss;
    this.currentScale = isBoss ? 1.4 : 1;

    if (this.body) {
      if (isBoss) {
        // Sprite : tint rouge-orangé. Rectangle fallback : fill plus sombre.
        if (this.body.setTint) this.body.setTint(0xff6060);
        else if (this.body.setFillStyle) this.body.setFillStyle(0xaa2020);
      } else {
        if (this.body.clearTint) this.body.clearTint();
        else if (this.body.setFillStyle) this.body.setFillStyle(this.color);
      }
    }
  }

  // --- Interne ---

  _playHurtFlash() {
    // Flash blanc 120ms (allongé pour meilleure visibilité)
    if (this.body.setTintFill) {
      this.body.setTintFill(0xffffff);
    } else {
      this.body.setFillStyle(0xffffff);
    }
    this.scene.time.delayedCall(120, () => {
      if (!this.body || !this.body.scene) return;
      if (this.body.clearTint) {
        this.body.clearTint();
      } else {
        this.body.setFillStyle(this.color);
      }
    });
  }

  /**
   * Applique un knockback visuel sur cette unité (la cible).
   * @param {number} fromX — X de l'attaquant (pour calculer la direction)
   * @param {number} intensity — pixels de recul (typique : 8-15)
   */
  applyKnockback(fromX, intensity = 10) {
    if (!this.isAlive || !this.container) return;
    const dir = this.container.x > fromX ? 1 : -1;
    const startX = this.container.x;
    const targetX = startX + dir * intensity;
    const tiltAngle = dir * 5; // 5° tilt dans la direction du knockback

    // Phase 1 : push-back rapide
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      angle: tiltAngle,
      duration: 100,
      ease: 'Quad.Out',
      onComplete: () => {
        // Phase 2 : retour à la position d'origine
        if (!this.container || !this.isAlive) return;
        this.scene.tweens.add({
          targets: this.container,
          x: startX,
          angle: 0,
          duration: 180,
          ease: 'Quad.Out',
        });
      },
    });
  }
}
