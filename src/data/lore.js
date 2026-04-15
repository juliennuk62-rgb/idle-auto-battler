// lore.js — bios narratives des 22 héros, descriptions des 6 biomes, timeline du monde.
// Rédigé à la main en français avec les VRAIS IDs de heroes.js.
// Utilisable dans un futur menu "Codex" ou dans les tooltips héros.

export const HERO_BIOS = {
  // ── WARRIORS ──
  garde_royal: {
    title: 'Le Rempart du Royaume',
    origin: 'Né dans la caserne royale, il a juré fidélité au trône dès l\'âge de seize ans. Son bouclier a arrêté plus de lames que sa mémoire n\'en retient. Quand les portails se sont ouverts, il fut le premier à se dresser.',
    quote: 'Mon bouclier est votre rempart. Ma vie, votre garantie.',
  },
  centurion: {
    title: 'Le Vétéran aux Mille Batailles',
    origin: 'Ancien mercenaire devenu légende, le Centurion a combattu sur chaque front des Terres de l\'Oubli. Ses cicatrices racontent l\'histoire du monde mieux que n\'importe quel chroniqueur.',
    quote: 'Mille batailles. Aucune défaite. Pas aujourd\'hui.',
  },
  chevalier_noir: {
    title: 'L\'Ombre du Royaume',
    origin: 'Personne ne connaît son visage. Son armure absorbe la lumière et les espoirs de ses ennemis. On raconte qu\'il était autrefois un paladin déchu, mais la vérité est plus sombre encore.',
    quote: 'Dans l\'obscurité, je suis l\'obscurité elle-même.',
  },
  paladin_celeste: {
    title: 'Le Béni des Dieux',
    origin: 'Choisi par les divinités lors de la Grande Eclipse, le Paladin Céleste canalise la lumière pure. Là où il marche, les créatures corrompues reculent. Son aura protège toute son escouade.',
    quote: 'La lumière ne recule jamais devant les ténèbres.',
  },
  dieu_guerre: {
    title: 'La Légende Incarnée',
    origin: 'Mi-homme, mi-mythe. Le Dieu de la Guerre est le dernier des Anciens, ceux qui régnaient avant l\'Oubli. Sa simple présence sur le champ de bataille renverse les probabilités. Les oracles le craignent autant que les monstres.',
    quote: 'Les mortels prient. Les dieux agissent.',
  },

  // ── ARCHERS ──
  chasseur: {
    title: 'Le Traqueur Silencieux',
    origin: 'Élevé dans les forêts profondes, le Chasseur a appris à marcher sans bruit avant de savoir parler. Sa patience est légendaire : il peut traquer une proie pendant des semaines sans jamais la perdre de vue.',
    quote: 'Ma proie ne m\'échappe jamais. Jamais.',
  },
  eclaireur: {
    title: 'L\'Œil du Front',
    origin: 'Ancien espion de la Couronne reconverti en éclaireur militaire. Ses yeux perçoivent les dangers bien avant qu\'ils ne se matérialisent. Il voit dans le noir, dans le brouillard, et dit-on, dans les âmes.',
    quote: 'Je vois tout. Y compris ce que vous cachez.',
  },
  ranger_elite: {
    title: 'La Flèche Parfaite',
    origin: 'Formé à l\'Académie des Arcs de la Citadelle Bleue, le Ranger d\'Élite n\'a jamais raté une cible en duel officiel. Chaque flèche est un verdict. Chaque tir, une sentence.',
    quote: 'Une flèche. Un silence. C\'est tout.',
  },
  tireur_elite: {
    title: 'L\'Invisible',
    origin: 'Le Tireur d\'Élite ne s\'approche jamais. Sa portée est son armure, sa précision son bouclier. Les ennemis tombent sans comprendre d\'où vient le coup. Ses alliés n\'ont qu\'à avancer — le chemin est déjà dégagé.',
    quote: 'Entre mes yeux et ma cible, le monde s\'efface.',
  },
  artemis: {
    title: 'La Déesse Chasseresse',
    origin: 'Artémis n\'est pas un titre — c\'est un nom divin. Descendue des étoiles quand les portails ont corrompu le Temple, elle a pris forme mortelle pour combattre l\'invasion. Triple tir, crit fatal : la mort l\'accompagne en silence.',
    quote: 'La lune guide mon arc. Les étoiles comptent mes victoires.',
  },

  // ── MAGES ──
  apprenti_mystique: {
    title: 'Le Curieux Téméraire',
    origin: 'À peine sorti de l\'Académie des Arcanes, l\'Apprenti Mystique compense son manque d\'expérience par une curiosité dévorante. Ses sorts sont imprévisibles — parfois brillants, parfois catastrophiques.',
    quote: 'Le savoir brûle plus fort que le feu lui-même.',
  },
  pyromancien: {
    title: 'Le Maître des Flammes',
    origin: 'Brûlé par un dragon dans son enfance, le Pyromancien a survécu en absorbant le feu sacré. Depuis, les flammes lui obéissent comme des animaux domestiques. Il ne craint plus rien — sauf l\'eau.',
    quote: 'Les flammes ne me brûlent pas. Elles m\'obéissent.',
  },
  archimage: {
    title: 'Le Maître de Tous les Éléments',
    origin: 'L\'Archimage a passé trois vies à étudier chaque élément. Feu, glace, foudre, terre — il les manipule comme un musicien joue ses instruments. Son grimoire contient plus de savoir que toutes les bibliothèques des six biomes réunies.',
    quote: 'Chaque élément est un mot. Je parle couramment.',
  },
  seigneur_elements: {
    title: 'Le Dualiste',
    origin: 'Le Seigneur des Éléments a fusionné le feu et la glace dans son propre corps. Une expérience interdite qui l\'a laissé marqué à jamais. Son AoE alterne entre brûlure et gel, défiant les lois de la nature.',
    quote: 'Le feu et la glace dansent sur mes doigts.',
  },
  merlin: {
    title: 'L\'Enchanteur Originel',
    origin: 'Merlin a existé avant les mots, avant les runes, avant la magie elle-même. Il est l\'écho de la première incantation, le souvenir du premier sort. Quand il agit, le cosmos tout entier retient son souffle.',
    quote: 'Le temps est un livre. J\'en ai lu la dernière page.',
  },

  // ── HEALERS ──
  acolyte_sacre: {
    title: 'Le Dévoué',
    origin: 'L\'Acolyte Sacré a renoncé à toute ambition personnelle pour servir la cause de la guérison. Ses prières apaisent les corps et les esprits. Même les guerriers les plus endurcis lui confient leurs blessures.',
    quote: 'Chaque blessure est un appel. J\'y réponds toujours.',
  },
  druide: {
    title: 'La Voix de la Forêt',
    origin: 'Le Druide ne soigne pas avec des potions — il canalise la force vitale de la nature elle-même. Les arbres penchent quand il passe, les rivières changent de cours pour lui. La forêt est son alliée la plus fidèle.',
    quote: 'La forêt guérit. Je suis son instrument.',
  },
  grande_pretresse: {
    title: 'La Gardienne du Voile',
    origin: 'La Grande Prêtresse marche entre la vie et la mort. Elle peut ramener une âme partie — une fois. Ce pouvoir a un prix : chaque résurrection la vieillit d\'un an. Mais elle n\'hésite jamais.',
    quote: 'La mort n\'est qu\'une porte. Je tiens la clé.',
  },
  oracle: {
    title: 'Celle Qui Voit Demain',
    origin: 'L\'Oracle voit l\'avenir dans chaque goutte de rosée, chaque battement d\'ailes d\'oiseau. Ses visions sont cryptiques mais toujours justes. Les Commandants qui l\'écoutent ne perdent jamais.',
    quote: 'Je vois demain. Et demain, vous vaincrez.',
  },
  deesse_vie: {
    title: 'Le Miracle Incarné',
    origin: 'La Déesse de la Vie est apparue quand le Temple des Dieux a été corrompu. Elle est le dernier fragment de divinité pure dans les Terres de l\'Oubli. Ses soins transcendent la médecine — ils réécrivent le destin.',
    quote: 'Je suis le dernier souffle avant le miracle.',
  },

  // ── MYTHIQUES ──
  titan_originel: {
    title: 'Celui Qui A Forgé le Monde',
    origin: 'Le Titan Originel existait avant les biomes, avant les portails, avant l\'Oubli. Il est la matière même du monde, endormi depuis des millénaires. Quand il se réveille, la terre tremble — et les ennemis tremblent avec.',
    quote: 'Je suis le premier. Et le dernier.',
  },
  chrono_mage: {
    title: 'Le Maître du Temps',
    origin: 'Le Chronomancien a lu la dernière page du temps. Et il l\'a réécrite. Il vit dans toutes les époques à la fois, corrigeant les erreurs du destin. Son pouvoir est absolu — mais son existence, tragiquement solitaire.',
    quote: 'Le temps est un cercle. Et je suis son centre.',
  },
};

