// guideContent.js — Contenu textuel de tous les guides du jeu.
// Chaque guide a un id (correspondant à l'écran), un titre, et des sections.

export const GUIDES = {
  menu: {
    title: 'Guide du jeu',
    sections: [
      {
        heading: 'Bienvenue !',
        text: `Idle Auto-Battler est un jeu de combat automatique avec de la stratégie,
de la collection et de la progression. Voici un aperçu de chaque fonctionnalité.`,
      },
      {
        heading: 'Les ressources',
        text: `**Or** — Gagné en tuant des monstres en Aventure. Sert à recruter, forger et acheter.
**Gemmes** — Plus rares. Gagnées via les boss, les missions et le login quotidien. Servent pour les invocations et les coffres.
**Fragments d'âme** — Obtenus via le Prestige. Donnent des bonus permanents.`,
      },
      {
        heading: 'Progression',
        text: `1. Lancez l'Aventure pour gagner de l'or et de l'XP
2. Améliorez votre équipe avec l'Inventaire et les Talents
3. Complétez les Missions pour gagner des gemmes
4. Utilisez les gemmes en Invocation ou Coffres
5. Tentez les Donjons pour un défi stratégique
6. Prestige quand vous bloquez pour des bonus permanents`,
      },
    ],
  },

  map: {
    title: 'Guide : Aventure',
    sections: [
      {
        heading: 'La carte du monde',
        text: `La carte contient 6 biomes à débloquer dans l'ordre : Forêt, Grottes, Ruines, Enfer, Neige, Temple. Chaque biome a 10 vagues de monstres de plus en plus forts.`,
      },
      {
        heading: 'Combat automatique',
        text: `Le combat est automatique : vos unités attaquent seules. Vous pouvez accélérer (x2, x4).
Un boss apparaît toutes les 5 vagues et donne plus d'or, d'XP et de loot.`,
      },
      {
        heading: 'Gagner de l\'or',
        text: `Chaque monstre tué rapporte de l'or. Les boss donnent 4x plus.
Plus vous avancez dans les vagues, plus les récompenses augmentent.
C'est la source principale d'or du jeu.`,
      },
      {
        heading: 'Synergies de classe',
        text: `Votre composition d'équipe active des bonus automatiques :
**Duo Guerrier** (2 guerriers) — +10% HP
**Duo Archer** (2 archers) — +15% ATK
**Duo Mage** (2 mages) — +10% ATK, +10% vitesse
**Ligne de Front** (2 guerriers + 1 healer) — +15% HP, +20% soin
**Artillerie** (1 archer + 1 mage) — +10% ATK ranged
**Équipe Équilibrée** (1 de chaque) — +5% à tout
Les synergies actives sont affichées au début du combat.`,
      },
      {
        heading: 'Loot & Équipement',
        text: `Les monstres peuvent drop des items d'équipement. Les boss ont un meilleur taux de drop.
Chaque biome a son propre set d'équipement (3 pièces). Équipez un set complet pour des bonus.`,
      },
    ],
  },

  dungeons: {
    title: 'Guide : Donjons',
    sections: [
      {
        heading: 'Combat tour par tour',
        text: `Les donjons utilisent un combat stratégique sur grille, style Dofus.
Chaque unité joue à son tour selon son initiative. Vous contrôlez manuellement vos héros.`,
      },
      {
        heading: 'PA et PM',
        text: `**PA (Points d'Action)** — Permettent de lancer des sorts. Chaque sort coûte 2-5 PA.
**PM (Points de Mouvement)** — Permettent de se déplacer sur la grille. 1 case = 1 PM.
Les deux se rechargent à chaque tour.`,
      },
      {
        heading: 'Stratégie',
        text: `Le positionnement est crucial ! Les guerriers doivent protéger les archers et mages.
Certains sorts ont besoin d'une ligne de vue dégagée. Utilisez les murs à votre avantage.
Identifiez les monstres dangereux (healers, buffers) et éliminez-les en priorité.`,
      },
      {
        heading: 'Structure',
        text: `Chaque donjon a 4 salles + 1 boss. La difficulté augmente à chaque salle.
Entre les salles, choisissez : Repos (heal), Éclaireur (voir les ennemis) ou Forge (buff).
Le boss a des mécaniques spéciales — observez ses patterns !`,
      },
    ],
  },

  summon: {
    title: 'Guide : Invocation',
    sections: [
      {
        heading: 'Comment ça marche',
        text: `Dépensez des gemmes pour invoquer des héros aléatoires.
**x1** = 5 gemmes, **x10** = 50 gemmes (1 SR+ garanti dans le multi).`,
      },
      {
        heading: 'Raretés',
        text: `**R (Rare)** — ~70%. Bonus stats ×1.2
**SR (Super Rare)** — ~20%. Bonus stats ×1.5
**SSR** — ~8%. Bonus stats ×2.0 + 1 passif unique
**UR (Ultra Rare)** — ~2%. Bonus stats ×3.0 + 2 passifs puissants
**Mythique** — 0.01%. Bonus stats ×5.0 + 3 passifs — drop ultra rare`,
      },
      {
        heading: 'Pity System',
        text: `Un compteur de pitié garantit les raretés élevées :
**SSR garanti** au bout de 50 invocations sans SSR.
**UR garanti** au bout de 100 invocations sans UR.
Le compteur se remet à zéro quand vous obtenez la rareté correspondante.`,
      },
      {
        heading: 'Comment obtenir des gemmes',
        text: `- Missions quotidiennes et hebdomadaires
- Login quotidien (jours spéciaux : J7, J14, J21, J30)
- Tuer des boss en Aventure
- Compléter des donjons`,
      },
    ],
  },

  chests: {
    title: 'Guide : Coffres',
    sections: [
      {
        heading: 'Coffres de biome',
        text: `Chaque biome a un coffre qui donne une **Rune de Boost** de son set.
C'est le moyen le plus fiable d'obtenir des runes de set spécifiques.
Équipez-les sur vos unités via l'Inventaire.`,
      },
      {
        heading: 'Prix et garanties',
        text: `**Forêt / Grottes** — 3 gemmes, rune Commune+
**Ruines / Enfer** — 5 gemmes, rune Peu commune+
**Neige / Temple** — 8 gemmes, rune Rare+
Plus le coffre est cher, meilleure est la rareté minimum garantie.`,
      },
      {
        heading: 'Astuce',
        text: `Visez les coffres Neige et Temple pour les meilleurs items.
Complétez un set de 3 pièces du même biome pour activer le bonus de set !`,
      },
    ],
  },

  missions: {
    title: 'Guide : Missions',
    sections: [
      {
        heading: 'Quotidiennes',
        text: `3 missions qui changent chaque jour. Exemples : tuer des monstres, vaincre des boss, utiliser des ultimes.
Complétez les 3 pour un bonus de 3 gemmes supplémentaires.`,
      },
      {
        heading: 'Hebdomadaires',
        text: `5 missions qui changent chaque lundi. Objectifs plus ambitieux : atteindre une wave, compléter un donjon...
Complétez les 5 pour un bonus de 10 gemmes.`,
      },
      {
        heading: 'Astuce',
        text: `Les missions sont votre source principale de gemmes.
Connectez-vous chaque jour et faites au moins les 3 quotidiennes !`,
      },
    ],
  },

  collection: {
    title: 'Guide : Collection',
    sections: [
      {
        heading: 'Pokédex',
        text: `Collectionnez les **22 héros** du jeu via l'Invocation (5 par classe + 2 Mythiques secrets).
Les héros non obtenus apparaissent en silhouette avec "???".
Les héros Mythiques ne peuvent être obtenus que via l'Invocation — aucun pity ne les garantit.`,
      },
      {
        heading: 'Milestones',
        text: `Des bonus permanents se débloquent selon votre collection :
**5 héros** — Novice (+5% or)
**10 héros** — Collecteur (+5% XP)
**15 héros** — Maître (+10% ATK)
**20 héros** — Collectionneur Ultime (titre + cadre doré)
**22 héros** — Maître Absolu (cadre arc-en-ciel — Mythiques inclus)`,
      },
    ],
  },

  talents: {
    title: 'Guide : Talents',
    sections: [
      {
        heading: 'Arbres de talents',
        text: `Chaque classe a un arbre de talents avec 3 branches et 3 paliers.
Dépensez des points de talent pour débloquer des bonus passifs (ATK%, HP%, vitesse...).`,
      },
      {
        heading: 'Points de talent',
        text: `Vous gagnez des points de talent en montant de niveau vos unités.
Vous pouvez reset les talents pour 5 gemmes afin de tester d'autres builds.`,
      },
    ],
  },

  inventory: {
    title: 'Guide : Inventaire',
    sections: [
      {
        heading: 'Équipement',
        text: `Chaque unité a 3 emplacements : Arme, Armure, Accessoire.
Les items ont des raretés (Commun → Légendaire) et des enchantements bonus.`,
      },
      {
        heading: 'Forge',
        text: `Fusionnez 3 items de même rareté pour en créer un de rareté supérieure.
C'est le meilleur moyen d'obtenir des items Épiques et Légendaires.`,
      },
      {
        heading: 'Sets',
        text: `Équipez 2 ou 3 pièces du même set de biome pour activer des bonus :
**2 pièces** — Petit bonus (ex: +5% ATK)
**3 pièces** — Gros bonus (ex: +15% ATK + 10% HP)`,
      },
    ],
  },

  prestige: {
    title: 'Guide : Prestige',
    sections: [
      {
        heading: 'Comment ça marche',
        text: `Le Prestige reset votre progression (or, gemmes, équipe, vague) mais vous donne des **Fragments d'Âme**.
Vous obtenez **1 fragment par tranche de 10 vagues** atteintes (ex : vague 47 → 4 fragments).
Disponible à partir de la vague 20.
**Conservés au reset :** fragments d'âme, bonus permanents, statistiques, héros invoqués, achievements.`,
      },
      {
        heading: 'Bonus permanents',
        text: `Dépensez les fragments dans la boutique de Prestige :
**+25% Or** (2 ♦) — tous les gains d'or +25%
**+50% Or** (5 ♦) — cumulable avec le précédent
**+15% HP** (3 ♦) — toutes les unités alliées
**+15% ATK** (3 ♦) — toutes les unités alliées
**Soldat de départ** (5 ♦) — commencez chaque run avec un guerrier grade 2
Ces bonus persistent à travers tous les Prestiges suivants.`,
      },
      {
        heading: 'Quand prestige ?',
        text: `Prestigez quand vous bloquez et ne progressez plus.
Un bon moment : après avoir battu le boss d'un nouveau biome pour la première fois,
ou quand les monstres deviennent trop costauds pour votre équipe.`,
      },
    ],
  },

  stats: {
    title: 'Guide : Statistiques',
    sections: [
      {
        heading: 'Dashboard',
        text: `Le dashboard affiche vos statistiques globales : monstres tués, or gagné, DPS, temps de jeu...
Utilisez-le pour suivre votre progression.`,
      },
    ],
  },

  team: {
    title: 'Guide : Équipe',
    sections: [
      {
        heading: 'Les 5 slots',
        text: `Votre équipe compte 5 slots : **2 Guerriers**, **1 Archer**, **1 Mage**, **1 Healer**.
Chaque slot accepte uniquement un héros de la classe correspondante.
La composition est figée — vous ne pouvez pas remplacer un slot Guerrier par un Mage.`,
      },
      {
        heading: 'Assigner un héros',
        text: `Cliquez sur **Assigner un héros** pour choisir parmi ceux que vous avez invoqués.
Un héros assigné applique son **multiplicateur de stats** (×1.2 à ×5.0) sur le slot.
Un héros ne peut servir que dans un seul slot à la fois (badge "En service").
Cliquez sur **Retirer** pour le libérer.`,
      },
      {
        heading: 'Astuce',
        text: `Assignez vos meilleurs héros en priorité — les SSR/UR/Mythiques boostent
dramatiquement la puissance de l'équipe grâce à leur multiplicateur et leurs passifs.
Si vous n'avez pas de héros d'une classe, le slot reste fonctionnel (stats de base).`,
      },
    ],
  },

  achievements: {
    title: 'Guide : Achievements',
    sections: [
      {
        heading: '60 défis',
        text: `60 achievements à relever, répartis en 4 tiers :
**Bronze** — premiers pas (ex : premier kill, première équipe)
**Argent** — milestones intermédiaires (vague 20, 500 kills, 10k or)
**Or** — objectifs costauds (vague 50, sets complets, 10 héros)
**Légendaire** — exploits (vague 100, 50k kills, collection complète, 3 prestiges)`,
      },
      {
        heading: 'Récompenses',
        text: `Chaque achievement verrouille une récompense en or ou gemmes.
La barre de progression s'incrémente automatiquement au fil du jeu.
Les achievements se valident seuls — pas besoin de les réclamer manuellement.`,
      },
      {
        heading: 'Astuce',
        text: `Les trackers tournent en continu, même hors combat.
Les achievements légendaires sont vos grands objectifs long-terme.
Certains nécessitent des mécaniques avancées : fusion, forge, set complet, donjon, prestige.`,
      },
    ],
  },
};
