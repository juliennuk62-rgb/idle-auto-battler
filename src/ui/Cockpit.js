// Cockpit — orchestrateur de l'UI DOM. Instancié une fois par main.js
// après la création du Phaser.Game. Monte les panels dans les cellules du
// grid layout défini dans index.html / cockpit.css.
//
// Le Cockpit est délibérément découplé du Phaser scene lifecycle :
// il poll jusqu'à ce que la scène soit prête, puis monte les UnitCards.
// Sur un fusion event, il remonte les UnitCards pour refléter la nouvelle
// team.

import { formatDuration } from './format.js';
import { ResourceCounter } from './ResourceCounter.js';
import { UnitCard } from './UnitCard.js';
import { EventLog } from './EventLog.js';
import { Sparkline } from './Sparkline.js';
import { EnemyPanel } from './EnemyPanel.js';
import { ActionButton } from './ActionButton.js';
import { StatsModal } from './StatsModal.js';
import { PrestigeModal } from './PrestigeModal.js';
import { InventoryModal } from './InventoryModal.js';
import { AdminPanel } from './AdminPanel.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { AuthSystem } from '../systems/AuthSystem.js';
import { escapeHtml, safeImageUrl } from '../utils/escape.js';

// Helper pour accéder à ItemSystem dans les sublabels sans import circulaire.
function require_itemsystem() { return { ItemSystem }; }
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { TelemetrySystem } from '../systems/TelemetrySystem.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { findFusableTrio } from '../systems/FusionSystem.js';
import { BALANCE } from '../data/balance.js';
import { gradeName } from '../data/grades.js';
import { formatNumber } from './format.js';

export class Cockpit {
  constructor(game) {
    this.game = game;
    this.resources = [];
    this.unitCards = [];
    this.actionButtons = [];
    this.eventLog = null;
    this.sparkline = null;
    this.enemyPanel = null;
    this.statsModal = null;
    this.prestigeModal = null;
    this.inventoryModal = null;
    this.adminPanel = null;
    this._goldHistory = [];
    this._lastGoldSample = 0;

    // Cached DOM refs.
    this.topBar = document.querySelector('.cockpit-topbar');
    this.leftCol = document.querySelector('.cockpit-leftcol');
    this.rightCol = document.querySelector('.cockpit-rightcol');
    this.bottomBar = document.querySelector('.cockpit-bottombar');

    this._mountTopBar();
    this._mountBottomBar();
    this._mountModals();
    this._waitForScene((scene) => this._mountSceneDependent(scene));
    this._bindBeforeUnload();
  }

  // ---------------------------------------------------------------------------
  // Top bar — titre + ressources (gold, gems, wave placeholder)
  // ---------------------------------------------------------------------------

