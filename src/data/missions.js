// Templates de missions quotidiennes et hebdomadaires.
// Chaque template a un id, un type (daily/weekly), un prédicat (quel event tracker),
// une target, et une récompense.

export const DAILY_TEMPLATES = [
  { id: 'kills_50',     label: 'Tue {t} monstres',              tracker: 'kills',       target: 50,  reward: { gold: 50 } },
  { id: 'kills_100',    label: 'Tue {t} monstres',              tracker: 'kills',       target: 100, reward: { gold: 100 } },
  { id: 'wins_3',       label: 'Gagne {t} combats de biome',    tracker: 'biome_wins',  target: 3,   reward: { gems: 1 } },
  { id: 'dungeon_1',    label: 'Complète {t} étage de donjon',  tracker: 'dungeon_floors', target: 1, reward: { gold: 100 } },
  { id: 'forge_1',      label: 'Forge {t} item',                tracker: 'forges',      target: 1,   reward: { gems: 1 } },
  { id: 'recruit_1',    label: 'Recrute {t} unité',             tracker: 'recruits',    target: 1,   reward: { gold: 50 } },
  { id: 'ultimates_3',  label: 'Utilise {t} ultimes',           tracker: 'ultimates',   target: 3,   reward: { gold: 100 } },
  { id: 'bosses_2',     label: 'Vaincs {t} boss',               tracker: 'boss_kills',  target: 2,   reward: { gems: 1 } },
  { id: 'gold_500',     label: 'Collecte {t} or',               tracker: 'gold_earned', target: 500, reward: { gems: 1 } },
  { id: 'pulls_1',      label: 'Fais {t} invocation',           tracker: 'pulls',       target: 1,   reward: { gold: 200 } },
];

export const WEEKLY_TEMPLATES = [
  { id: 'w_wave_30',       label: 'Atteins la wave {t} en aventure',  tracker: 'max_wave',      target: 30,  reward: { gems: 10 } },
  { id: 'w_dungeon_full',  label: 'Complète un donjon entier',        tracker: 'dungeon_clears', target: 1,  reward: { gems: 15 } },
  { id: 'w_fusions_3',     label: 'Fusionne {t} unités',              tracker: 'fusions',        target: 3,  reward: { gems: 5 } },
  { id: 'w_items_10',      label: 'Collecte {t} items',               tracker: 'items_gained',   target: 10, reward: { gems: 3 } },
  { id: 'w_login_5',       label: 'Connecte-toi {t} jours cette semaine', tracker: 'login_days', target: 5,  reward: { gems: 10 } },
  { id: 'w_kills_500',     label: 'Tue {t} monstres',                 tracker: 'kills',          target: 500, reward: { gems: 5 } },
  { id: 'w_bosses_10',     label: 'Vaincs {t} boss',                  tracker: 'boss_kills',     target: 10,  reward: { gems: 8 } },
  { id: 'w_gold_5000',     label: 'Collecte {t} or',                  tracker: 'gold_earned',    target: 5000, reward: { gems: 5 } },
];

// Bonus de complétion
export const DAILY_BONUS = { gems: 3, label: '+3 gemmes bonus' };     // 3/3 quotidiennes
export const WEEKLY_BONUS = { gems: 10, label: '+10 gemmes bonus' };  // 5/5 hebdos
export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 5;
