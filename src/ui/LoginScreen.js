// LoginScreen — overlay plein écran affiché avant le jeu. Le joueur doit
// se connecter via Google pour commencer. Une fois connecté, l'overlay
// disparaît et le jeu démarre.

import { AuthSystem } from '../systems/AuthSystem.js';

export class LoginScreen {
  constructor() {
    this._create();
  }

  _create() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'login-overlay';
    this.overlay.innerHTML = `
      <div class="login-panel">
        <div class="login-title">IDLE AUTO-BATTLER</div>
        <div class="login-subtitle">Connectez-vous pour sauvegarder votre progression</div>
        <button class="login-google-btn" id="google-signin">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" height="20" />
          <span>Continuer avec Google</span>
        </button>
        <div class="login-error" id="login-error" style="display:none;"></div>
        <div class="login-footer">Vos données sont sauvegardées dans le cloud</div>
      </div>
    `;

    this.overlay.querySelector('#google-signin').addEventListener('click', () => this._handleSignIn());
    document.body.prepend(this.overlay);
  }

  async _handleSignIn() {
    const btn = this.overlay.querySelector('#google-signin');
    const errorEl = this.overlay.querySelector('#login-error');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Connexion...';
    errorEl.style.display = 'none';

    try {
      await AuthSystem.signInWithGoogle();
      this.hide();
    } catch (error) {
      errorEl.textContent = error.message || 'Erreur de connexion';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Continuer avec Google';
    }
  }

  hide() {
    this.overlay.classList.add('hiding');
    setTimeout(() => {
      this.overlay.remove();
    }, 500);
  }

  show() {
    document.body.prepend(this.overlay);
    this.overlay.classList.remove('hiding');
  }
}
