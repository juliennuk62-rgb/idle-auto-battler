// ═══════════════════════════════════════════════════════════════════════════
// EVENT CALENDAR — 15 événements temporaires, saisonniers et spéciaux.
// Généré par content-atelier (avril 2026).
//
// ⚠️ STATUT : CATALOGUE DE RÉFÉRENCE, pas encore branché au système live.
// Pour activer ces events, il faudra créer un EventSystem qui :
//   1. Lit le calendrier (startTrigger : date_range, random, manual)
//   2. Active/désactive les modifiers au bon moment
//   3. Applique les uniqueReward (skins, items spéciaux) une fois par event
//   4. Affiche un bandeau "Event actif : X" dans le Cockpit
//
// Structure : 6 saisonniers + 5 chronoweek + 4 spéciaux = 15 events.
// ═══════════════════════════════════════════════════════════════════════════

export const EVENTS_CALENDAR = [
  // ──────────────────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS SAISONNIERS (6)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'halloween_spectral',
    name: 'Nuit Spectrale',
    type: 'seasonal',
    duration: 336, // 14 jours
    startTrigger: { type: 'date_range', start: '10-20', end: '11-03' },
    modifiers: [
      { type: 'monster_variant', value: 'spectral', description: 'Tous les monstres deviennent des spectres translucides' },
      { type: 'drop_rate_item', value: 5.0, description: 'Taux de drop items ×5' },
      { type: 'special_currency', value: 'citrouille', description: 'Les monstres lâchent des citrouilles maudites' },
      { type: 'fog_visual', value: true, description: 'Brouillard violet permanent sur tous les biomes' },
    ],
    uniqueReward: {
      type: 'cosmetic_skin',
      id: 'commandant_sorcier',
      name: 'Commandant Sorcier',
      description: 'Cape noire étoilée, chapeau pointu, particules arcanes violettes',
      rarity: 'legendary',
    },
    lore: "Les frontières entre les mondes s'effondrent. Les âmes tourmentées surgissent des brumes, affamées de vengeance. Seuls les plus braves oseront affronter la Nuit Spectrale et réclamer le pouvoir des anciens sorciers. Les citrouilles maudites illuminent le chemin vers la rédemption ou la damnation éternelle.",
  },

  {
    id: 'winter_solstice',
    name: 'Solstice d\'Hiver',
    type: 'seasonal',
    duration: 480, // 20 jours
    startTrigger: { type: 'date_range', start: '12-15', end: '01-05' },
    modifiers: [
      { type: 'biome_override', value: 'snow', description: 'Tous les biomes deviennent enneigés' },
      { type: 'gold_bonus', value: 2.0, description: 'Or gagné ×2' },
      { type: 'healing_boost', value: 1.5, description: 'Puissance des soins ×1.5' },
      { type: 'snowflake_currency', value: true, description: 'Les boss lâchent des flocons cristallins' },
    ],
    uniqueReward: {
      type: 'hero',
      id: 'saint_givre',
      name: 'Saint Givre',
      class: 'healer',
      rarity: 'UR',
      passifs: [
        { id: 'aura_regeneration', name: 'Aura de régénération', desc: 'Tous les alliés regagnent 2% HP/s', effect: { teamRegen: 2 } },
        { id: 'frost_armor', name: 'Armure de givre', desc: 'Les alliés gèlent leurs attaquants 1s', effect: { counterFreeze: true } },
      ],
    },
    lore: "Le royaume s'endort sous un manteau de cristaux éternels. Le Saint Givre descend des sommets glacés, porteur d'un pouvoir ancien capable de geler le temps lui-même. Sa bénédiction transforme chaque flocon en éclat de vie pure. Les guerriers qui survivront au blizzard seront récompensés par l'immortalité hivernale.",
  },

  {
    id: 'spring_awakening',
    name: 'Éveil Printanier',
    type: 'seasonal',
    duration: 240, // 10 jours
    startTrigger: { type: 'date_range', start: '03-15', end: '03-25' },
    modifiers: [
      { type: 'xp_boost', value: 3.0, description: 'XP gagnée ×3' },
      { type: 'respawn_speed', value: 0.5, description: 'Délai de réapparition réduit de 50%' },
      { type: 'flower_drops', value: true, description: 'Les monstres lâchent des pétales de lumière' },
      { type: 'visual_bloom', value: true, description: 'Toutes les zones fleurissent avec particules dorées' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'couronne_nature',
      name: 'Couronne de la Nature',
      slot: 'accessory',
      set: 'eternal_bloom',
      baseStat: { hp: 100, atk: 50 },
      enchants: [
        { id: 'regen_constant', name: '+5% HP/s', stat: 'regen', mode: 'percent', value: 5 },
        { id: 'growth_passive', name: '+2% stats par minute', stat: 'growth', mode: 'percent', value: 2 },
      ],
      rarity: 'legendary',
    },
    lore: "Après l'hiver éternel, la vie explose en une symphonie de couleurs et de puissance brute. Les pétales de lumière tombent du ciel, chargés d'une énergie ancestrale qui accélère toute forme d'évolution. Les champions qui captureront l'essence de l'Éveil obtiendront la Couronne de la Nature, symbole de renaissance perpétuelle.",
  },

  {
    id: 'summer_inferno',
    name: 'Canicule Infernale',
    type: 'seasonal',
    duration: 336, // 14 jours
    startTrigger: { type: 'date_range', start: '07-10', end: '07-25' },
    modifiers: [
      { type: 'damage_global', value: 2.5, description: 'Tous les dégâts (alliés ET ennemis) ×2.5' },
      { type: 'burn_chance', value: 0.35, description: '35% chance d\'infliger brûlure (3% HP/s pendant 4s)' },
      { type: 'speed_boost', value: 1.4, description: 'Vitesse d\'attaque ×1.4 pour tous' },
      { type: 'heatwave_visual', value: true, description: 'Effet de distorsion thermique permanent' },
    ],
    uniqueReward: {
      type: 'hero',
      id: 'pyro_primordial',
      name: 'Pyro Primordial',
      class: 'mage',
      rarity: 'UR',
      passifs: [
        { id: 'inferno_aura', name: 'Aura infernale', desc: 'Tous les ennemis brûlent en permanence (5% HP/s)', effect: { burnAura: 5 } },
        { id: 'phoenix_rebirth', name: 'Renaissance du phénix', desc: 'Revit à 100% HP après 1ère mort', effect: { phoenixRevive: true } },
      ],
    },
    lore: "Le soleil devient une arme. Chaque souffle brûle, chaque pas calcine. Les flammes primitives du Pyro Primordial dévorent tout sur leur passage, ne laissant que cendres et gloire. Seuls les guerriers capables d'embrasser la chaleur absolue survivront pour voir naître le phénix éternel de leurs propres ruines calcinées.",
  },

  {
    id: 'autumn_harvest',
    name: 'Récolte Automnale',
    type: 'seasonal',
    duration: 288, // 12 jours
    startTrigger: { type: 'date_range', start: '09-20', end: '10-02' },
    modifiers: [
      { type: 'gold_boost', value: 3.0, description: 'Or gagné ×3' },
      { type: 'item_quality', value: 1.5, description: 'Raretés d\'items boostées (×1.5 chance epic/legendary)' },
      { type: 'grain_currency', value: true, description: 'Les monstres lâchent des grains d\'ambre' },
      { type: 'foliage_effect', value: true, description: 'Feuilles dorées tombent en permanence' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'faux_abondance',
      name: 'Faux de l\'Abondance',
      slot: 'weapon',
      set: 'golden_harvest',
      baseStat: { atk: 120 },
      enchants: [
        { id: 'gold_per_hit', name: '+10 or par coup', stat: 'gold_on_hit', mode: 'flat', value: 10 },
        { id: 'fortune_strike', name: '15% chance drop item rare', stat: 'fortune', mode: 'percent', value: 15 },
      ],
      rarity: 'legendary',
    },
    lore: "Les champs deviennent des mines d'or vivantes. Chaque monstre vaincu déverse des trésors comme si la terre elle-même récompensait les courageux. La Faux de l'Abondance transforme chaque coup mortel en cascade de richesses infinies. Les moissonneurs qui dominent l'Automne bâtiront des empires sur les grains d'ambre éternels.",
  },

  {
    id: 'easter_resurrection',
    name: 'Pâques des Ressuscités',
    type: 'seasonal',
    duration: 168, // 7 jours
    startTrigger: { type: 'date_range', start: '04-10', end: '04-20' },
    modifiers: [
      { type: 'revival_boost', value: 2, description: 'Toutes les unités ressuscitent 2× plus vite' },
      { type: 'egg_drops', value: true, description: 'Les monstres lâchent des œufs mystiques' },
      { type: 'surprise_mechanic', value: 0.1, description: '10% chance qu\'un monstre tué ressuscite en allié temporaire' },
      { type: 'pastel_filter', value: true, description: 'Filtre visuel pastel doux sur tous les biomes' },
    ],
    uniqueReward: {
      type: 'hero',
      id: 'gardien_renaissance',
      name: 'Gardien de la Renaissance',
      class: 'warrior',
      rarity: 'UR',
      passifs: [
        { id: 'eternal_return', name: 'Retour éternel', desc: 'Ressuscite infiniment avec 50% HP', effect: { infiniteRevive: 0.5 } },
        { id: 'ally_revival', name: 'Renaissance partagée', desc: 'Revit 1 allié aléatoire toutes les 30s', effect: { allyRevive: 30 } },
      ],
    },
    lore: "La mort n'est plus une fin, mais un nouveau départ. Les œufs mystiques éclosent en énergie pure, brisant les chaînes de la mortalité. Le Gardien de la Renaissance refuse le repos éternel, transformant chaque défaite en opportunité de gloire renouvelée. Celui qui maîtrise ce cycle infini devient véritablement immortel.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CHRONOWEEK — Mini-événements hebdo aléatoires (5)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'chronoweek_speed_demon',
    name: 'Démon de Vitesse',
    type: 'chronoweek',
    duration: 168, // 7 jours
    startTrigger: { type: 'random', weight: 20 },
    modifiers: [
      { type: 'global_speed', value: 2.0, description: 'Vitesse d\'attaque ×2 pour TOUS (alliés + ennemis)' },
      { type: 'ultimate_charge', value: 2.0, description: 'Les ultimes se chargent 2× plus vite' },
      { type: 'visual_speedlines', value: true, description: 'Lignes de vitesse permanentes sur tous les combats' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'bottes_eclair',
      name: 'Bottes de l\'Éclair',
      slot: 'accessory',
      set: 'chrono_speed',
      baseStat: { speed: 50 },
      enchants: [
        { id: 'haste_permanent', name: '+30% vitesse', stat: 'speed', mode: 'percent', value: 30 },
      ],
      rarity: 'epic',
    },
    lore: "Le temps se compresse. Chaque seconde devient une éternité de coups furieux. Les réflexes s'aiguisent jusqu'à la perfection ou se brisent sous la pression. Les survivants de cette semaine frénétique gagneront les Bottes de l'Éclair, symbole de ceux qui ont dansé avec la vitesse absolue.",
  },

  {
    id: 'chronoweek_titan_mode',
    name: 'Mode Titan',
    type: 'chronoweek',
    duration: 168,
    startTrigger: { type: 'random', weight: 20 },
    modifiers: [
      { type: 'hp_multiplier', value: 5.0, description: 'HP ×5 pour tous les monstres' },
      { type: 'boss_frequency', value: 2, description: 'Boss apparaît tous les 2 waves au lieu de 5' },
      { type: 'mega_rewards', value: 3.0, description: 'Récompenses (gold/XP/items) ×3' },
      { type: 'giant_scale', value: 1.5, description: 'Tous les sprites monstres ×1.5 en taille' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'marteau_titan',
      name: 'Marteau du Titan',
      slot: 'weapon',
      set: 'colossal_might',
      baseStat: { atk: 200 },
      enchants: [
        { id: 'giant_slayer', name: '+50% dégâts vs boss', stat: 'boss_damage', mode: 'percent', value: 50 },
      ],
      rarity: 'legendary',
    },
    lore: "Les monstres deviennent colosses. Chaque combat devient un duel titanesque où seuls les plus puissants survivent. Les récompenses s'empilent comme des montagnes d'or pour ceux qui osent défier les géants. Le Marteau du Titan attend son digne porteur, celui capable de fracasser les fondations du monde.",
  },

  {
    id: 'chronoweek_lucky_streak',
    name: 'Série Chanceuse',
    type: 'chronoweek',
    duration: 168,
    startTrigger: { type: 'random', weight: 20 },
    modifiers: [
      { type: 'crit_chance', value: 0.5, description: '50% chance de coup critique pour tous' },
      { type: 'crit_damage', value: 3.0, description: 'Dégâts critiques ×3' },
      { type: 'lucky_drops', value: 5.0, description: 'Taux de drop items rares ×5' },
      { type: 'sparkle_effect', value: true, description: 'Particules dorées scintillantes sur tous les coups' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'trefle_quatre_feuilles',
      name: 'Trèfle à Quatre Feuilles',
      slot: 'accessory',
      set: 'fortune_divine',
      baseStat: { hp: 50 },
      enchants: [
        { id: 'crit_bonus', name: '+25% chance critique', stat: 'crit', mode: 'percent', value: 25 },
        { id: 'drop_miracle', name: '+100% drop rate', stat: 'drop', mode: 'percent', value: 100 },
      ],
      rarity: 'legendary',
    },
    lore: "La chance pure se manifeste. Chaque coup devient potentiellement dévastateur, chaque kill une fontaine de trésors. Les dés du destin roulent en votre faveur, transformant la bataille en loterie mortelle. Le Trèfle à Quatre Feuilles attend ceux bénis par la fortune pour éterniser leur chance surnaturelle.",
  },

  {
    id: 'chronoweek_glass_cannon',
    name: 'Canon de Verre',
    type: 'chronoweek',
    duration: 168,
    startTrigger: { type: 'random', weight: 20 },
    modifiers: [
      { type: 'damage_dealt', value: 4.0, description: 'Dégâts infligés ×4' },
      { type: 'damage_taken', value: 4.0, description: 'Dégâts reçus ×4' },
      { type: 'no_healing', value: true, description: 'Les soins sont désactivés' },
      { type: 'red_flash_visual', value: true, description: 'Flash rouge à chaque hit reçu' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'lame_sacrifice',
      name: 'Lame du Sacrifice',
      slot: 'weapon',
      set: 'risk_reward',
      baseStat: { atk: 250 },
      enchants: [
        { id: 'berserker_rage', name: '+5% ATK par 10% HP perdu', stat: 'atk_on_damage', mode: 'percent', value: 5 },
      ],
      rarity: 'legendary',
    },
    lore: "Tout ou rien. Chaque seconde de survie devient un miracle, chaque kill une délivrance explosive. Les lâches périssent instantanément, les braves transcendent leurs limites. La Lame du Sacrifice récompense ceux qui embrassent le danger mortel, transformant la douleur en puissance dévastatrice sans compromis.",
  },

  {
    id: 'chronoweek_mage_supremacy',
    name: 'Suprématie Magique',
    type: 'chronoweek',
    duration: 168,
    startTrigger: { type: 'random', weight: 20 },
    modifiers: [
      { type: 'mage_boost', value: 3.0, description: 'Mages font ×3 dégâts et ont ×3 HP' },
      { type: 'aoe_radius', value: 2.0, description: 'Rayon AoE des mages ×2' },
      { type: 'mana_regen', value: 2.0, description: 'Charge ultime mage ×2 plus rapide' },
      { type: 'arcane_visual', value: true, description: 'Aura arcane violette sur tous les sorts' },
    ],
    uniqueReward: {
      type: 'hero',
      id: 'archimage_primordial',
      name: 'Archimage Primordial',
      class: 'mage',
      rarity: 'SSR',
      passifs: [
        { id: 'quintuple_cast', name: 'Incantation quintuple', desc: 'Chaque sort se lance 5× au lieu de 1×', effect: { multiCast: 5 } },
      ],
    },
    lore: "La magie domine tout. Les arcanes deviennent armes ultimes, éclipsant lames et flèches. Les mages transcendent leurs limites, tissant des sorts de destruction planétaire. L'Archimage Primordial émerge des flammes cosmiques, maître absolu de toutes les forces élémentaires, prêt à plier la réalité à sa volonté.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS SPÉCIAUX (4)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'double_xp_weekend',
    name: 'Weekend Double XP',
    type: 'special',
    duration: 72, // 3 jours
    startTrigger: { type: 'manual' },
    modifiers: [
      { type: 'xp_multiplier', value: 2.0, description: 'XP gagnée ×2' },
      { type: 'level_up_visual', value: true, description: 'Animation améliorée lors des montées de niveau' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'tome_sagesse',
      name: 'Tome de Sagesse Éternelle',
      slot: 'accessory',
      set: 'knowledge_eternal',
      baseStat: { hp: 30 },
      enchants: [
        { id: 'xp_permanent', name: '+50% XP permanent', stat: 'xp', mode: 'percent', value: 50 },
      ],
      rarity: 'epic',
    },
    lore: "Trois jours de connaissance accélérée. Chaque combat devient leçon, chaque victoire sagesse pure. Les héros évoluent à vitesse fulgurante, franchissant en heures ce qui prendrait des semaines. Le Tome de Sagesse immortalise cet apprentissage, transformant chaque futur combat en source d'évolution perpétuelle.",
  },

  {
    id: 'lucky_drops_frenzy',
    name: 'Frénésie de Butin',
    type: 'special',
    duration: 48, // 2 jours
    startTrigger: { type: 'manual' },
    modifiers: [
      { type: 'item_drop_rate', value: 10.0, description: 'Taux de drop items ×10' },
      { type: 'guaranteed_rare', value: 0.25, description: '25% des drops sont minimum Rare' },
      { type: 'treasure_rain', value: true, description: 'Animation de coffres tombant du ciel' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'sac_infini',
      name: 'Sac de Butin Infini',
      slot: 'accessory',
      set: 'treasure_hunter',
      baseStat: { atk: 40, hp: 40 },
      enchants: [
        { id: 'loot_magnet', name: 'Items auto-collectés', stat: 'auto_loot', mode: 'flat', value: 1 },
        { id: 'quality_boost', name: '+1 niveau rareté', stat: 'rarity_upgrade', mode: 'flat', value: 1 },
      ],
      rarity: 'legendary',
    },
    lore: "Les cieux s'ouvrent, déversant richesses infinies. Chaque monstre devient piñata explosive de trésors légendaires. Les guerriers nagent littéralement dans l'or et les artefacts. Le Sac de Butin Infini capture cette abondance cosmique, transformant son porteur en aimant permanent pour toutes les merveilles du monde.",
  },

  {
    id: 'boss_rush_gauntlet',
    name: 'Défi des Boss Légendaires',
    type: 'special',
    duration: 120, // 5 jours
    startTrigger: { type: 'manual' },
    modifiers: [
      { type: 'boss_only', value: true, description: 'Toutes les waves sont des boss' },
      { type: 'boss_scaling', value: 1.5, description: 'Stats boss ×1.5' },
      { type: 'mega_rewards', value: 5.0, description: 'Récompenses boss ×5' },
      { type: 'epic_music', value: true, description: 'Musique orchestrale épique permanente' },
    ],
    uniqueReward: {
      type: 'hero',
      id: 'tueur_legendes',
      name: 'Tueur de Légendes',
      class: 'archer',
      rarity: 'UR',
      passifs: [
        { id: 'event_boss_hunter', name: 'Chasseur de boss', desc: '×5 dégâts contre les boss', effect: { bossDamage: 5.0 } },
        { id: 'trophy_collector', name: 'Collectionneur', desc: '+200% récompenses boss', effect: { bossRewards: 2.0 } },
      ],
    },
    lore: "Un marathon de titans. Chaque vague devient affrontement légendaire contre les plus grands fléaux du royaume. Seuls les maîtres absolus survivront à ce déluge de puissance brute. Le Tueur de Légendes émerge de ce carnage, portant les cicatrices de mille duels épiques comme médailles d'honneur éternelles.",
  },

  {
    id: 'fusion_frenzy',
    name: 'Frénésie de Fusion',
    type: 'special',
    duration: 96, // 4 jours
    startTrigger: { type: 'manual' },
    modifiers: [
      { type: 'fusion_cost', value: 2, description: 'Fusion coûte 2 unités au lieu de 3' },
      { type: 'fusion_bonus', value: 1.25, description: 'Unités fusionnées gagnent +25% stats bonus' },
      { type: 'duplicate_chance', value: 0.15, description: '15% chance de dupliquer l\'unité fusionnée' },
      { type: 'merge_visual', value: true, description: 'Animation de fusion améliorée avec particules dorées' },
    ],
    uniqueReward: {
      type: 'item',
      id: 'creuset_evolution',
      name: 'Creuset d\'Évolution',
      slot: 'accessory',
      set: 'transmutation',
      baseStat: { hp: 80, atk: 60 },
      enchants: [
        { id: 'fusion_permanent', name: 'Fusions coûtent 2 unités', stat: 'fusion_cost', mode: 'flat', value: -1 },
        { id: 'grade_boost', name: '+10% stats par grade', stat: 'grade_bonus', mode: 'percent', value: 10 },
      ],
      rarity: 'legendary',
    },
    lore: "L'alchimie transcendantale s'embrase. Les unités fusionnent en entités divines à coût réduit, créant une cascade d'évolution exponentielle. Chaque fusion devient plus puissante, parfois se dupliquant miraculeusement. Le Creuset d'Évolution cristallise ce processus magique, permettant une ascension perpétuelle vers la perfection absolue.",
  },
];