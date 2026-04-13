// MenuScreen — écran titre principal. Affiché après le login.
// Boutons : Aventure (→ carte), Équipe, Inventaire, Prestige, Stats.
// Tout en DOM, pas de Phaser.

import { AuthSystem } from '../systems/AuthSystem.js';
import { InventoryModal } from '../ui/InventoryModal.js';
import { PrestigeModal } from '../ui/PrestigeModal.js';
import { StatsModal } from '../ui/StatsModal.js';
import { TalentModal } from '../ui/TalentModal.js';
import { TelemetrySystem } from '../systems/TelemetrySystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { attachGuideButton } from '../ui/GuideModal.js';

export class MenuScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate; // callback(screen, data)
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen menu-screen';
    this.el.innerHTML = `
      <div class="menu-container">
        <div class="menu-title">IDLE AUTO-BATTLER</div>
        <div class="menu-subtitle">Choisissez votre aventure</div>

        <div class="menu-buttons">
          <button class="menu-btn menu-btn-primary" data-nav="map">
            <span class="menu-btn-icon">⚔</span>
            <span class="menu-btn-label">AVENTURE</span>
            <span class="menu-btn-desc">Carte du monde</span>
          </button>
          <button class="menu-btn menu-btn-primary" data-nav="dungeons">
            <span class="menu-btn-icon">🗡</span>
            <span class="menu-btn-label">DONJONS</span>
            <span class="menu-btn-desc">Exploration roguelike</span>
          </button>
          <button class="menu-btn menu-btn-summon" data-nav="summon">
            <span class="menu-btn-icon">✨</span>
            <span class="menu-btn-label">INVOCATION</span>
            <span class="menu-btn-desc">Invoquez des héros</span>
          </button>
          <button class="menu-btn menu-btn-chest" data-nav="chests">
            <span class="menu-btn-icon">📦</span>
            <span class="menu-btn-label">COFFRES</span>
            <span class="menu-btn-desc">Runes de Boost par biome</span>
          </button>
          <button class="menu-btn menu-btn-mission" data-nav="missions">
            <span class="menu-btn-icon">📋</span>
            <span class="menu-btn-label">MISSIONS</span>
            <span class="menu-btn-desc">Objectifs quotidiens</span>
            ${MissionSystem.getClaimableCount() > 0 ? `<span class="menu-btn-badge">${MissionSystem.getClaimableCount()}</span>` : ''}
          </button>
          <button class="menu-btn" data-nav="collection">
            <span class="menu-btn-icon">📖</span>
            <span class="menu-btn-label">COLLECTION</span>
            <span class="menu-btn-desc">Pokédex de héros</span>
          </button>
          <button class="menu-btn" data-nav="team">
            <span class="menu-btn-icon">👥</span>
            <span class="menu-btn-label">ÉQUIPE</span>
            <span class="menu-btn-desc">Gérez vos héros</span>
          </button>
          <button class="menu-btn" data-nav="talents">
            <span class="menu-btn-icon">🌳</span>
            <span class="menu-btn-label">TALENTS</span>
            <span class="menu-btn-desc">Spécialisez vos unités</span>
          </button>
          <button class="menu-btn" data-nav="inventory">
            <span class="menu-btn-icon">🎒</span>
            <span class="menu-btn-label">INVENTAIRE</span>
            <span class="menu-btn-desc">Équipement et forge</span>
          </button>
          <button class="menu-btn" data-nav="prestige">
            <span class="menu-btn-icon">♦</span>
            <span class="menu-btn-label">PRESTIGE</span>
            <span class="menu-btn-desc">Bonus permanents</span>
          </button>
          <button class="menu-btn" data-nav="stats">
            <span class="menu-btn-icon">📊</span>
            <span class="menu-btn-label">STATISTIQUES</span>
            <span class="menu-btn-desc">Dashboard et télémétrie</span>
          </button>
        </div>

        <div class="menu-user" id="menu-user"></div>
        <div class="menu-guide" id="menu-guide"></div>
      </div>
    `;

    // Bouton guide
    attachGuideButton(this.el.querySelector('#menu-guide'), 'menu');

    // User info
    const user = AuthSystem.getUser();
    if (user) {
      const userDiv = this.el.querySelector('#menu-user');
      userDiv.innerHTML = `
        ${user.photoURL ? `<img src="${user.photoURL}" class="menu-user-avatar" />` : ''}
        <span>${user.displayName || user.email || 'Joueur'}</span>
        <button class="menu-logout-btn" id="menu-logout">Déconnexion</button>
      `;
      userDiv.querySelector('#menu-logout')?.addEventListener('click', async () => {
        await AuthSystem.signOut();
        localStorage.clear();
        window.location.reload();
      });
    }

    // Navigation — les modales s'ouvrent directement depuis le menu.
    this.el.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        switch (target) {
          case 'map':
            this.onNavigate('map');
            break;
          case 'dungeons':
            this.onNavigate('dungeon_explore');
            break;
          case 'summon':
            this.onNavigate('summon');
            break;
          case 'chests':
            this.onNavigate('chests');
            break;
          case 'missions':
            this.onNavigate('missions');
            break;
          case 'collection':
            this.onNavigate('collection');
            break;
          case 'team':
            this.onNavigate('team');
            break;
          case 'talents':
            if (!this._talentModal) this._talentModal = new TalentModal({ game: null });
            this._talentModal.modal.open();
            break;
          case 'inventory':
            if (!this._invModal) this._invModal = new InventoryModal({ game: null });
            this._invModal.modal.open();
            break;
          case 'prestige':
            if (!this._prestigeModal) this._prestigeModal = new PrestigeModal({ game: null });
            this._prestigeModal.modal.open();
            break;
          case 'stats':
            if (!this._statsModal) this._statsModal = new StatsModal({ telemetry: TelemetrySystem });
            this._statsModal.modal.open();
            break;
          default:
            this.onNavigate(target);
        }
      });
    });
  }

  show() {
    document.body.append(this.el);
  }

  hide() {
    this.el.remove();
  }
}
