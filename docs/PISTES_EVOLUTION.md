# Pistes d'évolution — Étude complète

## État actuel du jeu

Le jeu a un **socle technique solide** : 4 classes, 6 biomes, grades/fusion, équipement/loot, prestige, carte du monde, auth Firebase, sauvegarde cloud. La boucle de base fonctionne.

**Le problème principal** : le combat est statique (tick-based, pas de mouvement), le joueur manque d'interactions actives pendant les combats, et le contenu se répète après quelques runs.

Voici 6 pistes classées par **impact sur le fun × faisabilité**.

---

## PISTE 1 — Système de déplacement (Tower Defense)
**Impact : ★★★★★ | Effort : 3-4 jours | Transforme le jeu**

### Concept
Les monstres spawn à droite et marchent vers la gauche. Les warriors avancent pour les bloquer. Les ranged tirent des projectiles. Si un monstre atteint le bord gauche → dégâts ou pénalité.

### Ce que ça change
- Le combat passe de "regarder des barres" à "gérer une ligne de défense vivante"
- Le positionnement des unités devient stratégique
- Les projectiles visuels (flèches, boules de feu) rendent le combat spectaculaire
- Chaque classe a un comportement unique et visible

### Phases
- A : Mouvement basique (monstres ←, warriors →, collision = combat) — 1 jour
- B : Ranged statiques qui tirent à portée — 0.5 jour
- C : Projectiles visuels (sprite qui vole) — 0.5 jour
- D : Spawner progressif (monstres 1 par 1) — 0.5 jour
- E : Polish (animations marche, knockback, particules tir) — 1 jour

### Déjà planifié dans
`docs/MOVEMENT_VISION.md`

---

## PISTE 2 — PvP / Classement
**Impact : ★★★★★ | Effort : 2-3 jours | Rétention massive**

### Concept
Le joueur peut affronter les équipes d'autres joueurs en mode asynchrone. Pas de combat en temps réel — l'IA contrôle l'équipe adversaire.

### Comment ça marche
1. Chaque joueur a un "deck défensif" (son équipe + équipement sauvegardé dans Firestore)
2. Le joueur choisit un adversaire dans un classement (trié par wave max ou puissance)
3. Le combat se lance : ton équipe vs l'équipe du joueur adverse (contrôlée par l'IA)
4. Victoire = points d'arène + récompenses exclusives
5. Classement hebdomadaire avec rewards

### Ce qu'il faut
- Endpoint Firestore pour stocker les decks défensifs publics
- Écran "Arène" sur la carte ou le menu
- Matchmaking basique (±20% de puissance)
- Récompenses arène (gemmes, items exclusifs)

### Pourquoi c'est fort
- Les joueurs ont une raison de min-maxer leur équipe
- Le classement crée de la compétition et de la rétention
- C'est 100% asynchrone (pas besoin de serveur temps réel)

---

## PISTE 3 — Donjon procédural (Roguelike)
**Impact : ★★★★ | Effort : 3-4 jours | Rejouabilité infinie**

### Concept
Un nouveau mode de jeu accessible depuis la carte : un donjon de 20-50 étages généré aléatoirement. Chaque étage = un combat avec des modificateurs aléatoires. Entre les étages, le joueur choisit entre 3 options (buff, heal, item, piège).

### Structure d'un run
```
Étage 1 → [Combat facile] → Choix (buff/heal/item)
Étage 2 → [Combat moyen] → Choix
Étage 3 → [Événement aléatoire] → Choix
...
Étage 10 → [BOSS] → Récompense
...
Étage 20 → [BOSS FINAL] → Gros loot
```

### Modificateurs aléatoires par étage
- "Ennemis en feu" : +30% ATK ennemis
- "Brouillard" : portée ranged réduite
- "Bénédiction" : +50% XP
- "Double loot" : 2× items drops
- "Malédiction" : pas de heal ce combat

### Ce que ça change
- Rejouabilité infinie (jamais le même donjon)
- Décisions constantes (quel buff choisir ?)
- Difficulté progressive dans un seul run
- Loot exclusif donjon (sets spéciaux)

---

## PISTE 4 — Système de talents / arbre de compétences
**Impact : ★★★★ | Effort : 2 jours | Profondeur de build**

