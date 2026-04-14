// TeamScreen — écran de gestion d'équipe.
// Affiche les 4 slots (Guerrier, Archer, Mage, Healer), permet d'assigner
// un héros gacha à chaque slot, et montre les stats résultantes.

import { GachaSystem } from '../systems/GachaSystem.js';
import { HEROES, HERO_RARITIES } from '../data/heroes.js';
import { attachGuideButton } from '../ui/GuideModal.js';

// 5 slots fixes — les IDs matchent ceux utilisés par CombatScene._createDefaultTeam()
export const TEAM_SLOTS = [
  { id: 'slot_1', class: 'warrior', name: 'Guerrier 1', sprite: 'warrior', color: '#22c55e' },
  { id: 'slot_2', class: 'warrior', name: 'Guerrier 2', sprite: 'warrior', color: '#3b82f6' },
  { id: 'slot_3', class: 'archer',  name: 'Archer',     sprite: 'archer',  color: '#fbbf24' },
  { id: 'slot_4', class: 'mage',    name: 'Mage',       sprite: 'mage',    color: '#60a5fa' },
  { id: 'slot_5', class: 'healer',  name: 'Healer',     sprite: 'healer',  color: '#a855f7' },
];

export class TeamScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen team-screen';
    this._render();
  }

  _render() {
    const owned = GachaSystem.getOwnedHeroes();
    const assignments = GachaSystem.getAssignments?.() || {};

    this.el.innerHTML = `
      <div class="team-container">
        <div class="team-header">
          <button class="map-back-btn" id="team-back">← Menu</button>
          <span class="team-title">ÉQUIPE</span>
          <div id="team-guide"></div>
        </div>

        <div class="team-slots">
          ${TEAM_SLOTS.map(slot => {
            const assignedHeroId = assignments[slot.id];
            const hero = assignedHeroId ? HEROES.find(h => h.id === assignedHeroId) : null;
            const rarity = hero ? HERO_RARITIES[hero.rarity] : null;

            return `
              <div class="team-slot" data-slot="${slot.id}">
                <div class="team-slot-header" style="border-color:${slot.color}">
                  <img src="assets/sprites/allies/${slot.sprite}.png" class="team-slot-sprite" />
                  <div class="team-slot-info">
                    <div class="team-slot-class" style="color:${slot.color}">${slot.name}</div>
                    ${hero
                      ? `<div class="team-slot-hero" style="color:${rarity.color}">${hero.name} <span class="team-slot-rarity">${rarity.name}</span></div>
                         <div class="team-slot-mult">Stats ×${rarity.mult}</div>`
                      : `<div class="team-slot-hero team-slot-empty">Aucun héros assigné</div>`
                    }
                  </div>
                </div>
                <div class="team-slot-actions">
                  ${hero
                    ? `<button class="team-btn team-btn-remove" data-slot="${slot.id}" data-action="remove">Retirer</button>`
                    : ''
                  }
                  <button class="team-btn team-btn-assign" data-slot="${slot.id}" data-class="${slot.class}" data-action="assign">
                    ${hero ? 'Changer' : 'Assigner un héros'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="team-heroes-title">Héros disponibles (${owned.length})</div>
        <div class="team-heroes-grid">
          ${owned.length === 0
            ? '<div class="team-empty-msg">Aucun héros. Faites des invocations !</div>'
            : owned.map(heroId => {
                const hero = HEROES.find(h => h.id === heroId);
                if (!hero) return '';
                const rarity = HERO_RARITIES[hero.rarity];
                const isAssigned = Object.values(assignments).includes(heroId);
                return `
                  <div class="team-hero-card ${isAssigned ? 'team-hero-assigned' : ''}" data-hero="${heroId}" data-rarity="${hero.rarity}">
                    <div class="team-hero-rarity" style="color:${rarity.color}">${rarity.name}</div>
                    <div class="team-hero-name">${hero.name}</div>
                    <div class="team-hero-class">${hero.class}</div>
                    ${isAssigned ? '<div class="team-hero-badge">En service</div>' : ''}
                  </div>
                `;
              }).join('')
          }
        </div>
      </div>

      <div class="team-assign-modal" id="team-modal" style="display:none;"></div>
    `;

    // Events
    this.el.querySelector('#team-back').addEventListener('click', () => this.onNavigate('menu'));
    attachGuideButton(this.el.querySelector('#team-guide'), 'menu');

    this.el.querySelectorAll('[data-action="assign"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slot;
        const slotClass = btn.dataset.class;
        this._showAssignModal(slotId, slotClass);
      });
    });

    this.el.querySelectorAll('[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', () => {
        GachaSystem.unassignHero?.(btn.dataset.slot);
        this._render();
      });
    });
  }

  _showAssignModal(slotId, slotClass) {
    const owned = GachaSystem.getOwnedHeroes();
    const compatible = owned
      .map(id => HEROES.find(h => h.id === id))
      .filter(h => h && h.class === slotClass);

    const modal = this.el.querySelector('#team-modal');
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="team-modal-content">
        <div class="team-modal-title">Choisir un héros (${slotClass})</div>
        ${compatible.length === 0
          ? `<div class="team-empty-msg">Aucun héros ${slotClass} disponible. Invoquez-en !</div>`
          : `<div class="team-modal-list">
              ${compatible.map(hero => {
                const rarity = HERO_RARITIES[hero.rarity];
                return `
                  <button class="team-modal-hero" data-pick="${hero.id}">
                    <span style="color:${rarity.color}">${rarity.name}</span>
                    <strong>${hero.name}</strong>
                    <span>×${rarity.mult} stats</span>
                  </button>
                `;
              }).join('')}
            </div>`
        }
        <button class="team-btn team-btn-cancel" id="team-modal-close">Annuler</button>
      </div>
    `;

    modal.querySelector('#team-modal-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const heroId = btn.dataset.pick;
        GachaSystem.assignHero?.(heroId, slotId);
        modal.style.display = 'none';
        this._render();
      });
    });
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
