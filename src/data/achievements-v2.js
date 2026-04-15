// achievements-v2.js — 40 achievements supplémentaires
// Généré par content-atelier (API Anthropic) + adapté au format AchievementSystem.
//
// Format cible : { id, name, desc, icon, tracker, target, reward: { gold?, gems? }, tier }
// Tier : bronze | silver | gold | legendary (déduit du niveau de récompense)
//
// IMPORTANT : certains trackers ne sont pas encore implémentés côté système
// (deaths, gold_banked, fastest_wave, no_recruit_waves, solo_boss_kills,
//  items_owned, total_clicks, ultimates_used, total_fusions). Les achievements
// correspondants resteront à 0 tant que les trackers ne seront pas branchés.

// Mapping tracker → icône
const ICON_BY_TRACKER = {
  kills:              '🗡',
  boss_kills:         '👹',
  max_wave:           '🌊',
  total_gold:         '💰',
  items_equipped:     '🎒',
  heroes_owned:       '👥',
  full_sets:          '🛡',
  dungeon_clears:     '🏰',
  prestiges:          '♻',
  infinite_wave:      '∞',
  deaths:             '💀',
  gold_banked:        '🏦',
  fastest_wave:       '⚡',
  no_recruit_waves:   '🕊',
  solo_boss_kills:    '⚔',
  items_owned:        '📦',
  total_clicks:       '👆',
  ultimates_used:     '🔥',
  total_fusions:      '🌀',
};

// Déduit le tier d'après la récompense en gems (principal indicateur de difficulté)
function tierFromReward(reward) {
  const gems = reward?.gems || 0;
  if (gems >= 20) return 'legendary';
  if (gems >= 5)  return 'gold';
  if (gems >= 2)  return 'silver';
  return 'bronze';
}

