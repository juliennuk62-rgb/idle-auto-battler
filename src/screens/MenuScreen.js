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
import { OnboardingSystem } from '../systems/OnboardingSystem.js';
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
          <button class="menu-btn" data-nav="achievements">
            <span class="menu-btn-icon">🏆</span>
            <span class="menu-btn-label">ACHIEVEMENTS</span>
            <span class="menu-btn-desc">Défis et récompenses</span>
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

    // Onboarding — grise les boutons non débloqués
    const unlocked = OnboardingSystem.getUnlockedButtons();
    const newButtons = OnboardingSystem.getNewButtons();
    if (unlocked) {
      this.el.querySelectorAll('[data-nav]').forEach(btn => {
        const nav = btn.dataset.nav;
        if (!unlocked.includes(nav)) {
          btn.classList.add('menu-btn-locked');
          btn.setAttribute('disabled', 'true');
          const lock = document.createElement('span');
          lock.className = 'menu-btn-lock';
          lock.textContent = '🔒';
          btn.appendChild(lock);
        } else if (newButtons.includes(nav)) {
          // Badge "NEW!" sur les boutons fraîchement débloqués
          btn.classList.add('menu-btn-new');
          const badge = document.createElement('span');
          badge.className = 'menu-btn-new-badge';
          badge.textContent = 'NEW';
          btn.appendChild(badge);
        }
      });

      // Flèche vers Aventure si c'est le seul bouton
      if (unlocked.length === 1) {
        const aventureBtn = this.el.querySelector('[data-nav="map"]');
        if (aventureBtn) {
          const arrow = document.createElement('span');
          arrow.className = 'menu-btn-arrow';
          arrow.textContent = '👈 Commencez ici !';
          aventureBtn.appendChild(arrow);
        }
      }
    }

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
        // 1. Sauvegarde cloud AVANT déconnexion (sinon les dernières données sont perdues)
        try { await window.__cloudSaveAll?.(); } catch (e) {}
        // 2. Déconnexion Firebase (n'efface PAS le localStorage)
        await AuthSystem.signOut();
        // 3. Reload sans rien effacer — le user pourra se reconnecter et retrouver ses données
        window.location.reload();
      });
    }

    // Navigation — les modales s'ouvrent directement depuis le menu.
    this.el.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('menu-btn-locked')) return; // bloqué par onboarding
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
          case 'achievements':
            this.onNavigate('achievements');
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

    // Popup de bienvenue au premier lancement
    if (OnboardingSystem.needsWelcome()) {
      this._showWelcome();
    } else {
      // Notification de palier franchi (après une victoire)
      const notif = OnboardingSystem.consumeNotification();
      if (notif) this._showNotification(notif);
    }
  }

  _showNotification(notif) {
    const popup = document.createElement('div');
    popup.className = 'onboard-welcome';
    popup.innerHTML = `
      <div class="onboard-welcome-card onboard-notif-card">
        <div class="onboard-notif-icon">${notif.icon}</div>
        <div class="onboard-welcome-title">${notif.title}</div>
        <div class="onboard-welcome-text">${notif.text}</div>
        <button class="onboard-welcome-btn" id="onboard-notif-ok">Compris !</button>
      </div>
    `;
    this.el.appendChild(popup);
    popup.querySelector('#onboard-notif-ok').addEventListener('click', () => popup.remove());
  }

  _showWelcome() {
    const popup = document.createElement('div');
    popup.className = 'onboard-welcome';
    popup.innerHTML = `
      <div class="onboard-welcome-card">
        <div class="onboard-welcome-title">Les Terres de l'Oubli</div>
        <div class="onboard-welcome-text">
          Les portails entre les mondes se sont brisés. Des créatures venues d'ailleurs
          envahissent chaque biome, de la Forêt Ancestrale jusqu'au Temple des Dieux.
          Vous êtes le dernier Commandant capable de les arrêter.
        </div>
        <div class="onboard-welcome-steps">
          <div class="onboard-step">1. Menez votre escouade à travers <strong>6 biomes</strong> corrompus</div>
          <div class="onboard-step">2. Invoquez des <strong>héros légendaires</strong> pour renforcer vos rangs</div>
          <div class="onboard-step">3. Affrontez les <strong>Seigneurs</strong> de chaque territoire</div>
        </div>
        <button class="onboard-welcome-btn" id="onboard-ok">C'est parti !</button>
      </div>
    `;
    this.el.appendChild(popup);

    popup.querySelector('#onboard-ok').addEventListener('click', () => {
      OnboardingSystem.markWelcomed();
      popup.remove();
    });
  }

  hide() {
    this.el.remove();
  }
}
