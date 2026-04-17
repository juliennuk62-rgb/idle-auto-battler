// SummonScreen — écran d'invocation style gacha.
// Banner héros featured + boutons ×1/×10 + pity counters + animation.

import { GachaSystem } from '../systems/GachaSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { BALANCE } from '../data/balance.js';
import { HEROES, HERO_RARITIES } from '../data/heroes.js';
import { attachGuideButton } from '../ui/GuideModal.js';
import { getRevealSpeech } from '../data/revealSpeeches.js';
import { getHeroSVG } from '../data/hero-sprites.js';

export class SummonScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen summon-screen';
    this._render();
  }

  _render() {
    const pity = GachaSystem.getPity();
    const gems = ResourceSystem.gems;
    const owned = GachaSystem.getOwnedHeroes().length;

    // Featured hero (random SSR/UR).
    const featured = HEROES.filter(h => h.rarity === 'SSR' || h.rarity === 'UR');
    const feat = featured[Math.floor(Math.random() * featured.length)];
    const featRarity = HERO_RARITIES[feat.rarity];

    this.el.innerHTML = `
      <div class="summon-container">
        <div class="summon-header">
          <button class="map-back-btn" id="summon-back">← Menu</button>
          <span class="summon-title">INVOCATION</span>
          <div id="summon-guide"></div>
          <span class="summon-gems">◇ ${gems}</span>
        </div>

        <div class="summon-banner">
          <div class="summon-featured-name" style="color:${featRarity.color}">${feat.name}</div>
          <div class="summon-featured-rarity" style="color:${featRarity.color}">${featRarity.name} — ${feat.class}</div>
          <div class="summon-featured-lore">${feat.lore || ''}</div>
        </div>

        <div class="summon-pity">
          <div class="summon-pity-bar">
            <span>Pity SSR</span>
            <div class="progress-bar" style="height:8px;flex:1;margin:0 8px;">
              <div class="progress-bar-fill" style="width:${(pity.ssr/pity.ssrMax)*100}%;background:var(--gold);"></div>
            </div>
            <span>${pity.ssr}/${pity.ssrMax}</span>
          </div>
          <div class="summon-pity-bar">
            <span>Pity UR</span>
            <div class="progress-bar" style="height:8px;flex:1;margin:0 8px;">
              <div class="progress-bar-fill" style="width:${(pity.ur/pity.urMax)*100}%;background:var(--damage);"></div>
            </div>
            <span>${pity.ur}/${pity.urMax}</span>
          </div>
        </div>

        <div class="summon-buttons">
          <button class="summon-btn" id="pull-single" ${gems < BALANCE.gacha.singleCost ? 'disabled' : ''}>
            <div class="summon-btn-label">×1</div>
            <div class="summon-btn-cost">${BALANCE.gacha.singleCost} ◇</div>
          </button>
          <button class="summon-btn summon-btn-multi" id="pull-multi" ${gems < BALANCE.gacha.multiCost ? 'disabled' : ''}>
            <div class="summon-btn-label">×10</div>
            <div class="summon-btn-cost">${BALANCE.gacha.multiCost} ◇</div>
            <div class="summon-btn-bonus">1 SR+ garanti</div>
          </button>
        </div>

        <div class="summon-info">Collection : ${owned}/${HEROES.length} héros</div>
      </div>

      <div class="summon-animation-overlay" id="summon-anim" style="display:none;"></div>
    `;

    this.el.querySelector('#summon-back').addEventListener('click', () => this.onNavigate('menu'));

    attachGuideButton(this.el.querySelector('#summon-guide'), 'summon');

    this.el.querySelector('#pull-single').addEventListener('click', () => {
      const result = GachaSystem.pullSingle();
      if (result) this._playAnimation([result]);
    });

    this.el.querySelector('#pull-multi').addEventListener('click', () => {
      const results = GachaSystem.pullMulti();
      if (results) this._playAnimation(results);
    });
  }

  _playAnimation(results) {
    this._animSkipTimeout = null;
    const overlay = this.el.querySelector('#summon-anim');
    overlay.style.display = 'flex';
    this._animateResult(results, 0, overlay);
  }

  _animateResult(results, index, overlay) {
    if (index >= results.length) {
      // Fin — afficher le récap si multi-pull
      if (results.length > 1) {
        this._showMultiRecap(results, overlay);
      } else {
        overlay.style.display = 'none';
        this._render();
      }
      return;
    }

    const r = results[index];
    const rarityInfo = HERO_RARITIES[r.rarity];
    const duration = r.rarity === 'UR' ? 2500 : r.rarity === 'SSR' ? 2000 : r.rarity === 'SR' ? 1200 : 800;

    // Phrase de reveal du héros (import statique en haut du fichier)
    const revealSpeech = getRevealSpeech(r.hero.id) || '';

    const heroSvg = getHeroSVG(r.hero.id);
    overlay.innerHTML = `
      <div class="summon-stars-bg"></div>
      <div class="summon-meteor" style="--meteor-color:${rarityInfo.color};"></div>
      <div class="summon-reveal" style="animation-delay:${duration * 0.5}ms;">
        <div class="summon-reveal-flash" style="background:${rarityInfo.color};"></div>
        <div class="summon-reveal-hero">
          <div class="summon-reveal-rarity" style="color:${rarityInfo.color}">${rarityInfo.name}</div>
          ${heroSvg ? `<div class="summon-reveal-sprite" style="filter:drop-shadow(0 0 16px ${rarityInfo.color})">${heroSvg}</div>` : ''}
          <div class="summon-reveal-name">${r.hero.name}</div>
          ${revealSpeech ? `<div class="summon-reveal-speech">"${revealSpeech}"</div>` : ''}
          <div class="summon-reveal-class">${r.hero.class}</div>
          ${r.isNew ? '<div class="summon-reveal-new">NOUVEAU !</div>' : '<div class="summon-reveal-dupe">Doublon</div>'}
        </div>
      </div>
      <div class="summon-reveal-counter">${index + 1} / ${results.length}</div>
    `;

    // Avancer : clic OU timeout (mais jamais les deux)
    let advanced = false;
    const next = () => {
      if (advanced) return; // empêche le double appel
      advanced = true;
      if (this._animSkipTimeout) clearTimeout(this._animSkipTimeout);
      this._animateResult(results, index + 1, overlay);
    };

    setTimeout(() => {
      overlay.addEventListener('click', next, { once: true });
      // Auto-advance après 2s (annulé si clic)
      this._animSkipTimeout = setTimeout(next, 2000);
    }, duration * 0.5);
  }

  _showMultiRecap(results, overlay) {
    const newOnes = results.filter(r => r.isNew);
    const dupes = results.filter(r => !r.isNew);

    overlay.innerHTML = `
      <div class="summon-recap">
        <div class="summon-recap-title">RÉCAP INVOCATION ×${results.length}</div>
        <div class="summon-recap-grid">
          ${results.map(r => {
            const ri = HERO_RARITIES[r.rarity];
            return `
              <div class="summon-recap-card" style="border-color:${ri.color}">
                <div class="summon-recap-rarity" style="color:${ri.color}">${ri.name}</div>
                <div class="summon-recap-name">${r.hero.name}</div>
                <div class="summon-recap-class">${r.hero.class}</div>
                ${r.isNew ? '<div class="summon-recap-new">NEW</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="summon-recap-summary">
          ${newOnes.length} nouveau${newOnes.length > 1 ? 'x' : ''} · ${dupes.length} doublon${dupes.length > 1 ? 's' : ''}
        </div>
        <button class="summon-recap-btn" id="summon-recap-ok">OK</button>
      </div>
    `;

    overlay.querySelector('#summon-recap-ok').addEventListener('click', () => {
      overlay.style.display = 'none';
      this._render();
    });
  }

  // _rebindEvents supprimé — _render() recrée le HTML et les events à chaque fois.

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
