// Main — point d'entrée. Gère le flow entre les écrans :
// Login → Menu → Carte → Combat → Carte
//
// Le jeu Phaser ne tourne QUE pendant le combat. Le menu et la carte
// sont en pur DOM (pas de canvas Phaser visible).

import { AuthSystem } from './systems/AuthSystem.js';
import { WorldSystem } from './systems/WorldSystem.js';
// DungeonSystem retiré — remplacé par DungeonExploreScreen + DungeonCombatScene
import { TalentSystem } from './systems/TalentSystem.js';
import { OnboardingSystem } from './systems/OnboardingSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AchievementScreen } from './screens/AchievementScreen.js';
import { LoginScreen } from './ui/LoginScreen.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { MapScreen } from './screens/MapScreen.js';
// DungeonChoiceScreen et DungeonListScreen retirés — remplacés par DungeonExploreScreen
import { SummonScreen } from './screens/SummonScreen.js';
import { ChestShopScreen } from './screens/ChestShopScreen.js';
import { CombatScene } from './scenes/CombatScene.js';
import { DungeonCombatScene } from './scenes/DungeonCombatScene.js';
import { DungeonExploreScreen } from './screens/DungeonExploreScreen.js';
import { Cockpit } from './ui/Cockpit.js';
import { ResourceSystem } from './systems/ResourceSystem.js';
import { ItemSystem } from './systems/ItemSystem.js';
import { GachaSystem } from './systems/GachaSystem.js';
import { DailySystem } from './systems/DailySystem.js';
import { DailyRewardPopup } from './ui/DailyRewardPopup.js';
import { MissionSystem } from './systems/MissionSystem.js';
import { MissionScreen } from './screens/MissionScreen.js';
import { MissionToast } from './ui/MissionToast.js';
import { CollectionScreen } from './screens/CollectionScreen.js';
import { TeamScreen } from './screens/TeamScreen.js';
import { DevConsole } from './ui/DevConsole.js';

let currentScreen = null;
let game = null;
let cockpit = null;
let missionToast = null;
let dungeonExploreScreen = null; // gardé en mémoire pour le callback de fin de combat

// ─── Boot ────────────────────────────────────────────────────────────────────

