// SummonScreen — écran d'invocation style gacha avec animation cinématique
// inspiré Honkai Star Rail / Genshin : suspense → météore → crash → reveal.
//
// Phases de l'animation (durées variables selon rareté) :
//   1. Suspense : fond étoilé s'intensifie, portail/tourbillon se forme (couleur = rareté)
//   2. Météore  : trait lumineux + trail qui descend depuis le haut
//   3. Crash    : flash plein écran + screen shake + vibration mobile
//   4. Reveal   : carte du héros apparaît, nom en typewriter, speech fade-in
//   5. Ambient  : particules d'aura qui tournoient autour du héros
//
// Skip button toujours visible en haut-droite pour passer l'anim.

import { GachaSystem } from '../systems/GachaSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { BALANCE } from '../data/balance.js';
import { HEROES, HERO_RARITIES } from '../data/heroes.js';
import { attachGuideButton } from '../ui/GuideModal.js';
import { getRevealSpeech } from '../data/revealSpeeches.js';
import { SoundSystem } from '../systems/SoundSystem.js';

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
          ${pity.mythic >= pity.mythicMax / 2 ? `
          <div class="summon-pity-bar" title="La rareté Mythique (0.01%) est garantie à ${pity.mythicMax} pulls.">
            <span style="color:#ff6b9d">Pity Mythique</span>
            <div class="progress-bar" style="height:8px;flex:1;margin:0 8px;">
              <div class="progress-bar-fill" style="width:${(pity.mythic/pity.mythicMax)*100}%;background:#ff6b9d;"></div>
            </div>
            <span>${pity.mythic}/${pity.mythicMax}</span>
          </div>
          ` : ''}
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

  // ─── Timings par rareté (ms cumulés depuis début de l'anim) ────────────
  _getTimings(rarity) {
    switch (rarity) {
      case 'MYTHIC': return { suspense: 0, meteor: 700,  crash: 1600, reveal: 2000, typewriter: 2300, final: 4200 };
      case 'UR':     return { suspense: 0, meteor: 500,  crash: 1300, reveal: 1700, typewriter: 2000, final: 3400 };
      case 'SSR':    return { suspense: 0, meteor: 400,  crash: 1100, reveal: 1400, typewriter: 1700, final: 2600 };
      case 'SR':     return { suspense: 0, meteor: 250,  crash: 750,  reveal: 1000, typewriter: 1200, final: 1900 };
      default:       return { suspense: 0, meteor: 100,  crash: 400,  reveal: 600,  typewriter: 800,  final: 1400 };
    }
  }

  // ─── Pattern vibration selon rareté (en ms) ─────────────────────────────
  _vibrationPattern(rarity) {
    switch (rarity) {
      case 'MYTHIC': return [40, 30, 80, 40, 250];
      case 'UR':     return [40, 30, 180];
      case 'SSR':    return [30, 20, 100];
      case 'SR':     return [40];
      default:       return [15];
    }
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
    const revealSpeech = getRevealSpeech(r.hero.id) || '';
    const timings = this._getTimings(r.rarity);
    const color = rarityInfo.color;
    const isEpic = r.rarity === 'UR' || r.rarity === 'MYTHIC';
    const isGrand = isEpic || r.rarity === 'SSR';

    overlay.innerHTML = `
      <button class="summon-skip-btn" id="summon-skip" title="Passer l'animation">Skip ▸</button>
      <div class="summon-stars-bg"></div>
      <div class="summon-portal" style="--pull-color:${color};"></div>
      ${isGrand ? `<div class="summon-portal-ring" style="--pull-color:${color};"></div>` : ''}
      <div class="summon-meteor" style="--meteor-color:${color}; animation-delay:${timings.meteor}ms;"></div>
      <div class="summon-meteor-trail" style="--meteor-color:${color}; animation-delay:${timings.meteor}ms;"></div>
      <div class="summon-crash-flash" style="--pull-color:${color}; animation-delay:${timings.crash}ms;"></div>
      ${isEpic ? `<div class="summon-crash-ring" style="--pull-color:${color}; animation-delay:${timings.crash}ms;"></div>` : ''}
      <div class="summon-aura" style="--pull-color:${color}; animation-delay:${timings.reveal}ms;"></div>
      ${isGrand ? this._renderAuraParticles(color, timings.reveal) : ''}
      <div class="summon-reveal summon-reveal-${r.rarity.toLowerCase()}" style="animation-delay:${timings.reveal}ms;">
        <div class="summon-reveal-hero" style="border-color:${color}; box-shadow:0 0 40px ${color}40, inset 0 0 20px ${color}20;">
          <div class="summon-reveal-rarity" style="color:${color}">${rarityInfo.name}</div>
          <div class="summon-reveal-name" id="reveal-name" data-full="${this._escape(r.hero.name)}"></div>
          ${revealSpeech ? `<div class="summon-reveal-speech">« ${this._escape(revealSpeech)} »</div>` : ''}
          <div class="summon-reveal-class">${this._escape(r.hero.class)}</div>
          ${r.isNew ? '<div class="summon-reveal-new">✨ NOUVEAU ✨</div>' : '<div class="summon-reveal-dupe">Doublon</div>'}
        </div>
      </div>
      <div class="summon-reveal-counter">${index + 1} / ${results.length}</div>
    `;

    // Son de suspense dès le début (pour R, très court / discret)
    if (isGrand) SoundSystem.play('summonSuspense');

    // Son crash + pull au moment du crash
    const soundMap = { R: 'pullR', SR: 'pullSR', SSR: 'pullSSR', UR: 'pullUR', MYTHIC: 'pullMYTHIC' };
    setTimeout(() => {
      SoundSystem.play('summonCrash');
      setTimeout(() => SoundSystem.play(soundMap[r.rarity] || 'pullR'), 150);
    }, timings.crash);

    // Screen shake au crash (intensité selon rareté)
    if (isEpic) {
      setTimeout(() => overlay.classList.add('shake-hard'), timings.crash);
      setTimeout(() => overlay.classList.remove('shake-hard'), timings.crash + 700);
    } else if (r.rarity === 'SSR') {
      setTimeout(() => overlay.classList.add('shake-soft'), timings.crash);
      setTimeout(() => overlay.classList.remove('shake-soft'), timings.crash + 400);
    }

    // Vibration mobile synchro sur le crash
    if (navigator.vibrate) {
      setTimeout(() => {
        try { navigator.vibrate(this._vibrationPattern(r.rarity)); } catch {}
      }, timings.crash);
    }

    // Typewriter sur le nom après l'apparition de la carte
    setTimeout(() => {
      const nameEl = overlay.querySelector('#reveal-name');
      if (nameEl) this._typewriter(nameEl);
    }, timings.typewriter);

    // Advance via clic / timeout / skip button
    let advanced = false;
    const next = () => {
      if (advanced) return;
      advanced = true;
      if (this._animSkipTimeout) clearTimeout(this._animSkipTimeout);
      this._animateResult(results, index + 1, overlay);
    };

    // Skip button (toujours cliquable, immédiatement)
    overlay.querySelector('#summon-skip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      next();
    });

    // Clic overlay pour advance après le reveal
    setTimeout(() => {
      overlay.addEventListener('click', next, { once: true });
      // Auto-advance final (laisse le temps de lire le speech)
      this._animSkipTimeout = setTimeout(next, timings.final - timings.reveal);
    }, timings.reveal);
  }

  /** Particules d'aura flottantes autour de la carte (SSR+ uniquement). */
  _renderAuraParticles(color, delay) {
    const count = 12;
    let html = '';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 360;
      const dist = 80 + Math.random() * 40;
      html += `<span class="summon-aura-particle" style="--pull-color:${color}; --angle:${angle}deg; --dist:${dist}px; animation-delay:${delay + i * 60}ms;"></span>`;
    }
    return html;
  }

  /** Affiche le nom lettre par lettre (effet typewriter). */
  _typewriter(el) {
    if (!el) return;
    const full = el.dataset.full || '';
    el.textContent = '';
    let i = 0;
    const speed = Math.max(30, Math.min(80, 600 / full.length)); // adaptatif
    const tick = () => {
      if (i >= full.length || !el.isConnected) return;
      el.textContent += full[i++];
      setTimeout(tick, speed);
    };
    tick();
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  _showMultiRecap(results, overlay) {
    const newOnes = results.filter(r => r.isNew);
    const dupes = results.filter(r => !r.isNew);
    const highest = results.reduce((best, r) => {
      const rank = { R: 0, SR: 1, SSR: 2, UR: 3, MYTHIC: 4 };
      return (rank[r.rarity] || 0) > (rank[best?.rarity] || -1) ? r : best;
    }, null);
    const srPlus = results.filter(r => ['SR', 'SSR', 'UR', 'MYTHIC'].includes(r.rarity)).length;

    overlay.innerHTML = `
      <div class="summon-recap">
        <div class="summon-recap-title">RÉCAP INVOCATION ×${results.length}</div>
        ${highest && ['SSR', 'UR', 'MYTHIC'].includes(highest.rarity) ? `
          <div class="summon-recap-highlight" style="color:${HERO_RARITIES[highest.rarity].color}; border-color:${HERO_RARITIES[highest.rarity].color};">
            ⭐ Meilleur pull : <strong>${this._escape(highest.hero.name)}</strong> — ${HERO_RARITIES[highest.rarity].name}
          </div>` : ''}
        <div class="summon-recap-grid">
          ${results.map((r, i) => {
            const ri = HERO_RARITIES[r.rarity];
            return `
              <div class="summon-recap-card" style="border-color:${ri.color}; animation-delay:${i * 80}ms;">
                <div class="summon-recap-rarity" style="color:${ri.color}">${ri.name}</div>
                <div class="summon-recap-name">${this._escape(r.hero.name)}</div>
                <div class="summon-recap-class">${this._escape(r.hero.class)}</div>
                ${r.isNew ? '<div class="summon-recap-new">NEW</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="summon-recap-summary">
          <span>🆕 ${newOnes.length} nouveau${newOnes.length > 1 ? 'x' : ''}</span>
          <span>·</span>
          <span>🔁 ${dupes.length} doublon${dupes.length > 1 ? 's' : ''}</span>
          ${srPlus > 0 ? `<span>·</span><span>✨ ${srPlus} SR+</span>` : ''}
        </div>
        <button class="summon-recap-btn" id="summon-recap-ok">OK</button>
      </div>
    `;

    overlay.querySelector('#summon-recap-ok').addEventListener('click', () => {
      overlay.style.display = 'none';
      this._render();
    });
  }

  show() { document.body.append(this.el); }
  hide() { this.el.remove(); }
}
