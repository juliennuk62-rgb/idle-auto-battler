// ConsentBanner — bandeau de consentement RGPD minimal.
// Affiche une fois, stocke un flag localStorage. Permet un déploiement
// conforme pour un test fermé (5-10 amis) sans solution tierce (Cookiebot).
//
// Pour un déploiement public à grande échelle, remplacer par une solution
// certifiée (Cookiebot, Axeptio, etc.).

const STORAGE_KEY = 'idle_autobattler_consent';

export class ConsentBanner {
  constructor() {
    this.el = null;
  }

  /** Retourne true si l'utilisateur a déjà donné son consentement. */
  static hasConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'accepted';
    } catch { return true; /* fallback : si localStorage indisponible, on assume consent */ }
  }

  /** Retire le consentement (pour tests ou si le user veut revenir en arrière). */
  static reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  /** Affiche le bandeau si consent pas encore donné. */
  show() {
    if (ConsentBanner.hasConsent()) return;
    if (this.el) return;

    this.el = document.createElement('div');
    this.el.className = 'consent-banner';
    this.el.innerHTML = `
      <div class="consent-banner-body">
        <div class="consent-banner-icon">🍪</div>
        <div class="consent-banner-text">
          <strong>Stockage local &amp; synchronisation cloud</strong>
          <p>
            Ce jeu sauvegarde votre progression dans votre navigateur (localStorage)
            et la synchronise via Google Firebase si vous vous connectez avec votre compte Google.
            Aucune donnée n'est partagée avec des tiers. Aucun tracking publicitaire.
          </p>
          <p class="consent-banner-detail">
            Données stockées : progression, items, héros, achievements, et un identifiant unique de votre partie.
            Vous pouvez effacer vos données à tout moment via la déconnexion.
          </p>
        </div>
      </div>
      <div class="consent-banner-actions">
        <button class="consent-banner-btn consent-banner-btn-primary" id="consent-accept">
          D'accord, je continue
        </button>
      </div>
    `;

    document.body.appendChild(this.el);
    // Focus le bouton pour accessibilité clavier
    const btn = this.el.querySelector('#consent-accept');
    btn.addEventListener('click', () => this._accept());
    btn.focus();

    // Petite animation d'entrée
    requestAnimationFrame(() => {
      this.el.classList.add('consent-banner-visible');
    });
  }

  _accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch {}
    if (this.el) {
      this.el.classList.remove('consent-banner-visible');
      setTimeout(() => {
        if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        this.el = null;
      }, 300);
    }
  }

  hide() {
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
  }
}