async function boot() {
  const user = await AuthSystem.waitForAuth();

  if (!user) {
    const loginScreen = new LoginScreen();
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (AuthSystem.isLoggedIn()) { clearInterval(check); resolve(); }
      }, 200);
    });
  }

  // ─── Charge le cloud save (avec garde-fous anti-perte de données) ───
  // Règle d'or : NE JAMAIS effacer le localStorage. Le local est la source
  // de vérité primaire, le cloud n'est qu'une copie de secours.
  let cloudData = null;
  try {
    cloudData = await AuthSystem.cloudLoad();
  } catch (e) {
    console.error('[Boot] cloudLoad failed, conservation du localStorage:', e);
  }

  if (cloudData) {
    // Compare les timestamps : si le local est PLUS RÉCENT que le cloud,
    // on garde le local (le user a joué offline, ses données sont plus à jour).
    const localSave = JSON.parse(localStorage.getItem('idle_autobattler_save') || 'null');
    const cloudTs = cloudData.save?.ts || 0;
    const localTs = localSave?.ts || 0;
    const useCloud = cloudTs > localTs;

    if (useCloud) {
      console.log('[Boot] Restauration depuis cloud (plus récent que local)');
      if (cloudData.save) localStorage.setItem('idle_autobattler_save', JSON.stringify(cloudData.save));
      if (cloudData.inventory) localStorage.setItem('idle_autobattler_inventory', JSON.stringify(cloudData.inventory));
      if (cloudData.prestige) localStorage.setItem('idle_autobattler_prestige', JSON.stringify(cloudData.prestige));
      if (cloudData.telemetry) localStorage.setItem('telemetry_aggregates', JSON.stringify(cloudData.telemetry));
      if (typeof cloudData.soul === 'number') localStorage.setItem('idle_autobattler_soul', String(cloudData.soul));
      if (cloudData.world) {
        localStorage.setItem('idle_autobattler_world', JSON.stringify(cloudData.world));
        WorldSystem.restore(cloudData.world);
      }
      if (cloudData.gacha) GachaSystem.restore(cloudData.gacha);
      if (cloudData.daily) DailySystem.restore(cloudData.daily);
      if (cloudData.missions) MissionSystem.restore(cloudData.missions);
      if (cloudData.talents) TalentSystem.restore(cloudData.talents);
      if (cloudData.onboarding) OnboardingSystem.restore(cloudData.onboarding);
      if (cloudData.achievements) AchievementSystem.restore(cloudData.achievements);
      if (cloudData.dungeonRun) localStorage.setItem('idle_autobattler_dungeon_run', JSON.stringify(cloudData.dungeonRun));

      // Force un re-load de l'inventaire (ItemSystem singleton ne se recharge pas seul)
      if (cloudData.inventory) {
        try { (await import('./systems/ItemSystem.js')).ItemSystem._load(); } catch (e) {}
      }
    } else {
      console.log('[Boot] Conservation du localStorage (plus récent que cloud)');
    }
  } else {
    console.log('[Boot] Pas de cloud data — démarrage avec localStorage existant');
  }

  // Cloud save périodique avec timer visuel.
  _createSaveIndicator();
  setInterval(() => {
    cloudSaveAll();
    _flashSaveIndicator();
  }, 30000);

  // beforeunload : sauvegarde synchrone en localStorage + tentative cloud (best effort)
  window.addEventListener('beforeunload', () => {
    cloudSaveAll(); // best effort, peut ne pas finir
  });

  // pagehide : plus fiable que beforeunload sur mobile/navigateurs modernes
  window.addEventListener('pagehide', () => {
    cloudSaveAll();
  });

  // visibilitychange : sauvegarde quand l'onglet devient invisible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cloudSaveAll();
    }
  });

  // Toast de notification missions — actif partout (menu, combat, etc.)
  missionToast = new MissionToast();

  // Console admin (F9) — accessible partout
  new DevConsole();

  // Toast quand un achievement est débloqué
  AchievementSystem.onUnlock((ach) => {
    const toast = document.createElement('div');
    toast.className = 'achiev-toast';
    toast.innerHTML = `
      <span class="achiev-toast-icon">${ach.icon}</span>
      <div>
        <div class="achiev-toast-text">ACHIEVEMENT DÉBLOQUÉ</div>
        <div class="achiev-toast-name">${ach.name} — ${ach.desc}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });

  // Démarre au menu principal.
  navigateTo('menu');

  // Check daily login reward.
  const dailyCheck = DailySystem.checkLogin();
  if (dailyCheck.canClaim) {
    const popup = new DailyRewardPopup();
    popup.show();
  }
}

// ─── Navigation entre écrans ─────────────────────────────────────────────────

function navigateTo(screen, data) {
  // Nettoie l'écran actuel.
  if (currentScreen && currentScreen.hide) currentScreen.hide();
  if (screen !== 'combat') hideGame();

  switch (screen) {
    case 'menu':
      currentScreen = new MenuScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'map':
      currentScreen = new MapScreen((target, d) => navigateTo(target, d));
      currentScreen.show();
      break;

    case 'combat':
      if (data?.mode === 'dungeon') {
        startCombat(null, data);
      } else if (data?.biomeId) {
        startCombat(data.biomeId);
      } else {
        navigateTo('map');
      }
      break;

    // Routes dungeon legacy retirées (DungeonListScreen, DungeonChoiceScreen)
    // Tout passe par dungeon_explore et dungeon_combat maintenant.

    case 'dungeon_explore':
      // Crée toujours une nouvelle instance (le constructeur charge la save auto)
      dungeonExploreScreen = new DungeonExploreScreen((target, d) => navigateTo(target, d));
      currentScreen = dungeonExploreScreen;
      currentScreen.show();
      break;

    case 'dungeon_combat':
      startDungeonCombat(data);
      break;

    case 'summon':
      currentScreen = new SummonScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'chests':
      currentScreen = new ChestShopScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'missions':
      currentScreen = new MissionScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'collection':
      currentScreen = new CollectionScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'team':
      currentScreen = new TeamScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'achievements':
      currentScreen = new AchievementScreen((target) => navigateTo(target));
      currentScreen.show();
      break;

    case 'inventory':
    case 'prestige':
    case 'stats':
      navigateTo('map');
      break;
  }
}

// ─── Combat ──────────────────────────────────────────────────────────────────

function startCombat(biomeId, dungeonData) {
  // Cache le cockpit et le game div par défaut.
  const cockpitEl = document.querySelector('.cockpit');
  const gameDiv = document.getElementById('game');

  if (game) {
    // Le jeu Phaser existe déjà → met à jour le registry AVANT le restart.
    game.registry.set('biomeId', biomeId);
    game.registry.set('dungeonData', dungeonData || null);
    game.scene.getScene('CombatScene')?.scene.restart({ biomeId });
    showGame();
  } else {
    // Premier lancement → crée le jeu Phaser.
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 480,
      parent: 'game',
      backgroundColor: '#1a1a2e',
      scene: [CombatScene],
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };
    game = new Phaser.Game(config);
    game.registry.set('biomeId', biomeId);
    game.registry.set('onCombatEnd', (result) => onCombatEnd(result));
    cockpit = new Cockpit(game);
    showGame();
  }

  // Premier lancement : set aussi le dungeonData.
  if (!dungeonData) game.registry.set('dungeonData', null);

  window.__game = game;
  window.__cockpit = cockpit;
}

function onCombatEnd(result) {
  hideGame();
  // Déverrouille l'équipement — on n'est plus en combat
  ItemSystem.equipmentLocked = false;

  // Mode biome normal → retour carte.
  if (result) {
    WorldSystem.completeRun(result.biomeId, result.waveReached, result.bossBeaten);
    if (result.victory) {
      MissionSystem.track('biome_wins', 1);
      OnboardingSystem.recordVictory();
    }
    // Achievement tracking
    if (result.waveReached) AchievementSystem.update('max_wave', result.waveReached);
    if (result.bossBeaten) AchievementSystem.increment('boss_kills');
  }
  navigateTo('map');
}

function showGame() {
  const cockpitEl = document.querySelector('.cockpit');
  if (cockpitEl) cockpitEl.style.display = 'grid';
}

function hideGame() {
  const cockpitEl = document.querySelector('.cockpit');
  if (cockpitEl) cockpitEl.style.display = 'none';
}

// ─── Dungeon Combat (tour par tour) ─────────────────────────────────────────

let dungeonGame = null;

function startDungeonCombat(data) {
  // Crée un div dédié au donjon (hors du cockpit grid)
  let dungeonDiv = document.getElementById('dungeon-game');
  if (!dungeonDiv) {
    dungeonDiv = document.createElement('div');
    dungeonDiv.id = 'dungeon-game';
    dungeonDiv.style.cssText = 'position:fixed;inset:0;z-index:50000;background:#0f0f1e;display:flex;align-items:center;justify-content:center;overflow:hidden;';
    document.body.appendChild(dungeonDiv);
  }
  dungeonDiv.style.display = 'flex';

  // Stocker les données dans le global (lu par init())
  window.__dungeonCombatData = data;

  if (dungeonGame) {
    // Réutilise le game existant — stop + restart la scène (pas de destroy)
    const scene = dungeonGame.scene.getScene('DungeonCombatScene');
    if (scene) {
      // Nettoie le DungeonUI DOM de l'ancienne salle
      const oldUI = dungeonDiv.querySelector('.dui-overlay');
      if (oldUI) oldUI.remove();

      scene.scene.restart(data);
    }
  } else {
    // Premier lancement — crée le Game Phaser une seule fois
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 480,
      parent: 'dungeon-game',
      backgroundColor: '#0f0f1e',
      scene: [DungeonCombatScene],
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };
    dungeonGame = new Phaser.Game(config);
  }

  window.__dungeonGame = dungeonGame;

  dungeonGame.registry.set('onDungeonCombatEnd', (result) => {
    hideDungeonCombat();
    ItemSystem.equipmentLocked = false;
    if (result.quit) {
      // Quitter manuellement → retour menu (la save est conservée)
      navigateTo('menu');
    } else {
      // Victoire ou défaite → retour à l'exploration
      // L'explore screen gère la logique (avancer ou réessayer)
      if (dungeonExploreScreen) {
        dungeonExploreScreen.onCombatResult(result);
        dungeonExploreScreen.show();
      } else {
        navigateTo('dungeon_explore');
      }
    }
  });
}

function hideDungeonCombat() {
  const dungeonDiv = document.getElementById('dungeon-game');
  if (dungeonDiv) dungeonDiv.style.display = 'none';
  // On ne détruit PAS dungeonGame — on le réutilise pour la prochaine salle.
  // Le DungeonUI DOM est nettoyé par le shutdown handler de la scène.
}

// ─── Cloud save ──────────────────────────────────────────────────────────────

async function cloudSaveAll() {
  if (!AuthSystem.isLoggedIn()) return;
  try {
    const data = {
      save: JSON.parse(localStorage.getItem('idle_autobattler_save') || 'null'),
      inventory: JSON.parse(localStorage.getItem('idle_autobattler_inventory') || '[]'),
      prestige: JSON.parse(localStorage.getItem('idle_autobattler_prestige') || 'null'),
      telemetry: JSON.parse(localStorage.getItem('telemetry_aggregates') || 'null'),
      soul: parseInt(localStorage.getItem('idle_autobattler_soul') || '0', 10),
      world: WorldSystem.serialize(),
      gacha: GachaSystem.serialize(),
      daily: DailySystem.serialize(),
      missions: MissionSystem.serialize(),
      talents: TalentSystem.serialize(),
      onboarding: OnboardingSystem.serialize(),
      achievements: AchievementSystem.serialize(),
      dungeonRun: JSON.parse(localStorage.getItem('idle_autobattler_dungeon_run') || 'null'),
    };
    await AuthSystem.cloudSave(data);
  } catch (e) {
    console.error('[CloudSave] failed:', e);
  }
}

window.__cloudSaveAll = cloudSaveAll;

// ─── Indicateur de sauvegarde ────────────────────────────────────────────────

let _saveIndicator = null;
let _saveCountdown = 30;
let _saveTimer = null;

function _createSaveIndicator() {
  _saveIndicator = document.createElement('div');
  _saveIndicator.id = 'save-indicator';
  _saveIndicator.style.cssText = `
    position: fixed; bottom: 8px; right: 12px; z-index: 99998;
    font-family: 'Inter', system-ui, sans-serif; font-size: 11px;
    color: #666; display: flex; align-items: center; gap: 6px;
    pointer-events: none; transition: color 0.3s;
  `;
  document.body.appendChild(_saveIndicator);

  // Countdown ticker
  _saveCountdown = 30;
  _saveTimer = setInterval(() => {
    _saveCountdown = Math.max(0, _saveCountdown - 1);
    if (_saveIndicator) {
      _saveIndicator.innerHTML = `<span style="font-size:13px;">💾</span> ${_saveCountdown}s`;
    }
  }, 1000);
}

function _flashSaveIndicator() {
  _saveCountdown = 30;
  if (!_saveIndicator) return;
  _saveIndicator.innerHTML = '<span style="font-size:13px;">✅</span> Sauvegardé';
  _saveIndicator.style.color = '#22c55e';
  setTimeout(() => {
    if (_saveIndicator) _saveIndicator.style.color = '#666';
  }, 2000);
}
window.__navigateTo = navigateTo;

// Expose onCombatEnd pour que CombatScene puisse appeler.
window.__onCombatEnd = onCombatEnd;

// ── Go! ──
boot().catch(console.error);