// Source brute (format simple du content-atelier)
const RAW = [
  // ── COMBAT (10) ──
  { id: 'slayer_amateur',     name: 'Massacreur Amateur',     description: 'Élimine 100 ennemis',                          tracker: 'kills',         threshold: 100,     reward: { gold: 100,   gems: 1  } },
  { id: 'slayer_veteran',     name: 'Massacreur Vétéran',     description: 'Élimine 1 000 ennemis',                        tracker: 'kills',         threshold: 1000,    reward: { gold: 500,   gems: 3  } },
  { id: 'slayer_legend',      name: 'Massacreur Légendaire',  description: 'Élimine 10 000 ennemis',                       tracker: 'kills',         threshold: 10000,   reward: { gold: 2000,  gems: 10 } },
  { id: 'boss_hunter',        name: 'Chasseur de Boss',       description: 'Vaincs 10 boss',                               tracker: 'boss_kills',    threshold: 10,      reward: { gold: 300,   gems: 2  } },
  { id: 'boss_slayer',        name: 'Tueur de Boss',          description: 'Vaincs 50 boss',                               tracker: 'boss_kills',    threshold: 50,      reward: { gold: 1000,  gems: 5  } },
  { id: 'boss_executioner',   name: 'Exécuteur des Titans',   description: 'Vaincs 200 boss',                              tracker: 'boss_kills',    threshold: 200,     reward: { gold: 5000,  gems: 15 } },
  { id: 'wave_warrior',       name: 'Guerrier des Vagues',    description: 'Atteins la vague 20',                          tracker: 'max_wave',      threshold: 20,      reward: { gold: 200,   gems: 2  } },
  { id: 'wave_conqueror',     name: 'Conquérant des Vagues',  description: 'Atteins la vague 50',                          tracker: 'max_wave',      threshold: 50,      reward: { gold: 1000,  gems: 5  } },
  { id: 'wave_immortal',      name: 'Immortel des Vagues',    description: 'Atteins la vague 100',                         tracker: 'max_wave',      threshold: 100,     reward: { gold: 5000,  gems: 20 } },
  { id: 'infinite_survivor',  name: 'Survivant Infini',       description: 'Survis 10 vagues en mode Infini',              tracker: 'infinite_wave', threshold: 10,      reward: { gold: 2000,  gems: 10 } },

  // ── COLLECTION (10) ──
  { id: 'treasure_seeker',    name: 'Chercheur de Trésors',   description: 'Accumule 10 000 or au total',                  tracker: 'total_gold',    threshold: 10000,   reward: { gold: 500,   gems: 2  } },
  { id: 'treasure_hoarder',   name: 'Accumulateur',           description: 'Accumule 100 000 or au total',                 tracker: 'total_gold',    threshold: 100000,  reward: { gold: 2000,  gems: 5  } },
  { id: 'treasure_king',      name: 'Roi de la Fortune',      description: 'Accumule 1 000 000 or au total',               tracker: 'total_gold',    threshold: 1000000, reward: { gold: 10000, gems: 25 } },
  { id: 'equipment_novice',   name: 'Novice Équipé',          description: 'Équipe 5 objets différents',                   tracker: 'items_equipped', threshold: 5,      reward: { gold: 100,   gems: 1  } },
  { id: 'equipment_master',   name: 'Maître de l\'Équipement', description: 'Équipe 20 objets différents',                  tracker: 'items_equipped', threshold: 20,     reward: { gold: 500,   gems: 3  } },
  { id: 'equipment_legend',   name: 'Légende Équipée',        description: 'Équipe 50 objets différents',                  tracker: 'items_equipped', threshold: 50,     reward: { gold: 2000,  gems: 8  } },
  { id: 'hero_collector',     name: 'Collectionneur de Héros', description: 'Possède 5 héros différents',                  tracker: 'heroes_owned',  threshold: 5,       reward: { gold: 300,   gems: 2  } },
  { id: 'hero_master',        name: 'Maître des Héros',       description: 'Possède 15 héros différents',                  tracker: 'heroes_owned',  threshold: 15,      reward: { gold: 1000,  gems: 5  } },
  { id: 'set_collector',      name: 'Maître des Sets',        description: 'Complète 3 sets d\'équipement',                tracker: 'full_sets',     threshold: 3,       reward: { gold: 800,   gems: 4  } },
  { id: 'set_legend',         name: 'Légende des Sets',       description: 'Complète tous les 6 sets du jeu',              tracker: 'full_sets',     threshold: 6,       reward: { gold: 3000,  gems: 15 } },

  // ── PRESTIGE / LONG-TERME (10) ──
  { id: 'dungeon_explorer',   name: 'Explorateur de Donjons', description: 'Complète 5 donjons',                           tracker: 'dungeon_clears', threshold: 5,      reward: { gold: 500,   gems: 3  } },
  { id: 'dungeon_conqueror',  name: 'Conquérant de Donjons',  description: 'Complète 20 donjons',                          tracker: 'dungeon_clears', threshold: 20,     reward: { gold: 2000,  gems: 8  } },
  { id: 'dungeon_master',     name: 'Maître des Donjons',     description: 'Complète 50 donjons',                          tracker: 'dungeon_clears', threshold: 50,     reward: { gold: 5000,  gems: 20 } },
  { id: 'first_prestige',     name: 'Renaissance',            description: 'Effectue ton premier prestige',                tracker: 'prestiges',     threshold: 1,       reward: { gold: 1000,  gems: 5  } },
  { id: 'prestige_veteran',   name: 'Vétéran Transcendant',   description: 'Effectue 5 prestiges',                         tracker: 'prestiges',     threshold: 5,       reward: { gold: 3000,  gems: 10 } },
  { id: 'prestige_master',    name: 'Maître de la Transcendance', description: 'Effectue 10 prestiges',                    tracker: 'prestiges',     threshold: 10,      reward: { gold: 8000,  gems: 25 } },
  { id: 'prestige_legend',    name: 'Légende Éternelle',      description: 'Effectue 25 prestiges',                        tracker: 'prestiges',     threshold: 25,      reward: { gold: 20000, gems: 50 } },
  { id: 'infinite_master',    name: 'Maître de l\'Infini',    description: 'Survis 50 vagues en mode Infini',              tracker: 'infinite_wave', threshold: 50,      reward: { gold: 10000, gems: 30 } },
  { id: 'infinite_god',       name: 'Dieu de l\'Infini',      description: 'Survis 100 vagues en mode Infini',             tracker: 'infinite_wave', threshold: 100,     reward: { gold: 50000, gems: 100 } },
  { id: 'ultimate_champion',  name: 'Champion Ultime',        description: 'Atteins la vague 200',                         tracker: 'max_wave',      threshold: 200,     reward: { gold: 25000, gems: 75 } },

  // ── ABSURDES / COMIQUES (10) — trackers à implémenter pour que ceux-ci se déclenchent ──
  { id: 'death_tourist',      name: 'Touriste de la Mort',    description: 'Perds 100 combats',                            tracker: 'deaths',         threshold: 100,    reward: { gold: 50,    gems: 1  } },
  { id: 'death_enthusiast',   name: 'Amateur de Défaites',    description: 'Perds 500 combats',                            tracker: 'deaths',         threshold: 500,    reward: { gold: 200,   gems: 3  } },
  { id: 'gold_miser',         name: 'Avare Pathologique',     description: 'Conserve 50 000 or sans dépenser',             tracker: 'gold_banked',    threshold: 50000,  reward: { gems: 5  } },
  { id: 'speed_demon',        name: 'Démon de Vitesse',       description: 'Termine une vague en moins de 10 secondes',    tracker: 'fastest_wave',   threshold: 10,     reward: { gold: 300,   gems: 2  } },
  { id: 'pacifist_attempt',   name: 'Tentative Pacifiste',    description: 'Survis 5 vagues sans recruter',                tracker: 'no_recruit_waves', threshold: 5,    reward: { gold: 500,   gems: 3  } },
  { id: 'minimalist',         name: 'Minimaliste Extrême',    description: 'Vaincs un boss avec 1 seule unité',            tracker: 'solo_boss_kills', threshold: 1,     reward: { gold: 1000,  gems: 5  } },
  { id: 'item_hoarder',       name: 'Thésauriseur Compulsif', description: 'Possède 100 objets dans l\'inventaire',         tracker: 'items_owned',    threshold: 100,    reward: { gold: 500,   gems: 3  } },
  { id: 'click_maniac',       name: 'Maniaque du Clic',       description: 'Effectue 10 000 clics',                        tracker: 'total_clicks',   threshold: 10000,  reward: { gold: 100,   gems: 1  } },
  { id: 'ultimate_spammer',   name: 'Spammeur d\'Ultimes',    description: 'Utilise 1 000 ultimes',                        tracker: 'ultimates_used', threshold: 1000,   reward: { gold: 800,   gems: 4  } },
  { id: 'fusion_addict',      name: 'Accro aux Fusions',      description: 'Fusionne 500 fois',                            tracker: 'total_fusions',  threshold: 500,    reward: { gold: 1500,  gems: 6  } },
];

// Export final adapté au format AchievementSystem
export const ACHIEVEMENTS_V2 = RAW.map(a => ({
  id: a.id,
  name: a.name,
  desc: a.description,
  icon: ICON_BY_TRACKER[a.tracker] || '🏆',
  tracker: a.tracker,
  target: a.threshold,
  reward: a.reward,
  tier: tierFromReward(a.reward),
}));
