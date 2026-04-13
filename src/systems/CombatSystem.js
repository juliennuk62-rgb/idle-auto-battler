// Orchestre le combat entre deux équipes de Fighter.
// Ne touche JAMAIS au rendu — passe uniquement par l'API publique de Fighter.
//
// Étape 2 : généralisé N vs M + ciblage dynamique par stratégie.
// Étape 2 bis : télémétrie (events combat_started / attack_performed / etc.).
// Étape 3 : vagues avec scaling + boss tous les N vagues + bandeau d'annonce.
//
// Flow d'une transition de vague :
// 1. Monstre meurt → endCombat(victory)
// 2. On calcule la wave suivante et ses stats (normal ou boss)
// 3. Si boss : on déclenche le WaveBanner et on utilise boss_intro_delay
// 4. Après le délai, on applique rescaleStats + setBossVisual au monstre,
//    on le respawn (qui tween vers la nouvelle currentScale), puis
//    startCombat pour la nouvelle wave.

import { TelemetrySystem } from './TelemetrySystem.js';
import { MissionSystem } from './MissionSystem.js';
import { ResourceSystem } from './ResourceSystem.js';
import { PrestigeSystem } from './PrestigeSystem.js';
import { computeXpReward } from './Progression.js';
import { BALANCE } from '../data/balance.js';
import { biomeForWave } from '../data/biomes.js';
import { pickMonster, monsterCountForWave } from '../data/monsters.js';
import { Fighter } from '../entities/Fighter.js';
import { ItemSystem } from './ItemSystem.js';

/**
 * Calcule les stats d'un monstre pour une wave donnée.
 * Formule : hp = hp_base * hp_growth^(wave-1), idem atk.
 * Si la wave est un multiple de boss_interval → multiplie par boss_hp_mult/atk_mult.
 */
function computeMonsterStats(wave) {
  const base = BALANCE.monster;
  const waveConfig = BALANCE.wave;
  const waveIdx = Math.max(0, wave - 1);

  const hp = base.hp * Math.pow(base.hp_growth, waveIdx);
  const atk = base.atk * Math.pow(base.atk_growth, waveIdx);
  const isBoss = wave > 0 && wave % waveConfig.boss_interval === 0;

  return {
    hp: Math.max(1, Math.round(isBoss ? hp * waveConfig.boss_hp_mult : hp)),
    atk: Math.max(1, Math.round(isBoss ? atk * waveConfig.boss_atk_mult : atk)),
    isBoss,
  };
}

/**
 * Calcule la récompense en or + gems pour le kill d'un monstre à une wave
 * donnée. Les bosses rapportent un multiple d'or + 1 gem.
 */
function computeKillReward(wave) {
  const goldConfig = BALANCE.gold;
  const waveIdx = Math.max(0, wave - 1);
  let gold = goldConfig.per_kill_base * Math.pow(goldConfig.growth, waveIdx);
  let gems = 0;

  const isBoss = wave > 0 && wave % BALANCE.wave.boss_interval === 0;
  if (isBoss) {
    gold *= goldConfig.boss_mult;
    gems = goldConfig.gems_per_boss;
  }

  // Multiplicateur prestige — appliqué en dernière couche sur l'or.
  gold *= PrestigeSystem.getGoldMultiplier();

  return {
    gold: Math.max(1, Math.round(gold)),
    gems,
    isBoss,
  };
}

export class CombatSystem {
  constructor(scene, teamA, teamB) {
    this.scene = scene;
    this.teamA = teamA; // Fighter[]
    this.teamB = teamB; // Fighter[]
    this.currentWave = 1;

    // Accumulateurs de récompense pour la wave courante. Reset à chaque
    // startCombat (in telemetry). Permet de passer le vrai gold à
    // endCombat au lieu du stub 0.
    this.combatGoldEarned = 0;
    this.combatGemsEarned = 0;

    // Phase du combat : 'combat' (actif) ou 'preparation' (pause biome).
    this.phase = 'combat';
    this.defeated = false;

    // Stats du biome courant pour le récap.
    this._biomeStats = { gold: 0, items: 0, deaths: 0, wavesCleared: 0, lootLog: [] };
  }

