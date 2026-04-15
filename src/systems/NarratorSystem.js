// NarratorSystem — orchestre l'affichage des lignes de narrateur omniscient
// aux moments RNG clés du jeu. Utilise le Toast system pour l'UI.
//
// Throttle intégré : max 1 message narrateur toutes les 5s pour éviter le spam
// (un gros combat ou 10 pulls consécutifs produiraient sinon un flot illisible).

import { NARRATOR_LINES, randomLine } from '../data/narratorLines.js';
import { Toast } from '../ui/ToastSystem.js';

const THROTTLE_MS = 5000;

class NarratorSystemImpl {
  constructor() {
    this._lastShownAt = 0;
    this._pullHistory = []; // historique court pour détecter les streaks
  }

  /** Affiche une ligne de narrateur pour un event donné. */
  speak(category, options = {}) {
    const now = Date.now();
    if (now - this._lastShownAt < THROTTLE_MS && !options.force) return;

    const line = randomLine(category);
    if (!line) return;

    this._lastShownAt = now;

    // Icône et couleur selon catégorie
    const styleMap = {
      pullCommon:    { icon: '🎲', variant: 'info' },
      pullSR:        { icon: '✨', variant: 'reward' },
      pullSSR:       { icon: '🌟', variant: 'reward' },
      pullUR:        { icon: '🔥', variant: 'reward' },
      streakBad:     { icon: '😔', variant: 'info' },
      streakGood:    { icon: '🍀', variant: 'success' },
      pityBreak:     { icon: '⚡', variant: 'reward' },
      lootCommon:    { icon: '💎', variant: 'info' },
      lootLegendary: { icon: '🌠', variant: 'reward' },
      critMassive:   { icon: '⚔', variant: 'error' },
    };
    const style = styleMap[category] || { icon: '🔮', variant: 'info' };
    const method = Toast[style.variant] || Toast.info;

    method.call(Toast, '« ' + line + ' »', {
      icon: style.icon,
      duration: options.duration || 3500,
    });
  }

  // ─── Event handlers spécifiques ────────────────────────────────

  /** Appelé à chaque pull de gacha avec la rareté résultante. */
  onPull({ rarity, isPity = false }) {
    // Pity : toujours prioritaire
    if (isPity) {
      this.speak('pityBreak', { force: true });
      this._pullHistory = [];
      return;
    }

    // Historique (garder 5 derniers)
    this._pullHistory.push(rarity);
    if (this._pullHistory.length > 5) this._pullHistory.shift();

    // Détection streak BAD : 5 R consécutifs
    if (this._pullHistory.length >= 5 && this._pullHistory.every(r => r === 'R')) {
      this.speak('streakBad', { force: true });
      return;
    }

    // Détection streak GOOD : 2 SSR d'affilée OU 3 SR+ d'affilée
    if (this._pullHistory.length >= 2) {
      const last2 = this._pullHistory.slice(-2);
      if (last2.every(r => r === 'SSR' || r === 'UR')) {
        this.speak('streakGood', { force: true });
        return;
      }
    }
    if (this._pullHistory.length >= 3) {
      const last3 = this._pullHistory.slice(-3);
      if (last3.every(r => r === 'SR' || r === 'SSR' || r === 'UR')) {
        this.speak('streakGood', { force: true });
        return;
      }
    }

    // Ligne normale selon rareté (probabilité réduite pour les commons — on spamme pas)
    if (rarity === 'UR')       this.speak('pullUR');
    else if (rarity === 'SSR') this.speak('pullSSR');
    else if (rarity === 'SR')  this.speak('pullSR');
    else if (rarity === 'R' && Math.random() < 0.25) this.speak('pullCommon'); // 25% des R
  }

  /** Appelé à chaque drop d'item avec la rareté. */
  onLoot({ rarity }) {
    if (rarity === 'legendary' || rarity === 'epic') {
      this.speak('lootLegendary', { force: true });
    } else if (Math.random() < 0.1) {
      // Ligne commune 10% du temps pour donner de la couleur sans spam
      this.speak('lootCommon');
    }
  }

  /** Appelé sur un coup critique massif. */
  onMassiveCrit() {
    // Plus rare (20% du temps) pour garder l'effet quand ça arrive
    if (Math.random() < 0.2) this.speak('critMassive');
  }
}

export const NarratorSystem = new NarratorSystemImpl();