export const BIOME_LORE = {
  forest: {
    name: 'La Forêt Ancestrale',
    history: 'Autrefois berceau de la civilisation elfique, la Forêt Ancestrale a été la première touchée par la corruption. Ses arbres millénaires se sont tordus, ses rivières ont noirci. Les gobelins qui l\'habitent aujourd\'hui ne sont que l\'ombre de ce qui rôde dans ses profondeurs.',
    famousEvent: 'La Bataille des Racines — quand le Roi Gobelin a corrompu le Grand Chêne Éternel.',
  },
  caves: {
    name: 'Les Grottes de l\'Écho',
    history: 'Les Grottes étaient autrefois les mines les plus riches du continent. Des civilisations entières vivaient sous terre, sculptant des cathédrales dans la roche. Quand les portails se sont ouverts, les trolls sont sortis des profondeurs oubliées.',
    famousEvent: 'L\'Effondrement du Niveau 7 — qui a libéré le Troll Ancien de son sommeil millénaire.',
  },
  ruins: {
    name: 'Les Ruines de Khemet-Ra',
    history: 'Khemet-Ra était la plus grande cité du monde antique, gouvernée par des pharaons-sorciers qui maîtrisaient la mort elle-même. Quand l\'Oubli est venu, leurs rituels se sont retournés contre eux. Les morts se sont relevés — pour toujours.',
    famousEvent: 'La Résurrection Éternelle — quand le Pharaon Maudit a relevé son armée pour la dernière fois.',
  },
  hell: {
    name: 'Les Flammes Éternelles',
    history: 'L\'Enfer n\'existait pas avant les portails. C\'est le plan dimensionnel qui s\'est ouvert le plus violemment, déversant des démons, des imps et des succubes dans le monde mortel. Le sol fond sous leurs pas, l\'air empoisonne les poumons.',
    famousEvent: 'L\'Avènement du Balrog — quand le plus grand démon a franchi le portail principal.',
  },
  snow: {
    name: 'Le Royaume de Givre',
    history: 'Autrefois une toundra paisible habitée par des nomades et des chamanes, le Royaume de Givre s\'est figé dans un hiver permanent quand le Roi des Neiges a pris le pouvoir. La température chute encore chaque jour. Bientôt, même la lumière gèlera.',
    famousEvent: 'Le Zéro Absolu — quand le Roi des Neiges a figé une armée entière en une seconde.',
  },
  temple: {
    name: 'Le Temple des Dieux',
    history: 'Le Temple était le lieu sacré où les six biomes communiaient avec les divinités. Quand la corruption l\'a atteint, les dieux eux-mêmes se sont tus. Le Dragon Ancestral, dernier gardien, protège maintenant un lieu vide — un temple sans dieux.',
    famousEvent: 'Le Silence Divin — le jour où les prières ont cessé d\'être entendues.',
  },
};