  start() {
    TelemetrySystem.startCombat(this.currentWave, this.teamA, this.teamB);
    // Timers teamA : démarrés ici une seule fois au boot de la scène.
    // Timers teamB : démarrés par _spawnWaveMonsters() (qui gère aussi
    // le respawn à chaque transition de vague). Pas de double-démarrage.
    for (const f of this.teamA) this._startAttackTimer(f, this.teamB);
  }

  // ---------------------------------------------------------------------------
  // Team dynamique — ajout / retrait à chaud (fusion, recruit, etc.)
  // ---------------------------------------------------------------------------

  /**
   * Ajoute un fighter à teamA (= équipe joueur) et démarre son timer d'attaque.
   * Utilisé par la fusion pour injecter le résultat dans le combat en cours.
   */
  addAlly(fighter) {
    if (!fighter) return;
    if (!this.teamA.includes(fighter)) this.teamA.push(fighter);
    this._startAttackTimer(fighter, this.teamB);
  }

  /**
   * Retire un fighter de teamA : stop son timer, détruit son container,
   * enlève de l'array. Utilisé par la fusion pour consommer les 3 unités.
   */
  removeAlly(fighter) {
    if (!fighter) return;
    const idx = this.teamA.indexOf(fighter);
    if (idx === -1) return;
    if (fighter.attackTimer) {
      fighter.attackTimer.remove();
      fighter.attackTimer = null;
    }
    this.teamA.splice(idx, 1);
    // Le caller peut vouloir garder le fighter pour une animation ; on
    // détruit le container seulement si le caller le demande.
  }

  _startAttackTimer(attacker, enemyTeam) {
    attacker.attackTimer = this.scene.time.addEvent({
      delay: attacker.atkSpeed * 1000,
      loop: true,
      callback: () => this._resolveAttack(attacker, enemyTeam),
    });
  }

  // ---------------------------------------------------------------------------
  // Résolution d'attaque — routage par abilityType
  // ---------------------------------------------------------------------------

  _resolveAttack(attacker, enemyTeam) {
    if (!attacker.isAlive) return;

    // TD : les mêlée ne tapent que si ENGAGÉS. Les ranged que si un ennemi
    // est dans leur portée. Le healer est exempté (il heal les alliés).
    if (attacker.abilityType !== 'heal') {
      if (!attacker.isRanged && !attacker.engaged) return;
      if (attacker.isRanged && !attacker.hasEnemyInRange(enemyTeam)) return;
    }

    // Routage par type d'ability (single-target / AoE / heal).
    if (attacker.abilityType === 'heal') return this._resolveHeal(attacker);
    if (attacker.abilityType === 'aoe') return this._resolveAoE(attacker, enemyTeam);

    // --- Mode par défaut : single-target (warrior, archer, monster) ---
    const target = attacker.engaged && attacker.engagedWith?.isAlive
      ? attacker.engagedWith
      : this._pickTarget(attacker, enemyTeam);
    if (!target) return;
    attacker.playAttackTween();

    // Ranged → projectile visuel, dégât à l'arrivée.
    // Mêlée → dégât instantané.
    if (attacker.isRanged && this.scene.launchProjectile) {
      this.scene.launchProjectile(attacker, target, () => {
        if (!target.isAlive) return; // mort entre-temps
        this._applyDamage(attacker, target);
        if (!target.isAlive) this._handleKill(attacker, target, enemyTeam);
      });
    } else {
      this._applyDamage(attacker, target);
      if (!target.isAlive) this._handleKill(attacker, target, enemyTeam);
    }
  }

