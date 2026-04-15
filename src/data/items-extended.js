// items-extended.js — 50 items uniques produits par content-atelier (avril 2026).
//
// ⚠️ STATUT : CATALOGUE DE RÉFÉRENCE, pas encore branché au système de loot.
// L'architecture actuelle (items.js) génère des items via templates procéduraux
// + enchants aléatoires. Ces items-ici sont des items "uniques" hardcodés avec
// effets spéciaux. Pour les activer, il faudra :
//   1. Ajouter la rareté 'mythic' dans RARITIES de items.js
//   2. Créer un système de drop special pour les mythic/legendary (boss kills seulement)
//   3. Implémenter les effets spéciaux côté CombatSystem (procs, burn, etc.)
//
// 50 items : 20 épiques + 20 légendaires + 10 mythiques.

export const ITEMS_EXTENDED = [
  // ═══════════════════════════════════════════════════════════════════
  // ÉPIQUES (20 items)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'epic_lame_de_braise',
    name: 'Lame de Braise',
    rarity: 'epic',
    slot: 'weapon',
    level: 12,
    stats: { atk: 28, critRate: 8 },
    effect: 'Chaque coup a 25% de chance d\'enflammer la cible, infligeant 15% ATK en dégâts sur 3s',
    flavor: 'Forgée dans les flammes du volcan éternel, elle brûle encore.'
  },
  {
    id: 'epic_heaume_du_titan',
    name: 'Heaume du Titan',
    rarity: 'epic',
    slot: 'armor',
    level: 15,
    stats: { hp: 120, dodge: 5 },
    effect: 'Réduit les dégâts critiques reçus de 30%. Provoque un grondement intimidant chaque 10s',
    flavor: 'Porté par les géants d\'avant l\'oubli, il résonne de leur puissance.'
  },
  {
    id: 'epic_anneau_des_ombres',
    name: 'Anneau des Ombres',
    rarity: 'epic',
    slot: 'accessory',
    level: 10,
    stats: { atk: 18, dodge: 12 },
    effect: 'Gagne +15% vitesse d\'attaque dans l\'obscurité. Esquive automatique toutes les 8 attaques reçues',
    flavor: 'Les voleurs de nuit le convoitent, car il danse dans l\'ombre.'
  },
  {
    id: 'epic_arc_du_cerf_blanc',
    name: 'Arc du Cerf Blanc',
    rarity: 'epic',
    slot: 'weapon',
    level: 18,
    stats: { atk: 35, critRate: 12, critDmg: 25 },
    effect: 'Les flèches percent jusqu\'à 3 ennemis en ligne. Crit contre les boss garantis',
    flavor: 'Taillé dans les bois sacrés, béni par l\'esprit de la forêt.'
  },
  {
    id: 'epic_cuirasse_de_nacre',
    name: 'Cuirasse de Nacre',
    rarity: 'epic',
    slot: 'armor',
    level: 20,
    stats: { hp: 180, dodge: 8 },
    effect: 'Absorbe 15% des dégâts dans un bouclier qui explose en AoE à 100 charges',
    flavor: 'Écailles de dragon marin, irisées sous la lune, imperméables aux lames.'
  },
  {
    id: 'epic_baton_du_sage',
    name: 'Bâton du Sage',
    rarity: 'epic',
    slot: 'weapon',
    level: 14,
    stats: { atk: 24, hp: 60 },
    effect: 'Chaque sort soigne l\'allié le plus blessé de 10% du mana dépensé',
    flavor: 'Sculpté dans une branche millénaire, il murmure des secrets anciens.'
  },
  {
    id: 'epic_collier_de_jade',
    name: 'Collier de Jade',
    rarity: 'epic',
    slot: 'trinket',
    level: 16,
    stats: { hp: 100, atk: 14 },
    effect: 'Régénère 2% HP max toutes les 5s. Double la régénération hors combat',
    flavor: 'La pierre pulse comme un cœur, verte et vivante.'
  },
  {
    id: 'epic_gantelets_de_fer_noir',
    name: 'Gantelets de Fer Noir',
    rarity: 'epic',
    slot: 'armor',
    level: 22,
    stats: { atk: 32, hp: 85 },
    effect: 'Les attaques de base ont 20% de chance de frapper deux fois. Ignore 10% armure',
    flavor: 'Portés par le champion déchu, leurs poings résonnent encore de rage.'
  },
  {
    id: 'epic_talisman_du_crépuscule',
    name: 'Talisman du Crépuscule',
    rarity: 'epic',
    slot: 'accessory',
    level: 11,
    stats: { atk: 20, critRate: 10 },
    effect: 'Gagne +25% dégâts entre 18h et 6h (temps réel). Émet une aura violette',
    flavor: 'Forgé au dernier rayon du soleil mourant, entre jour et nuit.'
  },
  {
    id: 'epic_cape_du_voyageur',
    name: 'Cape du Voyageur',
    rarity: 'epic',
    slot: 'armor',
    level: 13,
    stats: { hp: 95, dodge: 15 },
    effect: 'Réduit le temps de respawn de 20%. +5% vitesse de déplacement hors combat',
    flavor: 'Tissée de routes parcourues, elle sent encore le vent des plaines.'
  },
  {
    id: 'epic_hache_du_bûcheron_fou',
    name: 'Hache du Bûcheron Fou',
    rarity: 'epic',
    slot: 'weapon',
    level: 19,
    stats: { atk: 42, critDmg: 35 },
    effect: 'Chaque 5e coup inflige 200% dégâts et étourdit 1s. Ralentit le porteur de 10%',
    flavor: 'Son rire résonne dans chaque taillade, incontrôlable et sauvage.'
  },
  {
    id: 'epic_sceptre_de_glace_éternelle',
    name: 'Sceptre de Glace Éternelle',
    rarity: 'epic',
    slot: 'weapon',
    level: 17,
    stats: { atk: 30, hp: 70 },
    effect: 'Les sorts gèlent la zone d\'impact 2s. Ralentit tous les ennemis à portée de 15%',
    flavor: 'Sculpté dans un glacier millénaire, il ne fond jamais.'
  },
  {
    id: 'epic_masque_du_devin',
    name: 'Masque du Devin',
    rarity: 'epic',
    slot: 'armor',
    level: 21,
    stats: { hp: 110, atk: 22 },
    effect: 'Révèle la santé exacte des ennemis. +10% dégâts contre les cibles <30% HP',
    flavor: 'Derrière ce masque, l\'avenir se dévoile comme un livre ouvert.'
  },
  {
    id: 'epic_bottes_de_mercure',
    name: 'Bottes de Mercure',
    rarity: 'epic',
    slot: 'armor',
    level: 9,
    stats: { dodge: 20, atk: 12 },
    effect: 'Gagne +30% vitesse d\'attaque pendant 3s après une esquive. Cooldown 8s',
    flavor: 'Légères comme l\'air, rapides comme l\'éclair, insaisissables toujours.'
  },
  {
    id: 'epic_grimoire_des_âmes',
    name: 'Grimoire des Âmes',
    rarity: 'epic',
    slot: 'trinket',
    level: 24,
    stats: { atk: 38, hp: 50 },
    effect: 'Chaque ennemi tué restaure 5% mana. Les sorts drainent 3% HP de l\'ennemi',
    flavor: 'Ses pages sont écrites avec le sang des vaincus.'
  },
  {
    id: 'epic_ceinture_du_colosse',
    name: 'Ceinture du Colosse',
    rarity: 'epic',
    slot: 'armor',
    level: 26,
    stats: { hp: 200, atk: 18 },
    effect: 'Impossible de tomber sous 1 HP pendant 2s (cooldown 60s). +10% taille du modèle',
    flavor: 'Tressée de chaînes titan, elle confère une présence écrasante.'
  },
  {
    id: 'epic_dague_du_traître',
    name: 'Dague du Traître',
    rarity: 'epic',
    slot: 'weapon',
    level: 8,
    stats: { atk: 22, critRate: 18, dodge: 10 },
    effect: 'Backstab automatique sur la première attaque d\'un combat. +100% crit sur cibles dos tourné',
    flavor: 'Elle a tué son maître dans son sommeil, et rêve encore.'
  },
  {
    id: 'epic_amulette_de_sang_lunaire',
    name: 'Amulette de Sang Lunaire',
    rarity: 'epic',
    slot: 'accessory',
    level: 28,
    stats: { hp: 140, atk: 26, critRate: 8 },
    effect: 'Vole 8% des dégâts infligés en HP. Double l\'effet sous la pleine lune (une fois/semaine)',
    flavor: 'Rouge comme l\'astre interdit, elle bat au rythme des marées.'
  },
  {
    id: 'epic_bouclier_du_martyr',
    name: 'Bouclier du Martyr',
    rarity: 'epic',
    slot: 'armor',
    level: 30,
    stats: { hp: 240, dodge: 3 },
    effect: 'Absorbe 25% des dégâts des alliés à 10m. Explose en zone quand brisé (cooldown 45s)',
    flavor: 'Porté par ceux qui donnent leur vie pour sauver les autres.'
  },
  {
    id: 'epic_orbe_du_chaman',
    name: 'Orbe du Chaman',
    rarity: 'epic',
    slot: 'trinket',
    level: 25,
    stats: { atk: 28, hp: 90 },
    effect: 'Les soins ont 15% de chance de sauter sur un second allié. Invoque un totem gardien 10s/min',
    flavor: 'Elle chante avec les esprits de la terre et du vent.'
  },

  // ═══════════════════════════════════════════════════════════════════
  // LÉGENDAIRES (20 items)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'leg_épée_du_jugement',
    name: 'Épée du Jugement',
    rarity: 'legendary',
    slot: 'weapon',
    level: 32,
    stats: { atk: 65, critRate: 20, critDmg: 50 },
    effect: 'Les coups critiques lancent une onde de choc divine à 360°. Exécute les ennemis <10% HP',
    flavor: 'Forgée par les dieux pour punir les hérétiques, elle juge sans pitié.'
  },
  {
    id: 'leg_armure_du_phénix',
    name: 'Armure du Phénix',
    rarity: 'legendary',
    slot: 'armor',
    level: 35,
    stats: { hp: 350, atk: 40 },
    effect: 'Ressuscite une fois par combat à 50% HP avec 5s d\'invincibilité. Brûle les agresseurs proches',
    flavor: 'Écailles de feu immortel, elle renaît toujours de ses cendres.'
  },
  {
    id: 'leg_couronne_des_rois_oubliés',
    name: 'Couronne des Rois Oubliés',
    rarity: 'legendary',
    slot: 'armor',
    level: 38,
    stats: { hp: 280, atk: 55, critRate: 12 },
    effect: 'Tous les alliés gagnent +15% stats. Le porteur reçoit -20% soins mais régénère 1% mana/s',
    flavor: 'Sept rois la portèrent, sept empires tombèrent, mais elle demeure.'
  },
  {
    id: 'leg_arc_du_destin',
    name: 'Arc du Destin',
    rarity: 'legendary',
    slot: 'weapon',
    level: 34,
    stats: { atk: 58, critRate: 25, critDmg: 60 },
    effect: 'Les flèches cherchent automatiquement les points faibles. Ignore 40% armure. Une flèche/attaque traverse les murs',
    flavor: 'Ses cordes sont tissées de fils du destin, nul ne peut échapper.'
  },
  {
    id: 'leg_anneau_de_l_archonte',
    name: 'Anneau de l\'Archonte',
    rarity: 'legendary',
    slot: 'accessory',
    level: 30,
    stats: { atk: 48, hp: 180, dodge: 10 },
    effect: 'Gagne un charge d\'ultimate toutes les 20s. Les ultimes coûtent -1 charge (min 1)',
    flavor: 'Porté par les maîtres du temps, il accélère le flux de pouvoir.'
  },
  {
    id: 'leg_bâton_de_l_archimagus',
    name: 'Bâton de l\'Archimagus',
    rarity: 'legendary',
    slot: 'weapon',
    level: 36,
    stats: { atk: 70, hp: 200 },
    effect: 'Les sorts touchent +2 cibles supplémentaires. AoE fait maintenant 150% dégâts au lieu de 100%',
    flavor: 'Conduit de mana pur, il amplifie chaque incantation à l\'infini.'
  },
  {
    id: 'leg_Cape_des_mille_vents',
    name: 'Cape des Mille Vents',
    rarity: 'legendary',
    slot: 'armor',
    level: 31,
    stats: { hp: 240, dodge: 25 },
    effect: 'Esquive automatique de tous les projectiles une fois par vague. +20% vitesse après une esquive',
    flavor: 'Tissée par les esprits du ciel, elle danse avec chaque brise.'
  },
  {
    id: 'leg_marteau_du_forgeron_céleste',
    name: 'Marteau du Forgeron Céleste',
    rarity: 'legendary',
    slot: 'weapon',
    level: 40,
    stats: { atk: 80, critDmg: 70 },
    effect: 'Chaque coup a 30% de chance de foudroyer un rayon de 5m. Les coups chargés (3s hold) font ×3 dégâts',
    flavor: 'Forgé dans l\'enclume du tonnerre, il façonne la réalité elle-même.'
  },
  {
    id: 'leg_masque_du_sans_visage',
    name: 'Masque du Sans-Visage',
    rarity: 'legendary',
    slot: 'armor',
    level: 33,
    stats: { hp: 220, atk: 45, dodge: 15 },
    effect: 'Change d\'apparence toutes les 15s, gagnant +30% dégâts du type mimé. Insaisissable pour les ennemis',
    flavor: 'Personne ne sait qui le porte, car il est tous et aucun.'
  },
  {
    id: 'leg_collier_du_serpent_cosmique',
    name: 'Collier du Serpent Cosmique',
    rarity: 'legendary',
    slot: 'trinket',
    level: 37,
    stats: { hp: 300, atk: 50, critRate: 15 },
    effect: 'Chaque ennemi tué augmente ATK de 2% (stack infini). Reset après mort. Régénère 1% HP/kill',
    flavor: 'Ouroboros éternel, il dévore le monde pour mieux le recréer.'
  },
  {
    id: 'leg_gantelets_du_conquérant',
    name: 'Gantelets du Conquérant',
    rarity: 'legendary',
    slot: 'armor',
    level: 42,
    stats: { atk: 72, hp: 260, critRate: 18 },
    effect: 'Chaque kill réduit tous les cooldowns de 1s. Les attaques de base font +1% dégâts par ennemi tué (cap 100%)',
    flavor: 'Portés par celui qui conquit cent royaumes sans jamais s\'arrêter.'
  },
  {
    id: 'leg_sceptre_de_la_liche_reine',
    name: 'Sceptre de la Liche Reine',
    rarity: 'legendary',
    slot: 'weapon',
    level: 39,
    stats: { atk: 68, hp: 180 },
    effect: 'Les ennemis tués ont 25% de chance de ressusciter comme alliés squelettes 20s. Draine 5% HP/s du porteur',
    flavor: 'Sa magie corrompue ramène les morts, mais à quel prix ?'
  },
  {
    id: 'leg_bottes_du_marcheur_de_l_abysse',
    name: 'Bottes du Marcheur de l\'Abysse',
    rarity: 'legendary',
    slot: 'armor',
    level: 29,
    stats: { dodge: 30, atk: 38, hp: 150 },
    effect: 'Téléporte derrière un ennemi aléatoire toutes les 10s. Les attaques après téléport sont des backstabs critiques garantis',
    flavor: 'Elles marchent entre les ombres, là où nul œil ne voit.'
  },
  {
    id: 'leg_amulette_du_cœur_de_dragon',
    name: 'Amulette du Cœur de Dragon',
    rarity: 'legendary',
    slot: 'accessory',
    level: 41,
    stats: { hp: 400, atk: 60, critDmg: 40 },
    effect: 'Immunité au feu et glace. Les attaques crachent des flammes draconiques en cône 120°',
    flavor: 'Battement éternel d\'un dragon ancien, elle pulse de puissance primordiale.'
  },
  {
    id: 'leg_lame_de_l_aurore',
    name: 'Lame de l\'Aurore',
    rarity: 'legendary',
    slot: 'weapon',
    level: 43,
    stats: { atk: 75, critRate: 22, hp: 220 },
    effect: 'Chaque aube (6h temps réel) restaure toutes les charges d\'ultimate. Les attaques illuminent et aveuglent 1s',
    flavor: 'Forgée au premier rayon du soleil, elle ne connaît que la lumière.'
  },
  {
    id: 'leg_bouclier_de_l_éternité',
    name: 'Bouclier de l\'Éternité',
    rarity: 'legendary',
    slot: 'armor',
    level: 45,
    stats: { hp: 500, dodge: 8 },
    effect: 'Absorbe tous les dégâts >20% HP max en un coup. Reflète 50% des dégâts bloqués. Cooldown 30s',
    flavor: 'Aucune force dans l\'univers ne peut le briser, car il EST.'
  },
  {
    id: 'leg_grimoire_du_chaos_primordial',
    name: 'Grimoire du Chaos Primordial',
    rarity: 'legendary',
    slot: 'trinket',
    level: 44,
    stats: { atk: 85, hp: 250 },
    effect: 'Les sorts ont 20% de chance de lancer un second sort aléatoire. Transforme les ennemis en moutons 3% du temps',
    flavor: 'Ses pages réécrivent la réalité à chaque tournement, instable et terrifiant.'
  },
  {
    id: 'leg_dague_du_crépuscule_éternel',
    name: 'Dague du Crépuscule Éternel',
    rarity: 'legendary',
    slot: 'weapon',
    level: 27,
    stats: { atk: 52, critRate: 35, dodge: 20 },
    effect: 'Invisible 5s après un kill. Les attaques depuis l\'invisibilité font ×4 dégâts et réinitialisent l\'invisibilité',
    flavor: 'Elle tue dans le silence entre jour et nuit, jamais vue.'
  },
  {
    id: 'leg_heaume_du_jugement_dernier',
    name: 'Heaume du Jugement Dernier',
    rarity: 'legendary',
    slot: 'armor',
    level: 46,
    stats: { hp: 380, atk: 65, critRate: 12 },
    effect: 'Tous les dégâts infligés par le porteur soignent les alliés de 15%. Provoque une aura de peur réduisant ATK ennemis -20%',
    flavor: 'Porté par l\'archange exécuteur, il apporte salut et destruction.'
  },
  {
    id: 'leg_orbe_de_la_convergence',
    name: 'Orbe de la Convergence',
    rarity: 'legendary',
    slot: 'trinket',
    level: 48,
    stats: { atk: 78, hp: 320, critRate: 18, critDmg: 55 },
    effect: 'Fusionne tous les buffs actifs en un seul super-buff de 10s. Les ultimes de toute l\'équipe se synchronisent',
    flavor: 'Point de rencontre de toutes les énergies, elle unit ce qui est divisé.'
  },

  // ═══════════════════════════════════════════════════════════════════
  // MYTHIQUES (10 items)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'myth_excalibur_céleste',
    name: 'Excalibur Céleste',
    rarity: 'mythic',
    slot: 'weapon',
    level: 50,
    stats: { atk: 150, critRate: 40, critDmg: 100, hp: 400 },
    effect: 'Tous les coups sont des coups critiques. Invoque une pluie d\'épées divines chaque 30s détruisant tout à l\'écran',
    flavor: 'L\'arme absolue, forgée par les dieux pour régner sur toute création.'
  },
  {
    id: 'myth_armure_du_créateur',
    name: 'Armure du Créateur',
    rarity: 'mythic',
    slot: 'armor',
    level: 50,
    stats: { hp: 1000, atk: 100, dodge: 25, critRate: 20 },
    effect: 'Immortalité : impossible de mourir pendant 10s (cooldown 2min). Régénère 10% HP max/s. Aura divine +50% stats alliés',
    flavor: 'Portée par celui qui façonna l\'univers, elle contient l\'essence de la vie.'
  },
  {
    id: 'myth_couronne_de_l_absolu',
    name: 'Couronne de l\'Absolu',
    rarity: 'mythic',
    slot: 'armor',
    level: 50,
    stats: { hp: 800, atk: 120, critRate: 30, critDmg: 80 },
    effect: 'Contrôle le temps : ralentit les ennemis 50%, accélère les alliés 100%. Double tous les gains d\'XP et gold',
    flavor: 'Au-dessus de toute royauté, elle couronne le maître de la réalité.'
  },
  {
    id: 'myth_arc_de_l_étoile_filante',
    name: 'Arc de l\'Étoile Filante',
    rarity: 'mythic',
    slot: 'weapon',
    level: 50,
    stats: { atk: 140, critRate: 50, critDmg: 120, dodge: 30 },
    effect: 'Tire une comète qui annihile tout sur son passage. Les flèches traversent dimensions et temps. Portée infinie',
    flavor: 'Née d\'une étoile morte, elle traverse le cosmos pour punir les vivants.'
  },
  {
    id: 'myth_anneau_omniscient',
    name: 'Anneau Omniscient',
    rarity: 'mythic',
    slot: 'accessory',
    level: 50,
    stats: { atk: 110, hp: 600, critRate: 35, dodge: 20 },
    effect: 'Connaissance totale : voit à travers murs, prédit toutes attaques. Auto-esquive parfaite. Gagne tous les talents simultanément',
    flavor: 'Il sait tout ce qui fut, est, et sera jamais.'
  },
  {
    id: 'myth_bâton_de_la_genèse',
    name: 'Bâton de la Genèse',
    rarity: 'mythic',
    slot: 'weapon',
    level: 50,
    stats: { atk: 160, hp: 500, critDmg: 90 },
    effect: 'Crée la vie : invoque 3 clones parfaits du porteur chaque vague. Les sorts façonnent le terrain lui-même',
    flavor: 'Avec lui, un mot suffit pour donner naissance à des mondes.'
  },
  {
    id: 'myth_cape_du_néant',
    name: 'Cape du Néant',
    rarity: 'mythic',
    slot: 'armor',
    level: 50,
    stats: { hp: 700, dodge: 50, atk: 90 },
    effect: 'Phase entre dimensions : esquive automatique de TOUT. Intouchable. Les ennemis proches sont absorbés dans le vide',
    flavor: 'Elle n\'existe pas vraiment, mais efface ceux qui osent la défier.'
  },
  {
    id: 'myth_marteau_du_big_bang',
    name: 'Marteau du Big Bang',
    rarity: 'mythic',
    slot: 'weapon',
    level: 50,
    stats: { atk: 200, critDmg: 150, hp: 450 },
    effect: 'Chaque coup crée une supernova à l\'impact, détruisant tout dans 20m. Ignore TOUTES défenses et résistances',
    flavor: 'Forgé dans l\'explosion qui créa l\'univers, il en contient encore l\'écho.'
  },
  {
    id: 'myth_collier_de_l_infini',
    name: 'Collier de l\'Infini',
    rarity: 'mythic',
    slot: 'trinket',
    level: 50,
    stats: { hp: 900, atk: 130, critRate: 40, critDmg: 100 },
    effect: 'Ressources infinies : mana, HP, charges illimitées. Régénération instantanée. Les cooldowns n\'existent plus',
    flavor: 'Symbole du cycle éternel, il ne connaît ni début ni fin.'
  },
  {
    id: 'myth_grimoire_de_l_apocalypse',
    name: 'Grimoire de l\'Apocalypse',
    rarity: 'mythic',
    slot: 'trinket',
    level: 50,
    stats: { atk: 180, hp: 650, critRate: 45, critDmg: 110 },
    effect: 'Invoque les quatre cavaliers à chaque ultimate. Chaque page tournée déchaîne un fléau biblique. Tue tout à l\'écran toutes les 60s',
    flavor: 'La dernière page raconte la fin de toute chose, et elle approche.'
  }
];