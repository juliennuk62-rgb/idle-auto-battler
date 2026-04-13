// CollectionScreen — grille de tous les héros (pokédex).
// Héros obtenus = colorés avec fiche détaillée. Non obtenus = silhouette.
// Milestones de collection qui donnent des bonus permanents.

import { HEROES, HERO_RARITIES } from '../data/heroes.js';
import { GachaSystem } from '../systems/GachaSystem.js';
import { attachGuideButton } from '../ui/GuideModal.js';

// Milestones de collection
const MILESTONES = [
  { count: 5,  label: 'Novice',            bonus: '+5% or permanent',  icon: '🥉' },
  { count: 10, label: 'Collecteur',        bonus: '+5% XP permanent',  icon: '🥈' },
  { count: 15, label: 'Maître',            bonus: '+10% ATK permanent', icon: '🥇' },
  { count: 20, label: 'Collectionneur Ultime', bonus: 'Titre + cadre doré', icon: '👑' },
];

export class CollectionScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this.selectedHero = null;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen collection-screen';
    this._render();
  }

  _render() {
    const owned = GachaSystem.getOwnedHeroes();
    const ownedCount = owned.length;

    this.el.innerHTML = `
      <div class="collection-container">
        <div class="collection-header">
          <button class="map-back-btn" id="collection-back">← Menu</button>
          <span class="collection-title">COLLECTION</span>
          <div id="collection-guide"></div>
          <span class="collection-count">${ownedCount}/${HEROES.length}</span>
        </div>

        <div class="collection-milestones">
          ${MILESTONES.map(m => `
            <div class="collection-milestone ${ownedCount >= m.count ? 'milestone-done' : ''}">
              <span class="milestone-icon">${m.icon}</span>
              <span class="milestone-label">${m.label} (${m.count})</span>
              <span class="milestone-bonus">${m.bonus}</span>
            </div>
          `).join('')}
        </div>

        <div class="collection-grid">
          ${HEROES.map(h => {
            const isOwned = owned.includes(h.id);
            const rarity = HERO_RARITIES[h.rarity];
            return `
              <div class="collection-card ${isOwned ? 'collection-owned' : 'collection-locked'}"
                   data-hero="${h.id}" style="--card-color:${rarity.color}">
                <div class="collection-card-rarity" style="color:${rarity.color}">${rarity.name}</div>
                <div class="collection-card-name">${isOwned ? h.name : '???'}</div>
                <div class="collection-card-class">${isOwned ? h.class : '—'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="collection-detail" id="collection-detail"></div>
      </div>
    `;

    this.el.querySelector('#collection-back').addEventListener('click', () => this.onNavigate('menu'));

    attachGuideButton(this.el.querySelector('#collection-guide'), 'collection');

    this.el.querySelectorAll('.collection-owned').forEach(card => {
      card.addEventListener('click', () => {
        const heroId = card.dataset.hero;
        this._showDetail(heroId);
      });
    });
  }

  _showDetail(heroId) {
    const hero = HEROES.find(h => h.id === heroId);
    if (!hero) return;
    const rarity = HERO_RARITIES[hero.rarity];
    const detail = this.el.querySelector('#collection-detail');

    detail.innerHTML = `
      <div class="collection-detail-card">
        <div class="collection-detail-close" id="detail-close">✕</div>
        <div class="collection-detail-rarity" style="color:${rarity.color}">${rarity.name}</div>
        <div class="collection-detail-name" style="color:${rarity.color}">${hero.name}</div>
        <div class="collection-detail-class">${hero.class}</div>
        <div class="collection-detail-lore">${hero.lore || ''}</div>
        <div class="collection-detail-stats">
          <div class="collection-detail-stat">Multiplicateur stats : <strong>×${rarity.mult}</strong></div>
        </div>
        ${(hero.passifs || []).length > 0 ? `
          <div class="collection-detail-passifs">
            ${hero.passifs.map(p => `
              <div class="collection-detail-passif">
                <span class="passif-name">${p.name}</span>
                <span class="passif-desc">${p.desc}</span>
              </div>
            `).join('')}
          </div>
        ` : '<div class="collection-detail-no-passif">Aucun passif spécial</div>'}
      </div>
    `;

    detail.style.display = 'flex';
    detail.querySelector('#detail-close').addEventListener('click', () => {
      detail.style.display = 'none';
    });
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