  _mountTopBar() {
    if (!this.topBar) return;

    const backBtn = document.createElement('button');
    backBtn.className = 'topbar-back-btn';
    backBtn.textContent = '← Carte';
    backBtn.addEventListener('click', () => {
      if (confirm('Quitter le combat ? Vous reviendrez à la carte.')) {
        const onEnd = window.__onCombatEnd;
        if (onEnd) onEnd({ victory: false, quit: true });
      }
    });
    this.topBar.append(backBtn);

    const title = document.createElement('div');
    title.className = 'topbar-title';
    title.textContent = 'IDLE · AUTO-BATTLER';
    this.topBar.append(title);

    const resources = document.createElement('div');
    resources.className = 'topbar-section resources';
    this.topBar.append(resources);

    this.resources.push(
      new ResourceCounter(resources, {
        source: ResourceSystem,
        sourceKey: 'gold',
        icon: '◆',
        color: 'var(--gold)',
        milestones: [100, 1000, 10000, 100000, 1000000],
        title: 'Or — gagné à chaque kill',
      })
    );

    this.resources.push(
      new ResourceCounter(resources, {
        source: ResourceSystem,
        sourceKey: 'gems',
        icon: '◇',
        color: 'var(--rare)',
        milestones: [5, 25, 100, 500],
        title: 'Gemmes — droppées par les boss',
      })
    );

    // Fragment d'âme — visible seulement si le joueur a prestigé au moins
    // une fois OU possède déjà des fragments.
    if (PrestigeSystem.prestigeCount > 0 || ResourceSystem.soulFragments > 0) {
      this.resources.push(
        new ResourceCounter(resources, {
          source: ResourceSystem,
          sourceKey: 'soulFragments',
          icon: '♦',
          color: 'var(--legendary)',
          milestones: [5, 10, 25, 50],
          title: 'Fragments d\'âme — prestige currency',
        })
      );
    }

    // User info (avatar + nom) à droite du title.
    const userInfo = AuthSystem.getUser();
    if (userInfo) {
      const userSection = document.createElement('div');
      userSection.className = 'topbar-user';
      const safePhoto = safeImageUrl(userInfo.photoURL);
      const safeName  = escapeHtml(userInfo.displayName || userInfo.email || 'Joueur');
      userSection.innerHTML = `
        ${safePhoto ? `<img class="topbar-user-avatar" src="${safePhoto}" alt="" />` : ''}
        <span class="topbar-user-name">${safeName}</span>
      `;
      this.topBar.append(userSection);
    }

    // Speed controls ×1 ×2 ×4
    const speedSection = document.createElement('div');
    speedSection.className = 'topbar-section speed-controls';
    speedSection.innerHTML = `
      <button class="speed-btn active" data-speed="1">×1</button>
      <button class="speed-btn" data-speed="2">×2</button>
      <button class="speed-btn" data-speed="4">×4</button>
    `;
    speedSection.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-speed]');
      if (!btn) return;
      const speed = parseInt(btn.dataset.speed);
      const scene = this.game.scene.getScene('CombatScene');
      if (scene) scene.time.timeScale = speed;
      speedSection.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    this.topBar.append(speedSection);

    // Wave section — compteur + mini progress vers boss
    const waveSection = document.createElement('div');
    waveSection.className = 'topbar-section';
    waveSection.style.cssText = 'gap:8px;';
    waveSection.innerHTML = `
      <span class="topbar-wave" data-wave>WAVE —</span>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:100px;">
        <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;">
          <span data-wave-label style="color:var(--text-tertiary)">—</span>
          <span data-wave-max style="color:var(--text-tertiary)">max —</span>
        </div>
        <div class="progress-bar" style="height:6px;">
          <div class="progress-bar-fill" data-wave-fill style="background:var(--gold);"></div>
        </div>
      </div>
    `;
    this.topBar.append(waveSection);
    this._waveEl = waveSection.querySelector('[data-wave]');
    this._waveLabel = waveSection.querySelector('[data-wave-label]');
    this._waveMax = waveSection.querySelector('[data-wave-max]');
    this._waveFill = waveSection.querySelector('[data-wave-fill]');

    // Sparkline or/s
    const sparkSection = document.createElement('div');
    sparkSection.className = 'topbar-section';
    this.topBar.append(sparkSection);
    this.sparkline = new Sparkline(sparkSection, {
      width: 100,
      height: 24,
      points: 30,
      color: 'var(--gold)',
      label: '—/s',
    });

