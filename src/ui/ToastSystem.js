// ToastSystem — composant de notification unifié.
//
// Remplace les 3 systèmes parallèles qui existaient avant :
//   - MissionToast (mission complétée)
//   - onboard-notif (paliers débloqués)
//   - alertes error/success ad-hoc
//
// Usage :
//   import { Toast } from './ToastSystem.js';
//   Toast.success('Mission complétée', { desc: 'Gagné 100 or', icon: '✅' });
//   Toast.error('Inventaire plein', { desc: 'Vends des items' });
//   Toast.info('Nouveau palier', { desc: 'Boutique débloquée', icon: '🎁', duration: 5000 });
//
// File d'attente automatique : si 3 toasts arrivent en même temps, ils s'affichent
// en cascade plutôt que de se superposer.

const DEFAULTS = {
  duration: 3200,
  icon: '',
  desc: '',
};

class ToastManager {
  constructor() {
    this._queue = [];
    this._showing = 0;
    this._maxConcurrent = 3;
    this.container = null;
    this._init();
  }

  _init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-stack';
    document.body.appendChild(this.container);
  }

  // ── API publique ──
  success(title, opts = {}) { this._enqueue({ ...DEFAULTS, ...opts, title, variant: 'success', icon: opts.icon || '✅' }); }
  error(title, opts = {})   { this._enqueue({ ...DEFAULTS, ...opts, title, variant: 'error',   icon: opts.icon || '⚠️' }); }
  info(title, opts = {})    { this._enqueue({ ...DEFAULTS, ...opts, title, variant: 'info',    icon: opts.icon || 'ℹ️' }); }
  reward(title, opts = {})  { this._enqueue({ ...DEFAULTS, ...opts, title, variant: 'reward',  icon: opts.icon || '🏆' }); }

  // ── Interne ──
  _enqueue(toast) {
    this._queue.push(toast);
    this._drain();
  }

  _drain() {
    while (this._queue.length > 0 && this._showing < this._maxConcurrent) {
      const toast = this._queue.shift();
      this._show(toast);
    }
  }

  _show(toast) {
    this._showing++;
    this._init();

    const el = document.createElement('div');
    el.className = `toast toast-${toast.variant} toast-enter`;
    el.innerHTML = `
      ${toast.icon ? `<div class="toast-icon">${toast.icon}</div>` : ''}
      <div class="toast-body">
        <div class="toast-title">${toast.title}</div>
        ${toast.desc ? `<div class="toast-desc">${toast.desc}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Fermer">×</button>
    `;

    this.container.appendChild(el);

    // Trigger slide-in après le reflow
    el.offsetHeight;
    requestAnimationFrame(() => {
      el.classList.remove('toast-enter');
      el.classList.add('toast-visible');
    });

    // Fermeture manuelle
    el.querySelector('.toast-close').addEventListener('click', () => this._dismiss(el));

    // Auto-dismiss
    const timer = setTimeout(() => this._dismiss(el), toast.duration);
    el.__timer = timer;
  }

  _dismiss(el) {
    if (!el.parentNode) return;
    clearTimeout(el.__timer);
    el.classList.remove('toast-visible');
    el.classList.add('toast-exit');
    const remove = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      this._showing = Math.max(0, this._showing - 1);
      this._drain();
    };
    el.addEventListener('animationend', remove, { once: true });
    // Fallback
    setTimeout(remove, 500);
  }
}

// Singleton exporté
export const Toast = new ToastManager();