  // --- AoE (mage) : projectile vers CHAQUE ennemi vivant ---
  _resolveAoE(attacker, enemyTeam) {
    const alive = enemyTeam.filter((f) => f.isAlive);
    if (alive.length === 0) return;
    attacker.playAttackTween();

    for (const target of alive) {
      if (this.scene.launchProjectile) {
        this.scene.launchProjectile(attacker, target, () => {
          if (!target.isAlive) return;
          this._applyDamage(attacker, target);
          if (!target.isAlive) this._handleKill(attacker, target, enemyTeam);
        });
      } else {
        this._applyDamage(attacker, target);
        if (!target.isAlive) this._handleKill(attacker, target, enemyTeam);
      }
    }
  }

  // --- Heal (soigneur) : soigne l'allié le plus blessé ---
  _resolveHeal(healer) {
    const allies = this.teamA.filter(
      (f) => f.isAlive && f !== healer && f.hp < f.maxHp
    );
    if (allies.length === 0) return; // tout le monde est full HP → skip

    // Cible : allié vivant avec le plus bas ratio HP/maxHP.
    const target = allies.reduce((a, b) =>
      a.hp / a.maxHp < b.hp / b.maxHp ? a : b
    );

    healer.playAttackTween();

    const variance = 0.85 + Math.random() * 0.30;
    const healAmount = Math.max(1, Math.round(healer.atk * variance));
    const hpBefore = target.hp;
    target.heal(healAmount);
    const actualHeal = target.hp - hpBefore;

    // Floating heal vert.
    if (this.scene.floatingDamage && actualHeal > 0) {
      this.scene.floatingDamage.spawn(
        target.container.x,
        target.container.y - 50,
        `+${actualHeal}`,
        { color: '#22c55e' }
      );
    }

    // Télémétrie : soin effectué.
    TelemetrySystem.recordEvent('heal_performed', {
      healerId: healer.id,
      targetId: target.id,
      amount: actualHeal,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers partagés — dommage et mort
  // ---------------------------------------------------------------------------

  /**
   * Applique des dégâts (avec variance) d'un attaquant à une cible.
   * Gère : floating damage, particules, télémétrie attack_performed.
   */
  _applyDamage(attacker, target) {
    const variance = 0.85 + Math.random() * 0.30;
    const dmg = Math.max(1, Math.round(attacker.atk * variance));

    const hpBefore = target.hp;
    target.takeDamage(dmg);
    const actualDamage = hpBefore - target.hp;

    // Floating damage.
    if (this.scene.floatingDamage) {
      this.scene.floatingDamage.spawn(
        target.container.x,
        target.container.y - 50,
        actualDamage
      );
    }

    // Particules hit.
    if (this.scene.hitEmitter) {
      this.scene.hitEmitter.explode(5, target.container.x, target.container.y);
    }

    // Charge ultime de l'attaquant (+1 par hit réussi).
    // Déclenchement automatique dès que la jauge est pleine.
    if (actualDamage > 0 && attacker.chargeUltimate) {
      attacker.chargeUltimate();
      if (attacker.ultimateReady) {
        this.executeUltimate(attacker);
      }
    }

    // Télémétrie.
    TelemetrySystem.recordEvent('attack_performed', {
      attackerId: attacker.id,
      targetId: target.id,
      damage: actualDamage,
      damageBlocked: 0,
      critical: false,
    });
  }

  /**
   * Gère tout ce qui se passe quand une cible meurt : hit stop, shake,
   * combo, rewards, XP, transition de vague. Extrait du _resolveAttack
   * original pour être réutilisable par _resolveAoE.
   */
  _handleKill(attacker, target, enemyTeam) {
    const wasEnemy = enemyTeam === this.teamB;

    // Hit stop.
    this.scene.tweens.pauseAll();
    this.scene.time.delayedCall(60, () => {
      if (this.scene && this.scene.tweens) this.scene.tweens.resumeAll();
    });

    // Shake + zoom pour kills ennemis uniquement.
    if (wasEnemy) {
      this.scene.cameras.main.shake(90, 0.005);
      const cam = this.scene.cameras.main;
      const originalZoom = cam.zoom;
      this.scene.tweens.add({
        targets: cam,
        zoom: originalZoom * 1.03,
        duration: 80,
        yoyo: true,
        ease: 'Quad.Out',
      });
    }

    // Télémétrie : mort.
    TelemetrySystem.recordEvent('unit_died', {
      unitId: target.id,
      side: wasEnemy ? 'enemy' : 'ally',
      killedBy: attacker.id,
    });

    // Combo counter.
    if (wasEnemy && this.scene.comboCounter) {
      this.scene.comboCounter.registerKill();
    }

    // Mission tracking — kills + boss_kills + gold.
    if (wasEnemy) {
      MissionSystem.track('kills', 1);
      if (target.isBoss) MissionSystem.track('boss_kills', 1);
    }

    // Track des morts alliées pour le récap biome.
    if (!wasEnemy) this._biomeStats.deaths++;

    // Récompense or + gems.
    if (wasEnemy) {
      const reward = computeKillReward(this.currentWave);
      ResourceSystem.addGold(reward.gold);
      this.combatGoldEarned += reward.gold;
      MissionSystem.track('gold_earned', reward.gold);
      if (reward.gems > 0) {
        ResourceSystem.addGems(reward.gems);
        this.combatGemsEarned += reward.gems;
      }
      if (this.scene.floatingDamage?.spawnReward) {
        this.scene.floatingDamage.spawnReward(
          target.container.x,
          target.container.y - 75,
          reward.gold,
          { type: 'gold' }
        );
        if (reward.gems > 0) {
          this.scene.floatingDamage.spawnReward(
            target.container.x + 30,
            target.container.y - 75,
            reward.gems,
            { type: 'gems', delay: 200 }
          );
        }
      }

      // Loot roll — chance de dropper un item.
      const biome = biomeForWave(this.currentWave);
      const isBossWave = this.currentWave % BALANCE.wave.boss_interval === 0;
      const lootItem = ItemSystem.rollLoot(biome.id, this.currentWave, isBossWave);
      if (lootItem) {
        this._biomeStats.items++;
        MissionSystem.track('items_gained', 1);
        if (!this._biomeStats.lootLog) this._biomeStats.lootLog = [];
        this._biomeStats.lootLog.push(lootItem);
      }
      if (lootItem && this.scene.floatingDamage) {
        // Floating icon colorée par rareté.
        this.scene.floatingDamage.spawn(
          target.container.x + 20,
          target.container.y - 30,
          `${lootItem.icon} ${lootItem.rarityName}`,
          { color: lootItem.rarityColor }
        );
      }

      // XP distribution.
      const xpReward = computeXpReward(this.currentWave);
      for (const ally of this.teamA) {
        if (!ally.isAlive) continue;
        const levelBefore = ally.level;
        ally.gainXp(xpReward);
        if (ally.level > levelBefore) {
          TelemetrySystem.recordEvent('unit_levelup', {
            unitId: ally.id,
            oldLevel: levelBefore,
            newLevel: ally.level,
          });
        }
      }
    }

      // Fin de vague : si toute la teamB est morte, on clôture le combat
      // et on spawne la vague suivante.
      if (wasEnemy && this.teamB.every((f) => !f.isAlive)) {
        TelemetrySystem.endCombat({
          outcome: 'victory',
          gold: this.combatGoldEarned,
          xp: 0,
        });
        this.combatGoldEarned = 0;
        this.combatGemsEarned = 0;

        const nextWave = this.currentWave + 1;
        const nextStats = computeMonsterStats(nextWave);

        // Détection de changement de biome.
        const currentBiome = biomeForWave(this.currentWave);
        const nextBiome = biomeForWave(nextWave);
        const biomeChanged = currentBiome.id !== nextBiome.id;

        // Track wave cleared pour le récap + missions.
        this._biomeStats.wavesCleared++;
        MissionSystem.trackMax('max_wave', nextWave);
        this._biomeStats.gold += this.combatGoldEarned;

        // Victoire du biome : si on a atteint la wave max → retour carte.
        const maxWaves = this.scene._maxWavesInBiome || 999;
        if (this.currentWave >= maxWaves) {
          if (this.scene.endCombatAndReturn) {
            this.scene.endCombatAndReturn(true);
          }
          return; // stop — pas de spawn de wave suivante.
        }

        if (biomeChanged) {
          // BIOME CHANGE → phase de préparation (pause + overlay + "Prêt").
          this.phase = 'preparation';
          // Pause tous les timers alliés.
          for (const f of this.teamA) {
            if (f.attackTimer) f.attackTimer.paused = true;
          }
          // Unlock équipement.
          if (typeof ItemSystem !== 'undefined') ItemSystem.equipmentLocked = false;
          // Swap le biome visuellement.
          if (this.scene.setBiome) this.scene.setBiome(nextBiome, false);
          // Affiche l'overlay de préparation via la scène.
          if (this.scene._showPreparation) {
            this.scene._showPreparation(nextWave, nextBiome, { ...this._biomeStats });
          }
          // Reset stats biome pour le prochain.
          this._biomeStats = { gold: 0, items: 0, deaths: 0, wavesCleared: 0, lootLog: [] };
          // Le bouton "Prêt" appellera startNextBiome().
          this._pendingNextWave = nextWave;
        } else {
          if (nextStats.isBoss && this.scene.waveBanner) {
            const localWave = ((nextWave - 1) % 10) + 1;
            this.scene.waveBanner.show('BOSS', `VAGUE ${localWave}/10`);
          }
          const delayMs = nextStats.isBoss
            ? BALANCE.wave.boss_intro_delay * 1000
            : BALANCE.monster.respawn_delay * 1000;
          this.scene.time.delayedCall(delayMs, () => {
            this._spawnWaveMonsters(nextWave);
            this.currentWave = nextWave;
            TelemetrySystem.startCombat(this.currentWave, this.teamA, this.teamB);
          });
        }
      } else if (!wasEnemy) {
        // Mort d'un allié — PAS de respawn. Le joueur perd si toute
        // l'équipe est morte. C'est le core gameplay : si on meurt, on a
        // perdu la vague. Il faut restart ou prestige.
        if (this.teamA.every((f) => !f.isAlive)) {
          // GAME OVER — toute l'équipe est morte.
          TelemetrySystem.endCombat({
            outcome: 'defeat',
            gold: this.combatGoldEarned,
            xp: 0,
          });
          this.combatGoldEarned = 0;
          this.combatGemsEarned = 0;

          // Stop tous les timers monstres pour figer le combat.
          for (const m of this.teamB) {
            if (m.attackTimer) m.attackTimer.paused = true;
          }

          // Bandeau DEFEAT.
          if (this.scene.waveBanner) {
            const defeatLocal = ((this.currentWave - 1) % 10) + 1;
            this.scene.waveBanner.show('DÉFAITE', `VAGUE ${defeatLocal}/10`, {
              holdMs: 3000,
              borderColor: 0xef4444,
            });
          }

          this.defeated = true;

          // Retour à la carte après la défaite.
          if (this.scene.endCombatAndReturn) {
            this.scene.endCombatAndReturn(false);
          }
        }
      }
  }

  // ---------------------------------------------------------------------------
  // Spawn de vague — crée N monstres pour une wave donnée
  // ---------------------------------------------------------------------------

  /**
   * Détruit les monstres de la wave précédente et en crée de nouveaux.
   * Utilisé pour la transition entre vagues ET pour le setup initial si
   * la scène démarre à une wave > 1 (save/load).
   */
  _spawnWaveMonsters(wave) {
    // Détruire les anciens monstres.
    for (const m of this.teamB) {
      if (m.attackTimer) { m.attackTimer.remove(); m.attackTimer = null; }
      if (m.container) m.container.destroy();
    }
    this.teamB.length = 0;

    const stats = computeMonsterStats(wave);
    const wCfg = BALANCE.wave;
    const count = monsterCountForWave(wave, wCfg.boss_interval, wCfg.monster_count_divisor, wCfg.max_monsters);
    const biome = biomeForWave(wave);
    const isBoss = stats.isBoss;

    // HP divisé entre les mobs d'une wave (le total reste constant).
    // ATK inchangé par mob → plus de mobs = plus de DPS total (difficulté qui monte).
    const hpPerMob = Math.max(1, Math.round(stats.hp / count));
    const atkPerMob = stats.atk;

    // Positions empilées verticalement à droite.
    const positions = this._monsterPositions(count);

    for (let i = 0; i < count; i++) {
      const monsterInfo = pickMonster(biome.id, isBoss);
      // Grossit les monstres : ×1.3 si sprite dédié, ×3 si fallback (tkobold).
      const scale = monsterInfo.spriteScale === 1 ? 1.3 : monsterInfo.spriteScale;
      const m = new Fighter(this.scene, positions[i].x, positions[i].y, {
        ...BALANCE.monster,
        name: monsterInfo.name,
        spriteKey: monsterInfo.spriteKey,
        spriteScale: scale,
        color: 0xef4444,
        facing: -1,
      });
      m.rescaleStats({ hp: hpPerMob, atk: atkPerMob });
      m.setBossVisual(isBoss);

      // Pop-in animé : on set invisible puis respawn tween.
      m.container.setAlpha(0);
      m.container.setScale(0);
      m.respawn();

      this.teamB.push(m);
      this._startAttackTimer(m, this.teamA);
    }
  }

  _monsterPositions(count) {
    // TD : monstres spawent au bord DROIT du canvas (x=750) et marchent
    // vers la gauche. Empilés verticalement.
    const baseX = 750;
    const groundCenter = 410;
    if (count === 1) return [{ x: baseX, y: groundCenter }];
    const spacing = Math.min(40, 120 / (count - 1));
    const startY = groundCenter - ((count - 1) * spacing) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: baseX,
      y: Math.round(startY + i * spacing),
    }));
  }

