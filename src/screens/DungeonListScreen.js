// DungeonListScreen — sous-menu listant les donjons disponibles.
// Pour l'instant 1 donjon ("Crypte Oubliée"), extensible facilement.

import { DungeonSystem } from '../systems/DungeonSystem.js';
import { attachGuideButton } from '../ui/GuideModal.js';

const DUNGEONS = [
  {
    id: 'crypte',
    name: 'Crypte Oubliée',
    desc: '20 étages — monstres aléatoires, choix stratégiques entre chaque étage.',
    icon: '💀',
    floors: 20,
    difficulty: 'Normal',
    diffColor: '#22c55e',
    unlocked: true,
  },
  {
    id: 'abysses',
    name: 'Abysses Infinies',
    desc: 'Étages infinis — combien de temps survivrez-vous ?',
    icon: '🌀',
    floors: '∞',
    difficulty: 'Difficile',
    diffColor: '#f97316',
    unlocked: false, // futur
  },
  {
    id: 'tour',
    name: 'Tour du Champion',
    desc: '50 étages — boss tous les 5 étages, récompenses légendaires.',
    icon: '🏰',
    floors: 50,
    difficulty: 'Extrême',
    diffColor: '#ef4444',
    unlocked: false, // futur
  },
];

export class DungeonListScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen dungeon-list-screen';
    this.el.innerHTML = `
      <div class="dungeon-list-container">
        <div class="dungeon-list-header">
          <button class="map-back-btn" id="dlist-back">← Menu</button>
          <span class="dungeon-list-title">DONJONS</span>
          <div id="dlist-guide"></div>
        </div>
        <div class="dungeon-list-subtitle">Choisissez votre exploration</div>
        <div class="dungeon-list-grid">
          ${DUNGEONS.map(d => `
            <div class="dungeon-list-card ${d.unlocked ? 'unlocked' : 'locked'}" data-dungeon="${d.id}">
              <div class="dungeon-list-card-icon">${d.icon}</div>
              <div class="dungeon-list-card-body">
                <div class="dungeon-list-card-name">${d.name}</div>
                <div class="dungeon-list-card-desc">${d.desc}</div>
                <div class="dungeon-list-card-info">
                  <span>${d.floors} étages</span>
                  <span style="color:${d.diffColor}">${d.difficulty}</span>
                </div>
              </div>
              ${!d.unlocked ? '<div class="dungeon-list-card-lock">🔒 Bientôt</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.el.querySelector('#dlist-back').addEventListener('click', () => {
      this.onNavigate('menu');
    });

    attachGuideButton(this.el.querySelector('#dlist-guide'), 'dungeons');

    this.el.querySelectorAll('.dungeon-list-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        this.onNavigate('dungeon');
      });
    });
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
