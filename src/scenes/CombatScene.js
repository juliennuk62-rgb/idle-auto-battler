import { Fighter } from '../entities/Fighter.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { BALANCE } from '../data/balance.js';
import { biomeForWave, BIOMES } from '../data/biomes.js';
import { TelemetryOverlay } from '../ui/TelemetryOverlay.js';
import { FloatingDamage } from '../ui/FloatingDamage.js';
import { WaveBanner } from '../ui/WaveBanner.js';
import { ComboCounter } from '../ui/ComboCounter.js';
import { findFusableTrio, fuse } from '../systems/FusionSystem.js';
import { TelemetrySystem } from '../systems/TelemetrySystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';

// Scène principale : combat auto avec classes, grades, vagues, biomes,
// économie et sauvegarde. Charge depuis localStorage si une save existe.

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('CombatScene');
  }

  preload() {
    // Alliés — un sprite par classe.
    this.load.image('warrior', 'assets/sprites/allies/warrior.png');
    this.load.image('archer', 'assets/sprites/allies/archer.png');
    this.load.image('mage', 'assets/sprites/allies/mage.png');
    this.load.image('healer', 'assets/sprites/allies/healer.png');

    // Monstres — fallback pour les 6 manquants.
    this.load.image('monster', 'assets/sprites/tkobold.gif');

    // Monstres forêt.
    this.load.image('gobelin', 'assets/sprites/monsters/gobelin.png');
    this.load.image('loup', 'assets/sprites/monsters/loup.png');
    this.load.image('sanglier', 'assets/sprites/monsters/sanglier.png');
    this.load.image('araignee', 'assets/sprites/monsters/araignee.png');
    this.load.image('boss_roi_gobelin', 'assets/sprites/monsters/boss_roi_gobelin.png');

    // Monstres grottes.
    this.load.image('chauve_souris', 'assets/sprites/monsters/chauve_souris.png');
    this.load.image('troll', 'assets/sprites/monsters/troll.png');
    this.load.image('slime', 'assets/sprites/monsters/slime.png');
    this.load.image('rat_geant', 'assets/sprites/monsters/rat_geant.png');
    this.load.image('boss_troll_ancien', 'assets/sprites/monsters/boss_troll_ancien.png');

    // Monstres ruines.
    this.load.image('squelette', 'assets/sprites/monsters/squelette.png');
    this.load.image('momie', 'assets/sprites/monsters/momie.png');
    this.load.image('sphinx', 'assets/sprites/monsters/sphinx.png');
    this.load.image('fantome', 'assets/sprites/monsters/fantome.png');

    // Monstres enfer.
    this.load.image('demon', 'assets/sprites/monsters/demon.png');
    this.load.image('imp', 'assets/sprites/monsters/imp.png');

    // Monstres neige.
    this.load.image('mage_glace', 'assets/sprites/monsters/mage_glace.png');
    this.load.image('loup_arctique', 'assets/sprites/monsters/loup_arctique.png');
    this.load.image('boss_roi_neiges', 'assets/sprites/monsters/boss_roi_neiges.png');

    // Monstres temple.
    this.load.image('gardien', 'assets/sprites/monsters/gardien.png');
    this.load.image('golem', 'assets/sprites/monsters/golem.png');
    this.load.image('esprit', 'assets/sprites/monsters/esprit.png');
    this.load.image('sentinelle', 'assets/sprites/monsters/sentinelle.png');
    this.load.image('boss_dragon', 'assets/sprites/monsters/boss_dragon.png');

    // Backgrounds par biome.
    this.load.image('background', 'assets/sprites/fond.jpg'); // legacy fallback
    this.load.image('bg_forest', 'assets/sprites/backgrounds/bg_forest.jpg');
    this.load.image('bg_caves', 'assets/sprites/backgrounds/bg_caves.jpg');
    this.load.image('bg_ruins', 'assets/sprites/backgrounds/bg_ruins.jpg');
    this.load.image('bg_hell', 'assets/sprites/backgrounds/bg_hell.jpg');
    this.load.image('bg_snow', 'assets/sprites/backgrounds/bg_snow.jpg');
    this.load.image('bg_temple', 'assets/sprites/backgrounds/bg_temple.jpg');
  }

  create() {
    // Texture de particule générée inline — un petit carré blanc 4×4
    // réutilisé par tous les effets d'impact et de mort. Mieux vaut le
    // générer que de charger un fichier PNG pour 16 pixels.
    if (!this.textures.exists('white-particle')) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('white-particle', 4, 4);
      g.destroy();
    }

    // Deux émetteurs distincts :
    // - impactEmitter : gros burst pour les morts (14 pour mob, 28 pour boss)
    // - hitEmitter    : mini-burst pour chaque coup (5 particules courtes)
    // Ils partagent la même texture mais ont des configs différentes,
    // donc deux objets différents. Aucune création/destruction runtime.
    this.impactEmitter = this.add.particles(0, 0, 'white-particle', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 450,
      quantity: 14,
      emitting: false,
    });
    this.impactEmitter.setDepth(600);

    this.hitEmitter = this.add.particles(0, 0, 'white-particle', {
      speed: { min: 40, max: 130 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 260,
      quantity: 5,
      emitting: false,
    });
    this.hitEmitter.setDepth(550);

    // Pool de projectiles pour les ranged (archer/mage). Réutilisés via visible toggle.
    this.projectilePool = [];

    // Fond du combat.
    this.bgImage = this.add.image(400, 240, 'background').setDisplaySize(800, 480);

    // ----------------------------------------------------------------
    // SAVE / LOAD — tente de charger une sauvegarde existante.
    // Si une save est trouvée, on restaure les ressources, l'équipe, la
    // vague et le biome. Sinon, on démarre une partie neuve.
    // ----------------------------------------------------------------
    // Le biome est choisi depuis la carte du monde (ou fallback save).
    this._selectedBiomeId = this.game.registry.get('biomeId') || null;
    this._maxWavesInBiome = 10;
    this._onCombatEnd = this.game.registry.get('onCombatEnd') || window.__onCombatEnd;

    // Mode donjon : 1 seule wave par étage, scaling spécial.
    const dungeonData = this.game.registry.get('dungeonData');
    this._isDungeon = !!(dungeonData && dungeonData.mode === 'dungeon');
    this._dungeonFloorData = dungeonData?.dungeonFloorData || null;
    if (this._isDungeon) {
      this._maxWavesInBiome = 1; // 1 wave = 1 étage de donjon
    }

    // En mode donjon, on ignore la save de l'aventure — toujours wave 1.
    const saveData = this._isDungeon ? null : SaveSystem.load();
    let startWave = 1;
    let offlineReward = null;

    if (saveData) {
      // Restaure les ressources.
      ResourceSystem.restore(saveData.resources);

      // Calcule les gains hors-ligne.
      offlineReward = SaveSystem.computeOfflineRewards(saveData);
      if (offlineReward.shouldShow && offlineReward.gold > 0) {
        ResourceSystem.addGold(offlineReward.gold);
      }

      startWave = saveData.wave || 1;
    }

    // Si un biome est explicitement sélectionné depuis la carte du monde,
    // on calcule la wave de départ et de fin de ce biome.
    if (this._selectedBiomeId) {
      const biomeIdx = BIOMES.findIndex(b => b.id === this._selectedBiomeId);
      if (biomeIdx >= 0) {
        const biomeStartWave = biomeIdx * 10 + 1; // forêt=1, grottes=11, ruines=21...
        startWave = biomeStartWave;
        // maxWavesInBiome = wave de FIN du biome (pas le nombre de waves)
        this._maxWavesInBiome = biomeStartWave + 9; // forêt=10, grottes=20, ruines=30...
      }
    }

    // Restaure les fragments d'âme (persistés séparément car ils survivent
    // au prestige — la clé 'idle_autobattler_soul' est indépendante du save
    // principal qui est effacé au prestige).
    try {
      const soulStr = localStorage.getItem('idle_autobattler_soul');
      if (soulStr) {
        const soulVal = parseInt(soulStr, 10);
        if (Number.isFinite(soulVal) && soulVal > 0) {
          ResourceSystem.soulFragments = soulVal;
          ResourceSystem._emit('soul_changed', { soul: soulVal, delta: 0 });
        }
      }
    } catch (e) {}

    // Biome — forcé par la carte du monde, ou fallback wave-based.
    let initialBiome;
    if (this._selectedBiomeId) {
      initialBiome = BIOMES.find(b => b.id === this._selectedBiomeId) || biomeForWave(1);
    } else {
      initialBiome = biomeForWave(saveData ? startWave : 1);
    }
    this._applyBiome(initialBiome);
    this.currentBiomeId = initialBiome.id;

    // Titre de scène.
    this.add
      .text(400, 30, 'Idle Auto-Battler', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // ----------------------------------------------------------------
    // TEAM — depuis la save ou par défaut (3W + 1A).
    // ----------------------------------------------------------------
    let team;
    if (saveData && Array.isArray(saveData.team) && saveData.team.length > 0) {
      team = this._createTeamFromSave(saveData.team);
    } else {
      team = this._createDefaultTeam();
    }

    // Monstre(s) — créés via CombatSystem._spawnWaveMonsters après le
    // démarrage du combat. On passe un teamB vide au constructeur,
    // le spawn remplira l'array.
    const monsters = []; // sera rempli par _spawnWaveMonsters

    // Spawner de dégâts flottants — créé AVANT le CombatSystem pour que
    // celui-ci puisse l'utiliser dès le premier tick via scene.floatingDamage.
    this.floatingDamage = new FloatingDamage(this);

    // Bandeau d'annonce de vague (boss OU changement de biome). Créé ici
    // pour que CombatSystem puisse le déclencher via scene.waveBanner.
    this.waveBanner = new WaveBanner(this);

    // Combo counter — affiche xN quand plusieurs kills s'enchaînent.
    this.comboCounter = new ComboCounter(this, 720, 110, BALANCE.wave.combo_window_ms);

    // NB : la ResourceBar Phaser a été retirée. Les ressources sont
    // maintenant affichées en DOM dans le top bar du cockpit via la classe
    // ResourceCounter (src/ui/Cockpit.js).

    // Démarrage du combat — teamB est vide, _spawnWaveMonsters le remplit.
    this.combat = new CombatSystem(this, team, monsters);
    this.combat.currentWave = startWave;
    this.combat._spawnWaveMonsters(startWave);
    this.combat.start();

    // Overlay debug de télémétrie (toggle F9). Créé après le combat pour
    // pouvoir lire scene.combat.teamA/teamB au rendu.
    this.telemetryOverlay = new TelemetryOverlay(this);

    // Debug keybinding : F10 = tente une fusion.
    this.input.keyboard.on('keydown-F10', () => this._attemptFusion());

    // Auto-save toutes les 30 secondes.
    this.time.addEvent({
      delay: 30_000,
      loop: true,
      callback: () => this.saveGame(),
    });

    // Expose l'info offline pour que le Cockpit l'affiche.
    this._offlineReward = offlineReward;

    this._combatEnded = false;
    this._combatStartTime = Date.now();
  }

  // ─── UPDATE LOOP — mouvement TD chaque frame ─────────────────────────
  update(time, delta) {
    if (!this.combat || this.combat.defeated || this._combatEnded) return;
    if (this.combat.phase === 'preparation') return;

    // Applique le timeScale au delta pour que ×2/×4 accélère aussi le mouvement.
    const scaledDelta = delta * (this.time.timeScale || 1);

    const teamA = this.combat.teamA;
    const teamB = this.combat.teamB;

    // Mouvement des alliés (warriors marchent, ranged restent).
    for (const f of teamA) {
      f.updateMovement(scaledDelta, teamB);
    }

    // Mouvement des monstres (marchent vers la gauche).
    const leftBound = BALANCE.movement?.leftBoundary ?? 50;
    for (const m of teamB) {
      m.updateMovement(scaledDelta, teamA);
      // Si un monstre atteint le bord gauche → brèche !
      if (m.isAlive && m.container && m.container.x < leftBound) {
        // Le monstre a percé la ligne → il attaque la back line directement.
        // On le stoppe au bord pour qu'il tape les ranged.
        m.container.x = leftBound;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fusion (debug shortcut F10)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Projectiles ranged
  // ---------------------------------------------------------------------------

  /**
   * Lance un projectile visuel de l'attaquant vers la cible. Le callback
   * onHit est appelé à l'arrivée (si la cible est encore vivante).
   */
  launchProjectile(attacker, target, onHit) {
    if (!attacker.container || !target.container) return;

    // Couleur par classe : archer=jaune, mage=bleu cyan.
    const colors = { archer: 0xfbbf24, mage: 0x60a5fa };
    const color = colors[attacker.class] || 0xffffff;
    const size = attacker.class === 'mage' ? 8 : 5;

    // Acquiert un projectile du pool (ou en crée un neuf).
    let proj = this.projectilePool.find(p => !p.visible);
    if (!proj) {
      proj = this.add.rectangle(0, 0, size, size, color);
      proj.setDepth(450);
      this.projectilePool.push(proj);
    }

    // Reset le projectile.
    proj.setFillStyle(color);
    proj.setSize(size, size);
    proj.setPosition(attacker.container.x, attacker.container.y);
    proj.setVisible(true);
    proj.setAlpha(1);

    // Tween homing vers la cible. Durée basée sur la distance.
    const dx = target.container.x - attacker.container.x;
    const dy = target.container.y - attacker.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 400; // px/s
    const duration = Math.max(80, (dist / speed) * 1000);

    this.tweens.add({
      targets: proj,
      x: target.container.x,
      y: target.container.y,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        // Homing : suit la cible si elle bouge.
        if (target.container && target.isAlive) {
          // Pas de re-targeting mid-flight pour garder la trajectoire propre.
        }
      },
      onComplete: () => {
        proj.setVisible(false);
        // Applique les dégâts uniquement si la cible est encore vivante.
        if (target.isAlive && onHit) onHit();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Fin de run — retour à la carte du monde
  // ---------------------------------------------------------------------------

  endCombatAndReturn(victory) {
    if (this._combatEnded) return;
    this._combatEnded = true;
    this.saveGame();

    const result = {
      biomeId: this.currentBiomeId,
      waveReached: this.combat?.currentWave || 1,
      bossBeaten: victory && (this.combat?.currentWave || 0) >= this._maxWavesInBiome,
      victory,
      mode: this._isDungeon ? 'dungeon' : 'biome',
      floor: this._dungeonFloorData?.floor || 0,
      goldFromFloor: this.combat?._biomeStats?.gold || 0,
    };

    // Pause tous les timers pour figer le combat.
    for (const f of this.combat.teamA) { if (f.attackTimer) f.attackTimer.paused = true; }
    for (const m of this.combat.teamB) { if (m.attackTimer) m.attackTimer.paused = true; }

    // Calcule les stats du run.
    const elapsed = Date.now() - (this._combatStartTime || Date.now());
    const biomeStats = this.combat._biomeStats || {};
    const lootLog = biomeStats.lootLog || [];
    const goldEarned = biomeStats.gold || 0;
    const deaths = biomeStats.deaths || 0;
    const wavesCleared = result.waveReached;

    // Stats de combat depuis la télémétrie.
    const agg = TelemetrySystem.getAggregates();
    const teamDps = this.combat.teamA.reduce((sum, f) => {
      if (!f.isAlive) return sum;
      return sum + (f.atk / f.atkSpeed);
    }, 0);

    // Formatage du temps.
    const mins = Math.floor(elapsed / 60000);
    const secs = Math.floor((elapsed % 60000) / 1000);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Biome info.
    const biome = BIOMES.find(b => b.id === this.currentBiomeId);
    const biomeName = biome?.name || this.currentBiomeId;
    const accentColor = biome?.accent ? '#' + biome.accent.toString(16).padStart(6, '0') : '#fbbf24';

    // Crée l'overlay de résultats (DOM sur le canvas).
    this._showResultsOverlay({
      victory,
      biomeName,
      accentColor,
      wavesCleared,
      timeStr,
      goldEarned,
      deaths,
      teamDps: Math.round(teamDps),
      lootLog,
      result,
    });
  }

  _showResultsOverlay(data) {
    if (this._resultOverlay) this._resultOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'preparation-overlay';
    overlay.innerHTML = `
      <div class="prep-panel" style="max-width:500px;">
        <div class="prep-title" style="color:${data.victory ? 'var(--heal)' : 'var(--damage)'}; font-size:28px;">
          ${data.victory ? 'VICTOIRE' : 'DÉFAITE'}
        </div>
        <div class="prep-subtitle">${data.biomeName} — ${data.wavesCleared} waves</div>

        <div class="prep-recap" style="margin-top:16px;">
          <div class="prep-recap-row"><span>Temps</span><span style="color:var(--gold)">${data.timeStr}</span></div>
          <div class="prep-recap-row"><span>Or gagné</span><span style="color:var(--gold)">+${data.goldEarned}◆</span></div>
          <div class="prep-recap-row"><span>DPS équipe</span><span>${data.teamDps}/s</span></div>
          <div class="prep-recap-row"><span>Morts d'alliés</span><span style="color:${data.deaths > 0 ? 'var(--damage)' : 'var(--heal)'}">${data.deaths}</span></div>
          ${data.victory ? '<div class="prep-recap-row"><span>Boss</span><span style="color:var(--heal)">Vaincu ✓</span></div>' : ''}
        </div>

        ${data.lootLog.length > 0 ? `
          <div class="prep-loot-title">BUTIN OBTENU</div>
          <div class="prep-loot-line">
            ${data.lootLog.map(item => `
              <div class="prep-loot-item" style="border-color:${item.rarityColor};" title="${item.name} (${item.rarityName})">
                <span class="prep-loot-icon">${item.icon}</span>
                <div class="prep-loot-name">${item.name}</div>
                <div class="prep-loot-rarity" style="color:${item.rarityColor}">${item.rarityName}</div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color:var(--text-tertiary);font-size:11px;margin-top:12px;">Aucun item droppé</div>'}

        <button class="prep-ready-btn" style="margin-top:20px;">${data.victory ? 'RETOUR À LA CARTE' : 'RETOUR'}</button>
      </div>
    `;

    overlay.querySelector('.prep-ready-btn').addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        this._resultOverlay = null;
        if (this._onCombatEnd) this._onCombatEnd(data.result);
      }, 300);
    });

    const gameDiv = document.getElementById('game');
    if (gameDiv) {
      gameDiv.style.position = 'relative';
      gameDiv.append(overlay);
    }
    this._resultOverlay = overlay;
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  // ---------------------------------------------------------------------------
  // Phase de préparation (entre biomes)
  // ---------------------------------------------------------------------------

  /**
   * Appelé par CombatSystem quand un changement de biome est détecté.
   * Affiche un overlay DOM avec récap + bouton PRÊT.
   */
  _showPreparation(nextWave, biome, recap) {
    // Crée l'overlay DOM (positionné sur le canvas Phaser).
    if (this._prepOverlay) this._prepOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'preparation-overlay';
    overlay.innerHTML = `
      <div class="prep-panel">
        <div class="prep-title" style="color:${'#' + (biome.accent ?? 0xfbbf24).toString(16).padStart(6, '0')}">${biome.name}</div>
        <div class="prep-subtitle">NOUVEAU BIOME — WAVE ${nextWave}</div>
        <div class="prep-recap">
          <div class="prep-recap-row"><span>Vagues terminées</span><span>${recap.wavesCleared}</span></div>
          <div class="prep-recap-row"><span>Or gagné</span><span style="color:var(--gold)">+${recap.gold}◆</span></div>
          <div class="prep-recap-row"><span>Items droppés</span><span>${recap.items}</span></div>
          <div class="prep-recap-row"><span>Morts d'alliés</span><span style="color:var(--damage)">${recap.deaths}</span></div>
        </div>
        ${(recap.lootLog && recap.lootLog.length > 0) ? `
          <div class="prep-loot-title">BUTIN OBTENU</div>
          <div class="prep-loot-line">
            ${recap.lootLog.map(item => `
              <div class="prep-loot-item" style="border-color:${item.rarityColor};" title="${item.name} (${item.rarityName} · ${item.type})">
                <span class="prep-loot-icon">${item.icon}</span>
                <div class="prep-loot-name">${item.name}</div>
                <div class="prep-loot-rarity" style="color:${item.rarityColor}">${item.rarityName}</div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="color:var(--text-tertiary);font-size:11px;margin-top:8px;">Aucun item droppé ce biome</div>'}
        <div class="prep-hint">Équipez vos items maintenant — l'équipement sera verrouillé pendant le combat</div>
        <button class="prep-ready-btn">PRÊT</button>
      </div>
    `;

    overlay.querySelector('.prep-ready-btn').addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        this._prepOverlay = null;
        this.combat.startNextBiome();
      }, 300);
    });

    // Monte dans le DOM à côté du canvas.
    const gameDiv = document.getElementById('game');
    if (gameDiv) {
      gameDiv.style.position = 'relative';
      gameDiv.append(overlay);
    }
    this._prepOverlay = overlay;
    // Force l'apparition avec un délai pour la transition CSS.
    requestAnimationFrame(() => overlay.classList.add('visible'));
  }

  // ---------------------------------------------------------------------------
  // Restart — remet le combat à wave 1, conserve les ressources
  // ---------------------------------------------------------------------------

  /**
   * Restart le combat à wave 1. Conserve les ressources et l'équipe
   * mais remet la vague à 1. Utile pour debug/test et quand on est bloqué.
   */
  restartCombat() {
    // Relance à wave 1. Reset inventaire + respawn alliés.
    this.combat.defeated = false;

    // Reset inventaire — tous les items supprimés pour test propre.
    ItemSystem.reset();

    for (const f of this.combat.teamA) {
      if (!f.isAlive) f.respawn();
      if (f.attackTimer) f.attackTimer.paused = false;
    }
    // Force wave 1 + respawn monstres wave 1.
    this.combat.currentWave = 1;
    this.combat._spawnWaveMonsters(1);
    // Reset le biome au biome de wave 1.
    const biome = biomeForWave(1);
    this.setBiome(biome, false);
    // Reset télémétrie combat courant.
    TelemetrySystem.startCombat(1, this.combat.teamA, this.combat.teamB);
    // Bandeau visuel.
    if (this.waveBanner) {
      this.waveBanner.show('RESTART', 'WAVE 1', { holdMs: 800, borderColor: 0x22c55e });
    }
  }

  /**
   * Jump direct à une wave spécifique (admin/debug). Conserve l'équipe,
   * respawn les monstres avec les stats de la wave cible.
   */
  jumpToWave(wave) {
    if (!Number.isFinite(wave) || wave < 1) return;
    this.combat.defeated = false;
    ItemSystem.reset(); // reset items pour test propre
    for (const f of this.combat.teamA) {
      if (!f.isAlive) f.respawn();
      if (f.attackTimer) f.attackTimer.paused = false;
    }
    this.combat.currentWave = wave;
    this.combat._spawnWaveMonsters(wave);
    const biome = biomeForWave(wave);
    this.setBiome(biome, false);
    TelemetrySystem.startCombat(wave, this.combat.teamA, this.combat.teamB);
    if (this.waveBanner) {
      this.waveBanner.show(`WAVE ${wave}`, biome.name, { holdMs: 800, borderColor: 0x60a5fa });
    }
  }

  // ---------------------------------------------------------------------------
  // Save / Load helpers
  // ---------------------------------------------------------------------------

  _createDefaultTeam() {
    // Le prestige peut octroyer un grade de départ supérieur pour le
    // premier guerrier (bonus "Soldat de départ").
    const startGrade = PrestigeSystem.getStartingGrade();

    // Formation complète 4 classes :
    //   Front (x=250) : 2 guerriers
    //   Back  (x=110) : 1 archer, 1 mage, 1 soigneur
    // Formation en V / quinconce — aucun allié n'est exactement aligné
    // en X ou en Y avec un autre. Chaque unité a sa position unique pour
    // que le joueur puisse les distinguer visuellement sans chevauchement.
    //
    //   Back                      Front
    //     Archer (100,365)           Warrior1 (260,385)
    //       Mage (130,400)
    //         Healer (110,435)         Warrior2 (290,430)
    //
    const w1 = new Fighter(this, 260, 385, {
      ...BALANCE.warrior,
      name: 'Guerrier 1',
      grade: startGrade,
      spriteKey: 'warrior',
      spriteScale: 1.4,
      color: 0x3b82f6,
      facing: 1,
    });
    const w2 = new Fighter(this, 290, 430, {
      ...BALANCE.warrior,
      name: 'Guerrier 2',
      spriteKey: 'warrior',
      spriteScale: 1.4,
      color: 0x3b82f6,
      facing: 1,
    });
    const archer = new Fighter(this, 100, 365, {
      ...BALANCE.archer,
      name: 'Archer',
      spriteKey: 'archer',
      spriteScale: 1.4,
      color: 0xa855f7,
      facing: 1,
    });
    const mage = new Fighter(this, 130, 400, {
      ...BALANCE.mage,
      name: 'Mage',
      spriteKey: 'mage',
      spriteScale: 1.4,
      color: 0x60a5fa,
      facing: 1,
    });
    const healer = new Fighter(this, 110, 435, {
      ...BALANCE.healer,
      name: 'Soigneur',
      spriteKey: 'healer',
      spriteScale: 1.4,
      color: 0x4ade80,
      facing: 1,
    });
    return [w1, w2, archer, mage, healer];
  }

  _createTeamFromSave(savedTeam) {
    const team = [];
    // Compteur local par ligne — on ne peut PAS utiliser _computeRecruitPosition
    // ici car this.combat n'existe pas encore à ce stade du create().
    const lineCounts = { front: 0, back: 0 };

    for (const spec of savedTeam) {
      const classCfg = BALANCE[spec.class];
      if (!classCfg) continue;

      const line = spec.line || classCfg.line || 'front';
      const isBack = line === 'back';
      const x = isBack ? 140 : 280;
      const spacing = isBack ? 35 : 50;
      const startY = isBack ? 370 : 380;
      const y = startY + lineCounts[line] * spacing;
      lineCounts[line]++;
      const pos = { x, y };
      const isArcher = spec.class === 'archer';

      const SPRITE_MAP = { warrior: 'warrior', archer: 'archer', mage: 'mage', healer: 'healer' };
      const COLOR_MAP = { warrior: 0x3b82f6, archer: 0xa855f7, mage: 0x60a5fa, healer: 0x4ade80 };

      const fighter = new Fighter(this, pos.x, pos.y, {
        ...classCfg,
        name: spec.name || (isArcher ? 'Archer' : 'Guerrier'),
        grade: spec.grade ?? 1,
        level: spec.level ?? 1,
        spriteKey: SPRITE_MAP[spec.class] || 'warrior',
        spriteScale: 1.4,
        color: COLOR_MAP[spec.class] || 0x3b82f6,
        facing: 1,
      });

      // Restaure l'XP sans déclencher de level-up (le level est déjà correct).
      fighter.xp = spec.xp ?? 0;
      fighter._updateXpBar();

      team.push(fighter);
    }
    return team;
  }

  /**
   * Sérialise et sauvegarde l'état complet dans localStorage.
   * Appelé automatiquement toutes les 30 s et à certaines actions.
   */
  saveGame() {
    if (!this.combat) return;
    const agg = TelemetrySystem.getAggregates();
    SaveSystem.save({
      resources: ResourceSystem.serialize(),
      team: this.combat.teamA,
      currentWave: this.combat.currentWave,
      maxWave: agg?.maxWave ?? this.combat.currentWave,
      biomeId: this.currentBiomeId,
    });
  }

  // ---------------------------------------------------------------------------
  // Recruit — ajoute une unité fraîche au combat (appelé par le Cockpit)
  // ---------------------------------------------------------------------------

  /**
   * Recrute une unité d'une classe donnée. Dépense l'or, crée le Fighter,
   * l'ajoute au CombatSystem, retourne true si succès.
   *
   * @param {string} className - 'warrior' | 'archer'
   * @returns {boolean}
   */
  recruitUnit(className) {
    const cfg = BALANCE.recruit;
    const classCfg = BALANCE[className];
    if (!classCfg) return false;

    // Vérification taille max
    if (this.combat.teamA.length >= cfg.max_team_size) return false;

    // Vérification coût
    const costKey = `${className}_cost`;
    const cost = cfg[costKey] ?? cfg.warrior_cost;
    if (!ResourceSystem.spendGold(cost)) return false;

    // Calcul de la position — auto-place selon la ligne de la classe
    const pos = this._computeRecruitPosition(classCfg.line || 'front');

    // Couleur par classe pour le placeholder sprite
    const CLASS_COLORS = {
      warrior: 0x3b82f6,
      archer: 0xa855f7,
      mage: 0x60a5fa,
      healer: 0x4ade80,
    };
    const CLASS_NAMES = {
      warrior: 'Guerrier',
      archer: 'Archer',
      mage: 'Mage',
      healer: 'Soigneur',
    };
    // Chaque classe a son propre sprite maintenant.
    const CLASS_SPRITES = {
      warrior: 'warrior',
      archer: 'archer',
      mage: 'mage',
      healer: 'healer',
    };

    const fighter = new Fighter(this, pos.x, pos.y, {
      ...classCfg,
      name: CLASS_NAMES[className] || className,
      spriteKey: CLASS_SPRITES[className] || 'warrior',
      spriteScale: 1.4,
      color: CLASS_COLORS[className] || 0x3b82f6,
      facing: 1,
    });

    this.combat.addAlly(fighter);

    // Petit bandeau de confirmation
    if (this.waveBanner) {
      this.waveBanner.show('RECRUTÉ', fighter._labelText(), {
        holdMs: 800,
        borderColor: 0x22c55e,
      });
    }

    return true;
  }

  _computeRecruitPosition(line) {
    const isBack = line === 'back';
    const sameLineCount = this.combat.teamA.filter(
      (f) => (f.line === 'back') === isBack
    ).length;
    // Positions en quinconce — chaque nouveau recruté décale en X et Y.
    // Back : zigzag autour de x=110, front : autour de x=275.
    const baseX = isBack ? 110 : 275;
    const xJitter = ((sameLineCount % 2) === 0 ? -15 : 15);
    const x = baseX + xJitter;
    const spacing = isBack ? 35 : 45;
    const startY = isBack ? 365 : 385;
    const y = startY + sameLineCount * spacing;
    return { x, y };
  }

  // ---------------------------------------------------------------------------
  // Fusion (debug shortcut F10 + appelable par le Cockpit)
  // ---------------------------------------------------------------------------

  /**
   * Cherche un trio fusable dans teamA et lance la fusion si trouvé.
   * Stratégie pour l'étape 7 : pas encore de vraie UI de roster, donc
   * on utilise directement la team active. Après la fusion, la team est
   * réduite de 2 (3 enlevés, 1 ajouté) — c'est attendu tant qu'on n'a
   * pas le recruit system qui repeuplera.
   */
  _attemptFusion() {
    const trio = findFusableTrio(this.combat.teamA);
    if (!trio) {
      // Petit feedback visuel pour signaler l'échec — bandeau rouge bref.
      if (this.waveBanner) {
        this.waveBanner.show('FUSION', 'aucun trio fusable', {
          holdMs: 800,
          borderColor: 0xef4444,
        });
      }
      return;
    }

    // Prend la position du premier pour placer le résultat.
    const anchor = trio[0];
    const x = anchor.container.x;
    const y = anchor.container.y;
    const facing = anchor.facing;
    const spriteKey = anchor.spriteKey;
    const spriteScale = anchor.spriteScale;
    const baseColor = anchor.color;

    // Récupère le config de classe depuis BALANCE.
    const classConfig = BALANCE[anchor.class] || {};
    const newSpec = fuse(trio.map((f) => ({
      id: f.id,
      class: f.class,
      grade: f.grade,
      level: f.level,
      xp: f.xp,
    })));
    if (!newSpec) return;

    // Télémétrie avant de muter quoi que ce soit.
    TelemetrySystem.recordEvent('unit_fused', {
      unitIds: trio.map((f) => f.id),
      class: newSpec.class,
      oldGrade: trio[0].grade,
      newGrade: newSpec.grade,
    });

    // Retire les 3 du combat + détruit leur visuel.
    for (const f of trio) {
      this.combat.removeAlly(f);
      if (f.container) f.container.destroy();
    }

    // Crée le nouveau Fighter à partir de la classe + grade+1.
    const newFighter = new Fighter(this, x, y, {
      ...classConfig,
      name: classConfig.name ?? anchor.name.replace(/\s\d+$/, ''),
      grade: newSpec.grade,
      level: 1,
      spriteKey,
      spriteScale,
      color: baseColor,
      facing,
    });

    this.combat.addAlly(newFighter);

    // Annonce visuelle de la fusion.
    if (this.waveBanner) {
      this.waveBanner.show(`GRADE ${newSpec.grade}`, 'FUSION RÉUSSIE', {
        holdMs: 1000,
        borderColor: 0xfbbf24,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Biome
  // ---------------------------------------------------------------------------

  /**
   * Applique un nouveau biome à la scène. Appelé par CombatSystem lors d'une
   * transition. Gère à la fois la tint du fond et (optionnellement) le
   * bandeau d'annonce "NOUVEAU BIOME".
   *
   * @param {Object}  biome      - objet biome depuis biomes.js
   * @param {boolean} announce   - si true, déclenche le WaveBanner
   */
  setBiome(biome, announce = true) {
    if (!biome) return;
    if (this.currentBiomeId === biome.id) return;

    this._applyBiome(biome);
    this.currentBiomeId = biome.id;

    if (announce && this.waveBanner) {
      this.waveBanner.show(biome.name, 'NOUVEAU BIOME', {
        borderColor: biome.accent,
        holdMs: 1200,
      });
    }
  }

  /**
   * Applique un biome au fond : swap de texture si un background dédié
   * existe, sinon fallback sur le tint du background par défaut.
   */
  _applyBiome(biome) {
    if (!this.bgImage) return;
    // Tente le swap de texture vers le background dédié du biome.
    if (biome.bgKey && this.textures.exists(biome.bgKey)) {
      this.bgImage.setTexture(biome.bgKey);
      this.bgImage.setDisplaySize(800, 480);
      this.bgImage.clearTint(); // pas besoin de tint, l'image est déjà colorée
    } else {
      // Fallback : tint sur le background par défaut.
      this.bgImage.setTexture('background');
      this.bgImage.setDisplaySize(800, 480);
      this.bgImage.setTint(biome.bgTint);
    }
  }
}
