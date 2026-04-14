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
        text: `**R (Rare)** — Le plus commun. Bonus stats x1.2
**SR (Super Rare)** — Peu fréquent. Bonus stats x1.5
**SSR (Super Super Rare)** — Rare. Bonus stats x2.0 + passif unique
**UR (Ultra Rare)** — Très rare. Bonus stats x3.0 + passif puissant`,
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
        text: `Collectionnez les 20 héros du jeu via l'Invocation.
Les héros non obtenus apparaissent en silhouette avec "???".`,
      },
      {
        heading: 'Milestones',
        text: `Des bonus permanents se débloquent selon votre collection :
**5 héros** — +5% or
**10 héros** — +5% XP
**15 héros** — +10% ATK
**20 héros** — Titre spécial + cadre doré`,
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
Vous pouvez reset les talents gratuitement pour tester d'autres builds.`,
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
        text: `Le Prestige reset votre progression (vagues, niveau, or) mais vous donne des Fragments d'Âme.
Plus vous avez progressé loin, plus vous obtenez de fragments.`,
      },
      {
        heading: 'Bonus permanents',
        text: `Dépensez les fragments dans le catalogue de Prestige pour des bonus permanents :
+ATK%, +HP%, +Or%, +XP%, +Vitesse d'attaque...
Ces bonus persistent à travers les Prestiges et s'accumulent.`,
      },
      {
        heading: 'Quand prestige ?',
        text: `Prestigez quand vous bloquez et ne progressez plus.
Un bon moment : après avoir battu le boss d'un nouveau biome pour la première fois.`,
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
};