  // ---------------------------------------------------------------------------
  // Phase preparation — bouton "Prêt"
  // ---------------------------------------------------------------------------

  startNextBiome() {
    if (this.phase !== 'preparation' || !this._pendingNextWave) return;
    this.phase = 'combat';
    // Lock équipement.
    if (typeof ItemSystem !== 'undefined') ItemSystem.equipmentLocked = true;
    // Spawn les monstres de la prochaine wave.
    const wave = this._pendingNextWave;
    this._spawnWaveMonsters(wave);
    this.currentWave = wave;
    this._pendingNextWave = null;
    // Reprend les timers alliés.
    for (const f of this.teamA) {
      if (f.attackTimer) f.attackTimer.paused = false;
    }
    TelemetrySystem.startCombat(this.currentWave, this.teamA, this.teamB);
  }

  // ---------------------------------------------------------------------------
  // Ultimates — déclenchement manuel via UnitCard
  // ---------------------------------------------------------------------------

  executeUltimate(fighter) {
    if (!fighter || !fighter.ultimateReady || !fighter.isAlive) return;
    fighter.resetUltimate();
    MissionSystem.track('ultimates', 1);

    const ultCfg = BALANCE.ultimate?.[fighter.class];
    if (!ultCfg) return;

    // Feedback visuel commun : flash doré + bandeau.
    if (this.scene.impactEmitter) {
      this.scene.impactEmitter.explode(20, fighter.container.x, fighter.container.y);
    }
    if (this.scene.waveBanner) {
      this.scene.waveBanner.show(ultCfg.name.toUpperCase(), fighter.name, {
        holdMs: 600,
        borderColor: 0xfbbf24,
      });
    }

    switch (fighter.class) {
      case 'warrior':
        this._ultWarrior(fighter, ultCfg);
        break;
      case 'archer':
        this._ultArcher(fighter, ultCfg);
        break;
      case 'mage':
        this._ultMage(fighter, ultCfg);
        break;
      case 'healer':
        this._ultHealer(fighter);
        break;
    }
  }

