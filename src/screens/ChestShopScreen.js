// ChestShopScreen — boutique de coffres d'items par biome.
// Chaque biome a un coffre achetable avec des gemmes, garantissant
// un item du set correspondant avec une rareté minimum.

import { ResourceSystem } from '../systems/ResourceSystem.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { generateFromChest, getRarity, RARITY_INDEX } from '../data/items.js';
import { attachGuideButton } from '../ui/GuideModal.js';
import { SoundSystem } from '../systems/SoundSystem.js';

const CHESTS = [
  { biome: 'forest', name: 'Coffre Forêt',   icon: '🌲', cost: 3, minRarity: 0, desc: '1 item Commun+' },
  { biome: 'caves',  name: 'Coffre Grottes',  icon: '🪨', cost: 3, minRarity: 0, desc: '1 item Commun+' },
  { biome: 'ruins',  name: 'Coffre Ruines',   icon: '🏛', cost: 5, minRarity: 1, desc: '1 item Peu commun+' },
  { biome: 'hell',   name: 'Coffre Enfer',    icon: '🔥', cost: 5, minRarity: 1, desc: '1 item Peu commun+' },
  { biome: 'snow',   name: 'Coffre Neige',    icon: '❄',  cost: 8, minRarity: 2, desc: '1 item Rare+' },
  { biome: 'temple', name: 'Coffre Temple',   icon: '⛩',  cost: 8, minRarity: 2, desc: '1 item Rare+' },
];

export class ChestShopScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen chest-screen';
    this._render();
  }

  _render() {
    const gems = ResourceSystem.gems;

    this.el.innerHTML = `
      <div class="chest-container">
        <div class="chest-header">
          <button class="map-back-btn" id="chest-back">← Menu</button>
          <span class="chest-title">COFFRES</span>
          <div id="chest-guide"></div>
          <span class="chest-gems">◇ ${gems}</span>
        </div>

        <div class="chest-subtitle">Ouvrez un coffre pour obtenir une Rune de Boost</div>

        <div class="chest-grid">
          ${CHESTS.map((c, i) => `
            <div class="chest-card ${gems < c.cost ? 'chest-disabled' : ''}" data-idx="${i}">
              <div class="chest-card-icon">${c.icon}</div>
              <div class="chest-card-name">${c.name}</div>
              <div class="chest-card-desc">${c.desc}</div>
              <div class="chest-card-cost">${c.cost} ◇</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="chest-animation-overlay" id="chest-anim" style="display:none;"></div>
    `;

    // Back button
    this.el.querySelector('#chest-back').addEventListener('click', () => this.onNavigate('menu'));

    attachGuideButton(this.el.querySelector('#chest-guide'), 'chests');

    // Chest cards
    this.el.querySelectorAll('.chest-card:not(.chest-disabled)').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        this._openChest(CHESTS[idx]);
      });
    });
  }

  _openChest(chest) {
    if (ResourceSystem.gems < chest.cost) return;
    ResourceSystem.spendGems(chest.cost);

    // Génère l'item depuis le coffre.
    const item = generateFromChest(chest.biome, chest.minRarity);

    // Ajoute l'item à l'inventaire.
    ItemSystem.addItem(item);

    // Animation d'ouverture
    this._playChestAnimation(item, chest);
  }

  _playChestAnimation(item, chest) {
    const overlay = this.el.querySelector('#chest-anim');
    overlay.style.display = 'flex';

    const rarity = getRarity(item.rarity);
    const rarityIdx = RARITY_INDEX[item.rarity] ?? 0;
    // Épique+ → effets boostés (screen shake, particules plus nombreuses, son crash)
    const isEpic = rarityIdx >= 3;

    overlay.innerHTML = `
      <button class="summon-skip-btn" id="chest-skip" title="Passer l'animation">Skip ▸</button>
      <div class="chest-anim-bg"></div>
      <div class="chest-anim-stars-bg"></div>
      <div class="chest-anim-aura" style="--chest-color:${rarity.color};"></div>
      <div class="chest-anim-box" style="--chest-color:${rarity.color};">
        <div class="chest-anim-icon">${chest.icon}</div>
        <div class="chest-anim-glow" style="--chest-color:${rarity.color};"></div>
      </div>
      ${this._renderChestRays(rarity.color)}
      <div class="chest-anim-reveal" style="opacity:0;">
        <div class="chest-anim-flash" style="background:${rarity.color};"></div>
        <div class="chest-anim-item" style="border-color:${rarity.color}; box-shadow:0 0 30px ${rarity.color}60;">
          <div class="chest-anim-item-icon">${item.icon}</div>
          <div class="chest-anim-item-rarity" style="color:${rarity.color}">${rarity.name}</div>
          <div class="chest-anim-item-name">${this._escape(item.name)}</div>
          <div class="chest-anim-item-stats">
            ${item.stats.atk ? `ATK +${item.stats.atk}` : ''}
            ${item.stats.atk && item.stats.hp ? ' · ' : ''}
            ${item.stats.hp ? `HP +${item.stats.hp}` : ''}
          </div>
          ${item.enchants.map(e => `
            <div class="chest-anim-item-enchant">${this._escape(e.label)}</div>
          `).join('')}
          <div class="chest-anim-item-set">Set : ${this._escape(chest.name.replace('Coffre ', ''))}</div>
        </div>
      </div>
    `;

    const box = overlay.querySelector('.chest-anim-box');
    const reveal = overlay.querySelector('.chest-anim-reveal');

    // Son de suspense au démarrage
    SoundSystem.play('summonSuspense');

    // Phase 1 : tremblement + aura qui pulse (1.5s)
    box.classList.add('chest-shaking');

    // Phase 2 : crash + flash + screen shake + reveal
    setTimeout(() => {
      SoundSystem.play('summonCrash');
      // Son de loot selon rareté
      const lootSoundMap = { common: 'lootCommon', uncommon: 'lootUncommon', rare: 'lootRare', epic: 'lootEpic', legendary: 'lootLegendary', mythic: 'lootLegendary' };
      setTimeout(() => SoundSystem.play(lootSoundMap[item.rarity] || 'lootCommon'), 120);

      box.style.display = 'none';
      reveal.style.opacity = '1';
      reveal.style.animation = 'revealAppear 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards';

      // Screen shake sur épique+
      if (isEpic) {
        overlay.classList.add('shake-hard');
        setTimeout(() => overlay.classList.remove('shake-hard'), 700);
      } else if (rarityIdx >= 2) {
        overlay.classList.add('shake-soft');
        setTimeout(() => overlay.classList.remove('shake-soft'), 400);
      }

      // Vibration mobile
      if (navigator.vibrate) {
        try {
          const patterns = { 0: [15], 1: [25], 2: [40], 3: [30, 20, 80], 4: [40, 30, 150], 5: [40, 30, 80, 40, 250] };
          navigator.vibrate(patterns[rarityIdx] || [20]);
        } catch {}
      }
    }, 1500);

    // Click / skip button / auto-close pour fermer
    const close = () => {
      overlay.removeEventListener('click', close);
      overlay.style.display = 'none';
      this._render();
    };

    overlay.querySelector('#chest-skip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });

    setTimeout(() => {
      overlay.addEventListener('click', close, { once: true });
    }, 2200);
  }

  /** Génère 8 rayons lumineux divergents depuis le coffre (affichés au crash). */
  _renderChestRays(color) {
    const count = 8;
    let html = '';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360;
      html += `<div class="chest-anim-ray" style="--chest-color:${color}; --angle:${angle}deg;"></div>`;
    }
    return html;
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