export const WORLD_TIMELINE = [
  { year: -1000, title: 'L\'Âge d\'Or',          desc: 'Les six biomes en harmonie. Les Commandants veillent.' },
  { year: -500,  title: 'La Guerre des Arcanes', desc: 'Les mages créent les premiers portails. Personne ne sait encore ce qu\'ils vont libérer.' },
  { year: -100,  title: 'La Prophétie du Titan', desc: 'Un oracle annonce : "Un jour, les portails briseront le monde."' },
  { year: 0,     title: 'L\'Oubli',              desc: 'Les portails se brisent. Les six biomes sont envahis simultanément.' },
  { year: 1,     title: 'La Chute des Commandants', desc: 'Neuf Commandants sur dix tombent la première nuit.' },
  { year: 2,     title: 'L\'Éveil du Roi Gobelin',  desc: 'La Forêt Ancestrale tombe la première.' },
  { year: 5,     title: 'Le Silence Divin',         desc: 'Le Temple des Dieux cesse de répondre aux prières.' },
  { year: 10,    title: 'Le Dernier Commandant',     desc: 'Toi. Le dernier espoir. Tu prends les armes.' },
  { year: 11,    title: 'La Première Victoire',      desc: 'Tu repousses les gobelins de la lisière de la Forêt.' },
  { year: 12,    title: 'L\'Alliance des Héros',     desc: 'Les héros invoqués répondent à ton appel à travers les dimensions.' },
];

export const LEGENDS = [
  { id: 'legende_chene_eternel', title: 'Le Chêne Éternel', text: 'Au cœur de la Forêt pousse un arbre qui a vu naître le monde. Ses racines plongent dans le temps lui-même. On dit que celui qui touche son écorce entend les voix de tous ceux qui ont vécu.' },
  { id: 'legende_miroir_ames', title: 'Le Miroir des Âmes', text: 'Dans les Ruines de Khemet-Ra se trouve un miroir qui reflète non les corps, mais les âmes. Les pharaons l\'utilisaient pour juger les traîtres. Regarder trop longtemps piège l\'âme pour l\'éternité.' },
  { id: 'legende_flamme_premiere', title: 'La Première Flamme', text: 'Avant les démons, l\'Enfer n\'était qu\'un brasier pur. La Première Flamme brûle encore, cachée sous les cendres, attendant que quelqu\'un la retrouve pour purifier le plan entier.' },
  { id: 'legende_flocon_parfait', title: 'Le Flocon Parfait', text: 'Le Roi des Neiges cherche le flocon parfait — un cristal de glace qui ne fond jamais, même dans le feu. On dit que ce flocon contient la clé pour défaire le Zéro Absolu.' },
  { id: 'legende_dernier_dieu', title: 'Le Dernier Dieu', text: 'Quand le Temple s\'est tu, un seul dieu est resté éveillé. Il se cache parmi les mortels, déguisé en héros ordinaire. Personne ne sait lequel. Peut-être est-il déjà dans ton escouade.' },
];