    this._pollTopBar();
  }

  _pollTopBar() {
    // Refresh à 2 Hz pour wave + 1 Hz pour sparkline or/s
    this._waveInterval = setInterval(() => {
      const scene = this.game.scene.getScene('CombatScene');
      if (!scene || !scene.combat) return;

      const wave = scene.combat.currentWave;
      if (this._waveEl) this._waveEl.textContent = `WAVE ${wave}`;

      // Progress vers le prochain boss
      const bossInterval = BALANCE.wave.boss_interval;
      const nextBoss = Math.ceil(wave / bossInterval) * bossInterval;
      const progress = 1 - (nextBoss - wave) / bossInterval;
      if (this._waveLabel) this._waveLabel.textContent = `boss W${nextBoss}`;
      if (this._waveFill) this._waveFill.style.width = `${progress * 100}%`;

      // Max wave depuis télémétrie
      const agg = TelemetrySystem.getAggregates();
      if (this._waveMax && agg) this._waveMax.textContent = `max ${agg.maxWave}`;
    }, 500);

    // Sparkline or/s — sample toutes les 1s
    this._sparkInterval = setInterval(() => {
      const gold = ResourceSystem.gold;
      if (this._lastGoldSample > 0) {
        const rate = gold - this._lastGoldSample;
        this.sparkline.push(Math.max(0, rate));
        this.sparkline.setLabel(`${formatNumber(Math.max(0, rate))}/s`);
      }
      this._lastGoldSample = gold;
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Bottom bar — event log (les actions rapides arriveront plus tard)
  // ---------------------------------------------------------------------------

  _mountBottomBar() {
    if (!this.bottomBar) return;

    // --- Actions grid : vrais boutons fonctionnels ---
    const actionsSlot = document.createElement('div');
    actionsSlot.className = 'actions-grid';
    this.bottomBar.append(actionsSlot);

    // Recruit Warrior
    this.actionButtons.push(
      new ActionButton(actionsSlot, {
        label: 'Recruit ⚔',
        icon: '➕',
        getSublabel: () => `${formatNumber(BALANCE.recruit.warrior_cost)}◆`,
        canActivate: () => {
          const scene = this.game.scene.getScene('CombatScene');
          return (
            ResourceSystem.gold >= BALANCE.recruit.warrior_cost &&
            scene?.combat?.teamA?.length < BALANCE.recruit.max_team_size
          );
        },
        onClick: () => {
          const scene = this.game.scene.getScene('CombatScene');
          if (scene?.recruitUnit) {
            scene.recruitUnit('warrior');
            setTimeout(() => this._remountUnitCards(), 50);
          }
        },
      })
    );

    // Recruit Archer
    this._addRecruitButton(actionsSlot, 'archer', '🏹');

    // Recruit Mage
    this._addRecruitButton(actionsSlot, 'mage', '✦');

    // Recruit Healer
    this._addRecruitButton(actionsSlot, 'healer', '✚');

    // Fuse
    this.actionButtons.push(
      new ActionButton(actionsSlot, {
        label: 'Fusion',
        icon: '⚡',
        getSublabel: () => {
          const scene = this.game.scene.getScene('CombatScene');
          const trio = scene?.combat ? findFusableTrio(scene.combat.teamA) : null;
          if (!trio) return 'aucun trio';
          const gn = gradeName(trio[0].class, trio[0].grade) || `grade ${trio[0].grade}`;
          return `3×${gn} → +1 grade`;
        },
        canActivate: () => {
          const scene = this.game.scene.getScene('CombatScene');
          return scene?.combat ? !!findFusableTrio(scene.combat.teamA) : false;
        },
        onClick: () => {
          const scene = this.game.scene.getScene('CombatScene');
          if (scene?._attemptFusion) {
            scene._attemptFusion();
            setTimeout(() => this._remountUnitCards(), 100);
          }
        },
      })
    );

    // Inventaire
    this.actionButtons.push(
      new ActionButton(actionsSlot, {
        label: 'Inventaire',
        icon: '🎒',
        getSublabel: () => {
          const { ItemSystem: IS } = require_itemsystem();
          return `${IS.getAll().length}/${BALANCE.loot.inventory_size}`;
        },
        canActivate: () => true,
        onClick: () => this.inventoryModal?.modal?.toggle(),
      })
    );

    // Restart combat
    this.actionButtons.push(
      new ActionButton(actionsSlot, {
        label: 'Restart',
        icon: '↺',
        getSublabel: () => 'wave 1',
        canActivate: () => true,
        onClick: () => {
          const scene = this.game.scene.getScene('CombatScene');
          if (scene?.restartCombat) scene.restartCombat();
        },
      })
    );

    // Prestige (ouvre la modale)
    this.actionButtons.push(
      new ActionButton(actionsSlot, {
        label: 'Prestige',
        icon: '♦',
        getSublabel: () => {
          const agg = TelemetrySystem.getAggregates();
          const maxW = agg?.maxWave ?? 0;
          if (maxW < BALANCE.prestige.min_wave) return `wave ${BALANCE.prestige.min_wave} min`;
          return `+${PrestigeSystem.computeFragments(maxW)}♦`;
        },
        canActivate: () => {
          const agg = TelemetrySystem.getAggregates();
          return (agg?.maxWave ?? 0) >= BALANCE.prestige.min_wave;
        },
        onClick: () => this.prestigeModal?.modal?.toggle(),
      })
    );

    const logSlot = document.createElement('div');
    logSlot.className = 'event-log-wrapper';
    this.bottomBar.append(logSlot);

    this.eventLog = new EventLog(logSlot, {
      telemetry: TelemetrySystem,
      maxEntries: 20,
      formatters: {
        unit_levelup: (e) => ({
          text: `${e.unitId} passe niveau ${e.newLevel}`,
          cssClass: 'type-levelup',
        }),
        unit_died: (e) => {
          if (e.side === 'enemy') {
            return {
              text: `${e.unitId} éliminé (par ${e.killedBy})`,
              cssClass: 'type-death',
            };
          }
          return {
            text: `${e.unitId} est tombé`,
            cssClass: 'type-death',
          };
        },
        wave_ended: (e) => {
          if (e.result === 'victory') {
            return {
              text: `Vague gagnée · +${e.gold ?? 0}◆${e.gems ? ' +' + e.gems + '◇' : ''}`,
              cssClass: 'type-victory',
            };
          }
          return { text: `Vague perdue`, cssClass: 'type-death' };
        },
        unit_fused: (e) => ({
          text: `Fusion : 3×${gradeName(e.class, e.oldGrade) || 'grade ' + e.oldGrade} → ${gradeName(e.class, e.newGrade) || 'grade ' + e.newGrade}`,
          cssClass: 'type-fusion',
        }),
        heal_performed: (e) => ({
          text: `${e.healerId} soigne ${e.targetId} (+${e.amount} HP)`,
          cssClass: 'type-levelup',
        }),
        combat_started: (e) => ({
          text: `Wave ${e.waveId} — ${e.monsters?.length ?? 1} ennemi(s)`,
        }),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Scene-dependent — unit cards à gauche
  // ---------------------------------------------------------------------------

  _waitForScene(cb) {
    const check = () => {
      const scene = this.game.scene.getScene('CombatScene');
      if (scene && scene.combat && Array.isArray(scene.combat.teamA) && scene.combat.teamA.length > 0) {
        cb(scene);
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  }

  _addRecruitButton(container, className, icon) {
    const costKey = `${className}_cost`;
    const cost = BALANCE.recruit[costKey] ?? 50;
    this.actionButtons.push(
      new ActionButton(container, {
        label: `Recruit ${icon}`,
        icon: '➕',
        getSublabel: () => `${formatNumber(cost)}◆`,
        canActivate: () => {
          const scene = this.game.scene.getScene('CombatScene');
          return (
            ResourceSystem.gold >= cost &&
            scene?.combat?.teamA?.length < BALANCE.recruit.max_team_size
          );
        },
        onClick: () => {
          const scene = this.game.scene.getScene('CombatScene');
          if (scene?.recruitUnit) {
            scene.recruitUnit(className);
            setTimeout(() => this._remountUnitCards(), 50);
          }
        },
      })
    );
  }

  _mountModals() {
    this.statsModal = new StatsModal({ telemetry: TelemetrySystem });
    this.prestigeModal = new PrestigeModal({ game: this.game });
    this.inventoryModal = new InventoryModal({ game: this.game });
    // Admin panel — F12 toggle, positionné en bas-droite de l'écran.
    this.adminPanel = new AdminPanel(document.body, { game: this.game });
  }

  _mountSceneDependent(scene) {
    this._mountUnitCards();
    this._mountEnemyPanel();
    this._mountSynergyBadges(scene);
    this._showOfflineRewardIfAny(scene);

    // Écoute les fusions pour remonter les cartes quand la team change.
    this._fusionUnsubscribe = TelemetrySystem.onBroadcast((event) => {
      if (event.type === 'unit_fused') {
        // Léger délai pour laisser CombatScene finir sa mutation.
        setTimeout(() => {
          this._remountUnitCards();
          // Les synergies peuvent changer après fusion : refresh
          if (this.synergyBadges) this.synergyBadges.refresh();
        }, 50);
      }
    });
  }

  _mountSynergyBadges(scene) {
    if (!this.leftCol || !scene || !scene.combat) return;
    // Import dynamique pour ne pas charger le module si pas utilisé
    import('./SynergyBadges.js').then(({ SynergyBadges }) => {
      this.synergyBadges = new SynergyBadges(this.leftCol, { combat: scene.combat });
    });
  }

  _mountEnemyPanel() {
    if (!this.rightCol) return;
    this.enemyPanel = new EnemyPanel(this.rightCol, {
      game: this.game,
      telemetry: TelemetrySystem,
    });
  }

  _mountUnitCards() {
    if (!this.leftCol) return;
    const scene = this.game.scene.getScene('CombatScene');
    if (!scene || !scene.combat) return;

    // Container de team
    if (!this.teamContainer) {
      const title = document.createElement('div');
      title.className = 'team-panel-title';
      title.textContent = 'ÉQUIPE';
      this.leftCol.append(title);

      this.teamContainer = document.createElement('div');
      this.teamContainer.className = 'team-panel';
      this.leftCol.append(this.teamContainer);
    }

    for (const fighter of scene.combat.teamA) {
      const card = new UnitCard(this.teamContainer, {
        fighter,
        telemetry: TelemetrySystem,
      });
      this.unitCards.push(card);
    }
  }

  _remountUnitCards() {
    for (const card of this.unitCards) card.destroy();
    this.unitCards = [];
    this._mountUnitCards();
  }

  // ---------------------------------------------------------------------------
  // Offline rewards
  // ---------------------------------------------------------------------------

  _showOfflineRewardIfAny(scene) {
    const reward = scene._offlineReward;
    if (!reward || !reward.shouldShow || reward.gold <= 0) return;

    // Bandeau "Bienvenue" via WaveBanner — format offline.
    if (scene.waveBanner) {
      const dur = formatDuration(reward.elapsed);
      scene.waveBanner.show(
        `+${formatNumber(reward.gold)} ◆`,
        `Absent ${dur} — bienvenue !`,
        { holdMs: 2500, borderColor: 0xfbbf24 }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Before unload — sauvegarde d'urgence
  // ---------------------------------------------------------------------------

  _bindBeforeUnload() {
    this._beforeUnloadHandler = () => {
      const scene = this.game.scene.getScene('CombatScene');
      if (scene?.saveGame) scene.saveGame();
    };
    window.addEventListener('beforeunload', this._beforeUnloadHandler);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  destroy() {
    if (this._waveInterval) clearInterval(this._waveInterval);
    if (this._sparkInterval) clearInterval(this._sparkInterval);
    if (this._fusionUnsubscribe) this._fusionUnsubscribe();
    for (const r of this.resources) r.destroy();
    for (const c of this.unitCards) c.destroy();
    for (const b of this.actionButtons) b.destroy();
    if (this.eventLog) this.eventLog.destroy();
    if (this.sparkline) this.sparkline.destroy();
    if (this.enemyPanel) this.enemyPanel.destroy();
    if (this.statsModal) this.statsModal.destroy();
    if (this.prestigeModal) this.prestigeModal.destroy();
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler);
    }
  }
}