  // Warrior — taunt tous les ennemis + damage reduction.
  _ultWarrior(fighter, cfg) {
    // Pour la durée du taunt, on force tous les monstres à cibler ce warrior.
    // Simplification : on réduit les dégâts reçus via un flag temporaire.
    fighter._dmgReduction = cfg.dmgReduction;
    this.scene.time.delayedCall(cfg.duration, () => {
      fighter._dmgReduction = 0;
    });
  }

  // Archer — triple hit AoE sur tous les ennemis.
  _ultArcher(fighter, cfg) {
    const alive = this.teamB.filter((m) => m.isAlive);
    for (let hit = 0; hit < cfg.hits; hit++) {
      for (const target of alive) {
        if (target.isAlive) this._applyDamage(fighter, target);
        if (!target.isAlive) this._handleKill(fighter, target, this.teamB);
      }
    }
  }

  // Mage — 300% ATK AoE + stun ennemis.
  _ultMage(fighter, cfg) {
    const alive = this.teamB.filter((m) => m.isAlive);
    const originalAtk = fighter.atk;
    fighter.atk = Math.round(originalAtk * cfg.dmgMult);
    for (const target of alive) {
      if (target.isAlive) this._applyDamage(fighter, target);
      if (!target.isAlive) this._handleKill(fighter, target, this.teamB);
    }
    fighter.atk = originalAtk;
    // Stun : pause les timers des ennemis vivants.
    for (const m of this.teamB) {
      if (m.isAlive && m.attackTimer) {
        m.attackTimer.paused = true;
        this.scene.time.delayedCall(cfg.stunMs, () => {
          if (m.attackTimer) m.attackTimer.paused = false;
        });
      }
    }
  }

