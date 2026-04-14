// OnboardingSystem — tutoriel progressif avec notifications visibles.
// 6 étapes, chaque palier débloque + explique de nouvelles fonctionnalités.

const STORAGE_KEY = 'idle_autobattler_onboarding';

// 2 étapes simples :
//   0 = nouveau joueur (seulement Aventure)
//   1 = après 1ère victoire = TOUT débloqué
const STEPS = [
  {
    step: 0,
    unlocked: ['map'],
    requires: { victories: 0 },
  },
  {
    step: 1,
    unlocked: null, // null = tout débloqué
    requires: { victories: 1 },
    notification: {
      title: 'Toutes les fonctions débloquées !',
      icon: '🎉',
      text: `Bravo pour votre première victoire ! Vous avez maintenant accès à tout :
<br><br>
<strong>🎒 Inventaire</strong> : équipez vos Runes de Boost<br>
<strong>📦 Coffres</strong> : achetez des runes ciblées<br>
<strong>✨ Invocation</strong> : invoquez des héros légendaires<br>
<strong>👥 Équipe</strong> : composez votre escouade<br>
<strong>📋 Missions</strong> : gagnez des gemmes quotidiennement<br>
<strong>🌳 Talents</strong> : spécialisez vos unités<br>
<strong>🗡 Donjons</strong> : combat tour par tour stratégique<br>
<strong>🏆 Achievements</strong> : 20 défis à relever<br>
<br>Explorez à votre rythme !`,
      newButtons: ['inventory', 'chests', 'summon', 'team', 'missions', 'talents', 'dungeons', 'achievements', 'collection', 'prestige', 'stats'],
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
