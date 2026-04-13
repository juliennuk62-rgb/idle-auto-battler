// Toutes les valeurs d'équilibrage du jeu.
// Aucune stat ne doit être codée en dur ailleurs que dans ce fichier.
// Voir GAME_DESIGN.md → "Équilibrage (formules de référence)".

export const BALANCE = {
  warrior: {
    class: 'warrior',
    line: 'front',        // ligne avant — encaisse les coups
    hp: 90,               // tanky
    atk: 7,               // dégâts moyens
    atk_speed: 1.3,       // un peu plus lent qu'à l'étape 2
    respawn_delay: 1.5,
    targeting: 'closest',
    hpBarColor: 0x22c55e, // vert
    labelColor: '#ffffff',
  },
  archer: {
    class: 'archer',
    line: 'back',         // ligne arrière — protégé par les guerriers
    hp: 45,               // fragile
    atk: 12,              // gros dégâts
    atk_speed: 0.9,       // cadence rapide
    respawn_delay: 1.8,
    targeting: 'closest',
    hpBarColor: 0xa855f7, // violet pour distinguer du guerrier
    labelColor: '#d8b4fe',
  },
  mage: {
    class: 'mage',
    line: 'back',
    hp: 55,
    atk: 18,              // gros dégâts par tick
    atk_speed: 2.5,       // très lent → ~7.2 dps mono-cible, massif en multi
    respawn_delay: 2.0,
    targeting: 'closest',  // le targeting classique, mais abilityType override
    abilityType: 'aoe',    // frappe TOUS les ennemis vivants à chaque tick
    hpBarColor: 0x60a5fa,  // bleu
    labelColor: '#93c5fd',
  },
  healer: {
    class: 'healer',
    line: 'back',
    hp: 50,
    atk: 10,              // puissance de soin (pas des dégâts)
    atk_speed: 1.8,
    respawn_delay: 1.5,
    targeting: 'heal_lowest', // spécial : cible l'allié avec le moins de HP%
    abilityType: 'heal',      // soigne au lieu d'attaquer
    hpBarColor: 0x4ade80,     // vert clair
    labelColor: '#86efac',
  },
  monster: {
    class: 'monster',
    line: 'front',
    hp: 30,               // base HP relevé (20→30) — plus tanky dès wave 1
    atk: 8,               // base ATK relevé (5→8) — les coups font mal
    atk_speed: 1.2,       // frappe plus vite (1.5→1.2) — pression réelle
    respawn_delay: 1.0,
    // Les monstres préfèrent taper la ligne avant (guerriers) avant la
    // ligne arrière (archers) — c'est ce qui donne du sens à la formation.
    targeting: 'front_priority',

    // Scaling par vague. hp = hp_base * hp_growth^(wave-1), idem atk.
    // Avec growth 1.18, wave 10 = ~140 HP (×4.4), wave 20 = ~820 HP.
    // ATK growth 1.15 — les monstres frappent de plus en plus fort,
    // le healer doit bosser pour maintenir l'équipe.
    hp_growth: 1.18,
    atk_growth: 1.15,
  },

  gold: {
    // gold_per_kill = per_kill_base * growth^(wave-1). Formules inspirées
    // du GAME_DESIGN.md section "Équilibrage".
    per_kill_base: 3,
    growth: 1.10,

    // Bonus multiplicatif sur l'or gagné en tuant un boss (top of the
    // per-wave scaling, donc kill d'un boss wave 5 rapporte ~per_kill(5) * boss_mult).
    boss_mult: 4,

    // Gemmes gagnées en tuant un boss. Ressource rare → valeur fixe basse,
    // on scale plus tard quand les prestiges auront besoin de gems.
    gems_per_boss: 1,
  },

  xp: {
    // XP par kill = per_kill_base * growth^(wave-1). Les bosses rapportent
    // aussi ce multiplicateur par-dessus.
    per_kill_base: 5,
    growth: 1.08,
    boss_mult: 3,

    // XP requise pour passer du niveau N au niveau N+1 : per_level_base * N.
    // L1→L2: 10, L2→L3: 20, ..., L9→L10: 90. Total 1→10 : 450 XP.
    per_level_base: 10,

    // Cap de niveau à l'intérieur d'un grade. Les grades viennent à
    // l'étape 7 — une unité cappée L10 devient candidate à la fusion
    // vers le grade supérieur.
    max_level: 10,

    // Multiplicateurs appliqués à HP et ATK à chaque niveau au-dessus de 1.
    // Formule : stat = base * per_level^(level-1). À L10, stats ≈ 2.36 × base.
    hp_per_level: 1.10,
    atk_per_level: 1.10,

    // Multiplicateur appliqué à chaque grade au-dessus du 1. Formule :
    // stat = base * grade_stat_mult^(grade-1) * per_level^(level-1).
    // Valeur 2.5 → grade 2 L1 ≈ 6% stronger que grade 1 L10, fusion nette
    // mais pas trivialement dominante. Grade 8 L10 ≈ 1442× base.
    grade_stat_mult: 2.5,
  },

  recruit: {
    // Coût en or pour recruter une unité grade 1 level 1 de chaque classe.
    // Atteignable en ~15-25 kills (wave 1-5), assez tôt pour que le joueur
    // voie la mécanique de roster grossir rapidement.
    warrior_cost: 50,
    archer_cost: 75,
    mage_cost: 100,
    healer_cost: 90,

    // Taille max de l'équipe active. Au-delà, il faut fusionner ou retirer
    // des unités (futur RosterSystem). Valeur du GAME_DESIGN.md = 6.
    max_team_size: 6,
  },

  fusion: {
    // Nombre d'unités requises pour une fusion. 3 = la formule classique
    // "auto-battler idle" — 3 copies → 1 du grade au-dessus.
    cost: 3,
  },

  ultimate: {
    warrior: { name: 'Rempart',     charges: 6, duration: 3000, dmgReduction: 0.5 },
    archer:  { name: 'Volée',       charges: 5, hits: 3 },
    mage:    { name: 'Météore',     charges: 7, dmgMult: 3.0, stunMs: 1000 },
    healer:  { name: 'Bénédiction', charges: 6 },
  },

  gacha: {
    singleCost: 5,       // gemmes pour 1 pull
    multiCost: 50,       // gemmes pour 10 pulls (garanti 1 SR+)
    pitySSR: 50,         // pulls sans SSR → le 51ème est garanti SSR
    pityUR: 100,         // pulls sans UR → le 101ème est garanti UR
  },

  dungeon: {
    totalFloors: 20,
    miniBossFloor: 10,
    finalBossFloor: 20,
    scalingPerFloor: 1.08,     // HP/ATK des monstres × 1.08 par étage
    miniBossHpMult: 2.0,
    miniBossAtkMult: 1.5,
    finalBossHpMult: 4.0,
    finalBossAtkMult: 2.5,
    monstersPerFloor: { min: 1, max: 3 },
    goldPerFloor: 20,          // or de base par étage
    completionGold: 500,       // bonus or pour finir les 20 étages
  },

  movement: {
    warrior:  { moveSpeed: 60,  attackRange: 55,  isRanged: false },
    archer:   { moveSpeed: 0,   attackRange: 280, isRanged: true },
    mage:     { moveSpeed: 0,   attackRange: 250, isRanged: true },
    healer:   { moveSpeed: 0,   attackRange: 200, isRanged: true },
    monster:  { moveSpeed: 45,  attackRange: 50,  isRanged: false },
    leftBoundary: 50,   // si un monstre atteint ce x → brèche
  },

  loot: {
    base_drop_rate: 0.15,      // 15% de chance par kill normal
    drop_rate_per_wave: 0.005, // +0.5% par wave (wave 20 = 25%)
    boss_drop_rate: 1.0,       // 100% garanti
    boss_double_drop: 0.30,    // 30% chance d'un 2ème drop sur un boss
    inventory_size: 20,        // slots max d'inventaire
    forge_costs: [50, 200, 800, 3000], // or pour forger C→U, U→R, R→E, E→L
  },

  prestige: {
    // Vague minimale pour pouvoir prestiger. Mis à 20 pour que le joueur
    // découvre la mécanique tôt en session de test. En release, monter à
    // 40-50 pour un premier prestige en ~45 min.
    min_wave: 20,

    // Fragments gagnés = floor(maxWave / divisor). Avec divisor=10 :
    // wave 20 → 2 fragments, wave 50 → 5, wave 100 → 10.
    fragment_divisor: 10,
  },

  offline: {
    // Efficacité du gain hors-ligne : le joueur gagne 50% de ce qu'il
    // aurait gagné en jouant activement. Cf. GAME_DESIGN.md.
    efficiency: 0.5,

    // Plafond en heures. Au-delà, aucun gain supplémentaire.
    cap_hours: 8,

    // Seuil minimum d'absence (ms) pour déclencher l'écran de récompense
    // hors-ligne. En-dessous, on considère que le joueur a juste refresh.
    min_absence_ms: 60_000, // 1 minute
  },

  wave: {
    // Toutes les 5 vagues = boss. Divise bien par 5.
    boss_interval: 5,

    // Multipliers appliqués par-dessus les stats scalées de la vague.
    // Les boss sont de vrais DPS checks — il faut une équipe upgraded
    // pour les battre.
    boss_hp_mult: 4.0,
    boss_atk_mult: 2.0,

    // Délai avant le combat d'un boss (override du respawn_delay normal).
    // Plus long pour laisser le temps au bandeau d'annonce de bien s'afficher
    // avant que les hostilités reprennent.
    boss_intro_delay: 1.8, // secondes

    // Délai avant le premier combat d'un nouveau biome — permet au bandeau
    // "NOUVEAU BIOME" de s'afficher et à l'œil du joueur de capter le
    // changement d'ambiance avant que le monstre respawn.
    biome_intro_delay: 2.0, // secondes

    // Fenêtre (en ms) pendant laquelle les kills successifs cumulent en
    // combo multiplier. Reset au-delà.
    combo_window_ms: 2500,

    // Multi-monster : nombre de mobs par vague (hors boss).
    // count = 1 + floor((wave-1) / divisor), cap max_monsters.
    // Waves 1-4 = 1 mob, 6-9 = 2, 11-14 = 3, 16+ = 4.
    // Les boss (multiples de boss_interval) sont toujours seuls.
    // Le joueur doit rapidement upgrader pour gérer les groupes.
    monster_count_divisor: 5,
    max_monsters: 4,
  },
};