  // Healer — full heal TOUS les alliés.
  _ultHealer(fighter) {
    for (const ally of this.teamA) {
      if (!ally.isAlive) continue;
      ally.hp = ally.maxHp;
      ally._updateHealthBar();
      ally._playHealFlash();
      if (this.scene.floatingDamage) {
        this.scene.floatingDamage.spawn(
          ally.container.x,
          ally.container.y - 50,
          'FULL',
          { color: '#22c55e', critical: true }
        );
      }
    }
  }

  // --- Stratégies de ciblage ---

  _pickTarget(attacker, enemyTeam) {
    const alive = enemyTeam.filter((f) => f.isAlive);
    if (alive.length === 0) return null;
    if (alive.length === 1) return alive[0];

    switch (attacker.targeting) {
      case 'closest':
        return this._pickClosest(attacker, alive);
      case 'front_priority': {
        // Priorité absolue à la ligne avant. S'il ne reste plus que de la
        // ligne arrière, on bascule sur elle. Dans chaque sous-ensemble,
        // on pioche le plus proche spatialement.
        const fronts = alive.filter((f) => f.line === 'front');
        if (fronts.length > 0) return this._pickClosest(attacker, fronts);
        return this._pickClosest(attacker, alive);
      }
      case 'lowest_hp':
        return alive.reduce((a, b) => (a.hp <= b.hp ? a : b));
      case 'highest_hp':
        return alive.reduce((a, b) => (a.hp >= b.hp ? a : b));
      case 'first':
      default:
        return alive[0];
    }
  }

  _pickClosest(attacker, alive) {
    let best = alive[0];
    let bestDist = this._distanceSq(attacker, best);
    for (let i = 1; i < alive.length; i++) {
      const d = this._distanceSq(attacker, alive[i]);
      if (d < bestDist) {
        best = alive[i];
        bestDist = d;
      }
    }
    return best;
  }

  _distanceSq(a, b) {
    const dx = a.container.x - b.container.x;
    const dy = a.container.y - b.container.y;
    return dx * dx + dy * dy; // carré, suffit pour comparer
  }
}
