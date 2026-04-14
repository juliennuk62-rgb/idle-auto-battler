// OnboardingSystem — tutoriel progressif avec notifications visibles.
// 6 étapes, chaque palier débloque + explique de nouvelles fonctionnalités.

const STORAGE_KEY = 'idle_autobattler_onboarding';

// Définition des paliers : à chaque palier, on débloque + on notifie
const STEPS = [
  // Étape 0 : nouveau joueur — seulement Aventure
  {
    step: 0,
    unlocked: ['map'],
    requires: { victories: 0 },
  },
  // Étape 1 : 1ère victoire — débloque Inventaire
  {
    step: 1,
    unlocked: ['map', 'inventory'],
    requires: { victories: 1 },
    notification: {
      title: 'Inventaire débloqué !',
      icon: '🎒',
      text: 'Vous avez gagné votre première Rune de Boost ! Allez dans <strong>Inventaire</strong> pour l\'équiper sur votre équipe.',
      newButtons: ['inventory'],
    },
  },
  // Étape 2 : 2 victoires — débloque Coffres + Missions
  {
    step: 2,
    unlocked: ['map', 'inventory', 'chests', 'missions'],
    requires: { victories: 2 },
    notification: {
      title: 'Nouvelles fonctions !',
      icon: '📦',
      text: '<strong>Coffres</strong> : achetez des runes ciblées avec vos gemmes.<br><strong>Missions</strong> : objectifs quotidiens pour gagner plus de gemmes.',
      newButtons: ['chests', 'missions'],
    },
  },
  // Étape 3 : 3 victoires — débloque Invocation + Équipe + Collection
  {
    step: 3,
    unlocked: ['map', 'inventory', 'chests', 'missions', 'summon', 'team', 'collection'],
    requires: { victories: 3 },
    notification: {
      title: 'Le Gacha est ouvert !',
      icon: '✨',
      text: '<strong>Invocation</strong> : invoquez des héros légendaires (5 gemmes / pull).<br><strong>Équipe</strong> : assignez vos héros à votre escouade pour booster leurs stats.<br><strong>Collection</strong> : votre Pokédex de héros.',
      newButtons: ['summon', 'team', 'collection'],
    },
  },
  // Étape 4 : 5 victoires — débloque Talents + Donjons + Achievements
  {
    step: 4,
    unlocked: ['map', 'inventory', 'chests', 'missions', 'summon', 'team', 'collection', 'talents', 'dungeons', 'achievements'],
    requires: { victories: 5 },
    notification: {
      title: 'Mode Avancé !',
      icon: '🌳',
      text: '<strong>Talents</strong> : spécialisez vos unités (3 branches par classe).<br><strong>Donjons</strong> : combat tour par tour stratégique style Dofus.<br><strong>Achievements</strong> : 20 défis avec récompenses.',
      newButtons: ['talents', 'dungeons', 'achievements'],
    },
  },
  // Étape 5 : 10 victoires — tout débloqué + message final
  {
    step: 5,
    unlocked: null, // null = pas de restriction
    requires: { victories: 10 },
    notification: {
      title: 'Tout est débloqué !',
      icon: '🏆',
      text: 'Vous maîtrisez les bases du jeu. Le <strong>Prestige</strong> est votre prochain objectif : réinitialisez votre progression contre des bonus permanents puissants.',
      newButtons: ['prestige', 'stats'],
    },
  },
];

class OnboardingSystemImpl {
  constructor() {
    this.step = 0;
    this.victories = 0;
    this.welcomed = false;
    this.pendingNotification = null; // notification à afficher au prochain affichage du menu
    this._load();
  }

  /** Boutons accessibles à l'étape actuelle. null = tout débloqué. */
  getUnlockedButtons() {
    const stepDef = STEPS[this.step];
    return stepDef ? stepDef.unlocked : null;
  }

  /** Boutons fraîchement débloqués à cette étape (pour badge "NEW!"). */
  getNewButtons() {
    const stepDef = STEPS[this.step];
    return stepDef?.notification?.newButtons || [];
  }

  needsWelcome() { return !this.welcomed; }

  markWelcomed() {
    this.welcomed = true;
    this._save();
  }

  /** Enregistre une victoire. Retourne la notification à afficher si palier franchi. */
  recordVictory() {
    this.victories++;
    let newNotification = null;

    // Cherche le plus haut palier atteint
    for (let i = STEPS.length - 1; i > this.step; i--) {
      if (this.victories >= STEPS[i].requires.victories) {
        this.step = i;
        newNotification = STEPS[i].notification;
        this.pendingNotification = newNotification;
        break;
      }
    }

    this._save();
    return newNotification;
  }

  /** Récupère et consomme la notification en attente. */
  consumeNotification() {
    const n = this.pendingNotification;
    this.pendingNotification = null;
    this._save();
    return n;
  }

  /** Force la fin de l'onboarding (DevConsole). */
  complete() {
    this.step = STEPS.length - 1;
    this.welcomed = true;
    this.pendingNotification = null;
    this._save();
  }

  isComplete() { return this.step >= STEPS.length - 1; }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: this.step,
        victories: this.victories,
        welcomed: this.welcomed,
        pendingNotification: this.pendingNotification,
      }));
    } catch (e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.step = d.step || 0;
        this.victories = d.victories || 0;
        this.welcomed = d.welcomed || false;
        this.pendingNotification = d.pendingNotification || null;
      }
    } catch (e) {}
  }

  serialize() {
    return { step: this.step, victories: this.victories, welcomed: this.welcomed, pendingNotification: this.pendingNotification };
  }

  restore(data) {
    if (!data) return;
    this.step = data.step || 0;
    this.victories = data.victories || 0;
    this.welcomed = data.welcomed || false;
    this.pendingNotification = data.pendingNotification || null;
    this._save();
  }
}

export const OnboardingSystem = new OnboardingSystemImpl();
