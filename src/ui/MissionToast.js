// MissionToast — toast flottant qui s'affiche quand une mission est
// complétée pendant le combat. Slide-in depuis le haut-droit,
// reste 3s, puis slide-out. File d'attente si plusieurs arrivent.

import { MissionSystem } from '../systems/MissionSystem.js';

export class MissionToast {
  constructor() {
    this._queue = [];
    this._showing = false;
    this._unsub = null;

    // Conteneur fixe pour les toasts.
    this.container = document.createElement('div');
    this.container.className = 'mission-toast-container';
    document.body.appendChild(this.container);

    // S'abonne aux événements de complétion.
    this._unsub = MissionSystem.onMissionComplete((mission) => {
      this._enqueue(mission);
    });
  }

  _enqueue(mission) {
    this._queue.push(mission);
    if (!this._showing) this._showNext();
  }

  _showNext() {
    if (this._queue.length === 0) {
      this._showing = false;
      return;
    }

    this._showing = true;
    const mission = this._queue.shift();
    const rewardText = mission.reward.gold
      ? `+${mission.reward.gold} or`
      : `+${mission.reward.gems} gemme${mission.reward.gems > 1 ? 's' : ''}`;

    const toast = document.createElement('div');
    toast.className = 'mission-toast mission-toast-enter';
    toast.innerHTML = `
      <div class="mission-toast-icon">✅</div>
      <div class="mission-toast-body">
        <div class="mission-toast-title">MISSION COMPLÉTÉE</div>
        <div class="mission-toast-label">${mission.label}</div>
        <div class="mission-toast-reward">${rewardText}</div>
      </div>
    `;

    this.container.appendChild(toast);

    // Force reflow pour que l'animation d'entrée se joue.
    toast.offsetHeight;
    requestAnimationFrame(() => {
      toast.classList.remove('mission-toast-enter');
      toast.classList.add('mission-toast-visible');
    });

    // Après 3s → slide out, puis supprime.
    setTimeout(() => {
      toast.classList.remove('mission-toast-visible');
      toast.classList.add('mission-toast-exit');

      toast.addEventListener('animationend', () => {
        toast.remove();
        this._showNext();
      }, { once: true });

      // Fallback si animationend ne fire pas.
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
          this._showNext();
        }
      }, 600);
    }, 3000);
  }

  destroy() {
    if (this._unsub) this._unsub();
    this.container.remove();
  }
}
