// SynergySystem — calcule les synergies automatiques basées sur la composition.
// Chaque synergie a un seuil (nombre d'unités de la même classe) et un bonus.
// Les bonus sont appliqués en début de combat via CombatSystem.

const SYNERGIES = [
  // Synergies mono-classe (nombre d'unités de la même classe)
  { id: 'duo_warrior',   label: 'Duo Guerrier',     icon: '⚔',  req: { warrior: 2 }, bonus: { hpPercent: 10 },  desc: '+10% HP guerriers' },
  { id: 'duo_archer',    label: 'Duo Archer',        icon: '🏹', req: { archer: 2 },  bonus: { atkPercent: 15 }, desc: '+15% ATK archers' },
  { id: 'duo_mage',      label: 'Duo Mage',          icon: '✨', req: { mage: 2 },    bonus: { atkPercent: 10, speedPercent: 10 }, desc: '+10% ATK, +10% vitesse mages' },
  { id: 'duo_healer',    label: 'Duo Healer',        icon: '💚', req: { healer: 2 },  bonus: { healPercent: 25 }, desc: '+25% soin healers' },

  // Synergies multi-classe (combos)
  { id: 'frontline',     label: 'Ligne de Front',    icon: '🛡',  req: { warrior: 2, healer: 1 }, bonus: { hpPercent: 15, healPercent: 20 }, desc: '+15% HP, +20% soin' },
  { id: 'backline',      label: 'Artillerie',        icon: '🎯', req: { archer: 1, mage: 1 },    bonus: { atkPercent: 10 }, desc: '+10% ATK ranged' },
  { id: 'balanced',      label: 'Équipe Équilibrée', icon: '⚖',  req: { warrior: 1, archer: 1, mage: 1, healer: 1 }, bonus: { atkPercent: 5, hpPercent: 5, speedPercent: 5 }, desc: '+5% à tout' },
  { id: 'full_melee',    label: 'Mêlée Totale',      icon: '💪', req: { warrior: 3 }, bonus: { atkPercent: 20, hpPercent: 20 }, desc: '+20% ATK, +20% HP guerriers' },
];

export class SynergySystem {
  /**
   * Calcule les synergies actives pour une équipe donnée.
   * @param {Fighter[]} team — l'équipe de fighters
   * @returns {{ active: Synergy[], bonuses: { atkPercent, hpPercent, speedPercent, healPercent } }}
   */
  static compute(team) {
    // Compte les classes
    const classCounts = {};
    for (const f of team) {
      if (!f.isAlive) continue;
      classCounts[f.class] = (classCounts[f.class] || 0) + 1;
    }

    const active = [];
    const totalBonus = { atkPercent: 0, hpPercent: 0, speedPercent: 0, healPercent: 0 };

    for (const syn of SYNERGIES) {
      // Vérifie si les conditions sont remplies
      let valid = true;
      for (const [cls, count] of Object.entries(syn.req)) {
        if ((classCounts[cls] || 0) < count) { valid = false; break; }
      }
      if (!valid) continue;

      active.push(syn);
      for (const [key, val] of Object.entries(syn.bonus)) {
        totalBonus[key] = (totalBonus[key] || 0) + val;
      }
    }

    return { active, bonuses: totalBonus };
  }

  /**
   * Applique les bonus de synergie sur chaque fighter de l'équipe.
   * Appelé une fois au début du combat.
   */
  static apply(team) {
    const { active, bonuses } = SynergySystem.compute(team);
    if (active.length === 0) return active;

    for (const f of team) {
      if (!f.isAlive) continue;

      // ATK bonus
      if (bonuses.atkPercent) {
        f.atk = Math.round(f.atk * (1 + bonuses.atkPercent / 100));
      }
      // HP bonus
      if (bonuses.hpPercent) {
        const hpBoost = Math.round(f.maxHp * bonuses.hpPercent / 100);
        f.maxHp += hpBoost;
        f.hp += hpBoost;
        f._updateHealthBar();
      }
      // Speed bonus
      if (bonuses.speedPercent) {
        f.atkSpeed = Math.max(0.3, f.atkSpeed * (1 - bonuses.speedPercent / 100));
      }
    }

    return active;
  }

  /** Retourne toutes les synergies possibles (pour affichage dans le guide). */
  static getAll() { return [...SYNERGIES]; }
}