### Concept
Chaque classe a un arbre de talents avec 3 branches. Le joueur investit des points (gagnés au level up) pour spécialiser ses unités.

### Exemple Guerrier
```
BRANCHE TANK          BRANCHE DPS          BRANCHE SUPPORT
├ +10% HP             ├ +10% ATK           ├ Taunt passif
├ -5% dégâts reçus    ├ +5% crit chance    ├ +10% heal reçu
├ Bouclier absorbant  ├ Double frappe      ├ Aura défensive
└ Invincibilité 2s    └ Exécution (<20% HP)└ Résurrection 1×
```

### Ce que ça change
- Le même guerrier peut devenir tank pur, DPS, ou support selon les talents
- Chaque joueur a un build unique
- Les talents se reset avec des gemmes (monétisation douce)
- Synergie avec l'équipement (build crit + items crit = combo)

---

## PISTE 5 — Multijoueur coopératif (Raids)
**Impact : ★★★★ | Effort : 4-5 jours | Social + endgame**

### Concept
Un boss de raid géant que 2-4 joueurs affrontent ensemble. Chaque joueur amène son équipe. Le boss a des phases et des mécaniques spéciales.

### Comment
- Matchmaking via Firestore (salle d'attente)
- Synchronisation via Firestore Realtime (pas besoin de WebSocket)
- Chaque joueur voit les unités des autres sur le terrain
- Le boss a 10× les stats normaux + attaques spéciales (AoE, invuln phases)

### Récompenses
- Items légendaires exclusifs raid
- Titre "Raid Master" affiché sur le profil
- Gemmes bonus

### Pourquoi c'est le plus dur
- La synchro multi-joueur est complexe même en asynchrone
- Il faut un système de salles
- Le balancing multi est délicat

---

## PISTE 6 — Craft avancé + ressources de biome
**Impact : ★★★ | Effort : 1-2 jours | Profondeur économique**

### Concept
Chaque biome droppe des matériaux spécifiques (bois en forêt, cristaux en grottes, os en ruines...). Ces matériaux servent à crafter des items spécifiques au lieu de dépendre du RNG.

### Système
- 6 matériaux de biome (1 par biome)
- Recettes de craft : 5 bois + 3 cristaux = Épée rare spécifique
- Le craft garantit un item précis (pas de RNG)
- Les recettes se débloquent en jouant

### Ce que ça change
- Le joueur a un objectif en rejouant un biome ("il me manque 3 cristaux")
- Réduit la frustration du RNG pur
- Crée un objectif parallèle au combat

---

## Tableau comparatif

| Piste | Impact fun | Effort | Rejouabilité | Rétention | Priorité recommandée |
|---|---|---|---|---|---|
| 1. Déplacement TD | ★★★★★ | 3-4j | ★★★ | ★★★ | **#1 — transforme le gameplay** |
| 2. PvP Arène | ★★★★★ | 2-3j | ★★★★★ | ★★★★★ | **#2 — rétention massive** |
| 3. Donjon Roguelike | ★★★★ | 3-4j | ★★★★★ | ★★★★ | **#3 — rejouabilité infinie** |
| 4. Talents | ★★★★ | 2j | ★★★ | ★★★ | #4 — profondeur de build |
| 5. Raids coop | ★★★★ | 4-5j | ★★★★ | ★★★★★ | #5 — le plus impactant mais le plus dur |
| 6. Craft | ★★★ | 1-2j | ★★★ | ★★ | #6 — facile mais impact modéré |

---

## Ma recommandation

**Ordre optimal** (maximize fun per effort) :

1. **Déplacement TD** (Piste 1) → change radicalement la sensation du combat
2. **Talents** (Piste 4) → ajoute de la profondeur sans gros effort
3. **Donjon Roguelike** (Piste 3) → nouveau mode de jeu complet
4. **PvP Arène** (Piste 2) → rétention long terme

Les pistes 5 (Raids) et 6 (Craft) sont des "nice to have" pour plus tard.

**Le déplacement TD est le changement le plus transformatif** — c'est lui qui fait passer le jeu de "démo idle" à "vrai jeu d'action". Et il est déjà planifié dans `docs/MOVEMENT_VISION.md`.
