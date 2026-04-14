// MissionToast — wrapper rétro-compat qui s'abonne aux missions complétées
// et affiche via le nouveau Toast unifié (ToastSystem).
//
// On garde le nom MissionToast pour ne pas casser les imports, mais tout
// le rendu passe maintenant par Toast.reward().

import { MissionSystem } from '../systems/MissionSystem.js';
import { Toast } from './ToastSystem.js';

export class MissionToast {
  constructor() {
    this._unsub = MissionSystem.onMissionComplete((mission) => {
      const rewardText = mission.reward.gold
        ? `+${mission.reward.gold} or`
        : `+${mission.reward.gems} gemme${mission.reward.gems > 1 ? 's' : ''}`;

      Toast.reward('Mission complétée', {
        desc: `${mission.label} — ${rewardText}`,
        icon: '🎯',
        duration: 3500,
      });
    });
  }

  destroy() {
    if (this._unsub) this._unsub();
  }
}
