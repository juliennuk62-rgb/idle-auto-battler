// OnboardingSystem — gère le tutoriel progressif pour les nouveaux joueurs.
// Étapes :
//   0 = nouveau joueur (rien débloqué sauf Aventure)
//   1 = première victoire → débloque Inventaire, Coffres, Équipe
//   2 = 3 victoires → débloque tout
//   3 = onboarding terminé
// Persisté dans localStorage.

const STORAGE_KEY = 'idle_autobattler_onboarding';

class OnboardingSystemImpl {
  constructor() {
    this.step = 0;
    this.victories = 0;
    this.welcomed = false;
    this._load();
  }

  /** Boutons accessibles à chaque étape. */
  getUnlockedButtons() {
    switch (this.step) {
      case 0: return ['map']; // Seulement Aventure
      case 1: return ['map', 'inventory', 'chests', 'team', 'dungeons']; // + Inventaire, Coffres, Équipe, Donjons
      default: return null; // Tout débloqué (null = pas de restriction)
    }
  }

  /** Le joueur a-t-il déjà vu la popup de bienvenue ? */
  needsWelcome() {
    return !this.welcomed;
  }

  markWelcomed() {
    this.welcomed = true;
    this._save();
  }

  /** Enregistre une victoire en aventure. Avance l'étape si nécessaire. */
  recordVictory() {
    this.victories++;
    if (this.step === 0 && this.victories >= 1) {
      this.step = 1;
    }
    if (this.step === 1 && this.victories >= 3) {
      this.step = 2;
    }
    this._save();
    return this.step;
  }

  /** Force la fin de l'onboarding (ex: joueur existant, DevConsole). */
  complete() {
    this.step = 3;
    this.welcomed = true;
    this._save();
  }

  isComplete() {
    return this.step >= 2;
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: this.step,
        victories: this.victories,
        welcomed: this.welcomed,
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
      }
    } catch (e) {}
  }

  serialize() {
    return { step: this.step, victories: this.victories, welcomed: this.welcomed };
  }

  restore(data) {
    if (!data) return;
    this.step = data.step || 0;
    this.victories = data.victories || 0;
    this.welcomed = data.welcomed || false;
    this._save();
  }
}

export const OnboardingSystem = new OnboardingSystemImpl();
