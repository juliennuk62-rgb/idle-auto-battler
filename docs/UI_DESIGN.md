# UI Design — cockpit de l'auto-battler idle

## 0. Philosophie — l'UI est un cockpit, pas un menu

Un auto-battler idle n'est pas un jeu où l'on navigue d'écran en écran. C'est un **tableau de bord** où le joueur observe en continu une machine qui tourne. L'écran périphérique n'est pas du décor à remplir ou à ignorer — c'est là que le joueur lit sa situation, anticipe, décide et ressent sa progression. L'UI doit donc être construite comme un poste de pilotage :

1. **Densité = feature, pas défaut.** Chaque cm² de l'écran porte une information utile. Le vide est une perte.
2. **Temps réel fluide.** Aucune donnée ne saute brutalement d'une valeur à l'autre. Tout s'anime, s'interpole, pulse ou glisse.
3. **Promesse toujours visible.** Une "prochaine chose" à 30 secondes / 5 min / 30 min doit être à l'écran en permanence — next boss, next biome, next grade, next achievement.
4. **Actionnable.** Chaque chiffre affiché doit mener à une décision possible. Si le joueur ne peut rien faire avec une info, elle est un bruit — soit on la retire, soit on la déplace vers une modale.
5. **Cohérence pixel.** L'UI dialogue avec le pixel art du jeu sans le contredire : même palette limitée, bordures sobres, typographie qui alterne pixel (titres/chiffres) et lisible (descriptions).

**Jeux de référence.** *Path of Exile* pour la densité brute. *Loop Hero* pour le mariage pixel + dashboard. *NGU Idle* pour la profondeur de chiffres affichés. *Slay the Spire* pour la clarté hiérarchique. *Idle Heroes* pour la focus sur le roster. On pioche dans chacun, on ne copie aucun.

On a déjà du capital :
- **`TelemetrySystem`** expose tous les agrégats (DPS par unité, survival rate, damage par classe, événements bruts) — la donnée est là, l'UI n'a qu'à la lire.
- **`ResourceSystem`** est event-based : toutes les UIs qui affichent or/gems s'abonnent et se mettent à jour sans polling.
- **`CombatSystem`** connaît la team, la vague, le biome, les timers d'attaque.
- **`Progression.js`** calcule les stats grade+level et l'XP vers le prochain niveau.

Cette doc décrit comment visualiser ce capital et définit les composants d'UI à coder pour y arriver.

---

## 1. Wireframe ASCII — layout cible

Desktop standard (1440×900). Chaque colonne ASCII ≈ 14 px de réel, chaque ligne ≈ 28 px.

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║ [TOP BAR — hauteur ~80px / 9%]                                                                ║
║  ◆12.4K  ◇23  ♦0    WAVE 47 / 52 MAX  [▓▓▓░░] next boss W50   2h13   Niv.87   [☰ menu]       ║
║  Or/s 12.4/s  ▁▂▃▄▂▃▁▂▃▄▃▂  (sparkline 30s)                                                    ║
╠═══════════════╦══════════════════════════════════════════════════╦═══════════════════════════╣
║ [LEFT COL]    ║                                                  ║ [RIGHT COL]               ║
║ 260px / 18%   ║                                                  ║ 260px / 18%               ║
║               ║                                                  ║                           ║
║ ┌───────────┐ ║                                                  ║ ┌─────────────────────┐   ║
║ │[Soldat L8]│ ║                                                  ║ │Kobold Chef L47      │   ║
║ │  [sprite] │ ║                                                  ║ │  [sprite]           │   ║
║ │ HP 180/212│ ║                                                  ║ │  HP ▓▓▓▓▓▓▓░░░      │   ║
║ │ ▓▓▓▓▓▓▓░░ │ ║                                                  ║ │  menace: ★★★        │   ║
║ │ XP 34/90  │ ║                                                  ║ └─────────────────────┘   ║
║ │ ▓▓▓░░░░░░ │ ║         [ PHASER COMBAT ZONE ]                   ║                           ║
║ │ ATK 47 +5 │ ║            800 × 480 canvas                      ║ Mobs wave: 1/1            ║
║ │ DPS 62.3  │ ║               ~58% width                         ║                           ║
║ │ k:12 ⚔🎯  │ ║                                                  ║ ┌───── NEXT WAVES ─────┐  ║
║ │ 🔥⚡      │ ║                                                  ║ │ W48  norm  niv ~48   │  ║
║ └───────────┘ ║                                                  ║ │ W49  norm  niv ~49   │  ║
║ ┌───────────┐ ║                                                  ║ │ W50 ★ BOSS niv 50    │  ║
║ │Recrue L3  │ ║                                                  ║ └──────────────────────┘  ║
║ │ ...       │ ║                                                  ║                           ║
║ └───────────┘ ║                                                  ║ Rewards W47 :             ║
║ ┌───────────┐ ║                                                  ║   +42◆ anticipé           ║
║ │Tireur L5  │ ║                                                  ║                           ║
║ │ ...       │ ║                                                  ║ Difficulté : 🟢 OK         ║
║ └───────────┘ ║                                                  ║                           ║
║               ║                                                  ║ [▸ Bestiaire]             ║
║ [▸ Roster]    ║                                                  ║                           ║
╠═══════════════╩══════════════════════════════════════════════════╩═══════════════════════════╣
║ [BOTTOM BAR — hauteur ~140px / 15%]                                                            ║
║ ┌─── ACTIONS ──────────────────┐ ┌─── EVENT TIMELINE ────────────────────────────────────┐   ║
║ │ [Recruit 50◆] [Upgrade 200◆] │ │ 14:23  Soldat L8 monte L9                              │   ║
║ │ [Fuse 3 Soldats] [Prestige]  │ │ 14:21  Boss Kobold Chef vaincu · +250◆ +1◇             │   ║
║ │                              │ │ 14:18  Nouveau record : vague 47                       │   ║
║ └──────────────────────────────┘ │ 14:15  Biome → Grottes                                 │   ║
║   width ~30%                     │ 14:12  Achievement : Premier sang                      │   ║
║                                  │ 14:09  Archer recruté                                  │   ║
║                                  └────────────────────────────────────────────────────────┘   ║
║                                    width ~70%                                                 ║
╚════════════════════════════════════════════════════════════════════════════════════════════════╝
```

**Proportions relatives** (verticales puis horizontales dans la zone centrale) :

| Zone | Hauteur | Largeur |
|---|---|---|
| Top bar | ~9 % | 100 % |
| Main area | ~76 % | — |
| └ Left col (team) | — | ~18 % |
| └ Phaser center | — | ~57 % |
| └ Right col (enemies) | — | ~18 % |
| └ Gutters (2×) | — | ~7 % |
| Bottom bar | ~15 % | 100 % |

**Breakpoints** :

| Écran | Largeur | Comportement |
|---|---|---|
| Large desktop | ≥ 1440 | Layout complet, Phaser 800×480, colonnes 260 px |
| Standard desktop | 1280–1440 | Layout complet, colonnes 240 px |
| Small desktop | 1024–1280 | Layout complet, colonnes 200 px (cartes compactes) |
| Tablette landscape | 768–1024 | 2 zones verticales : combat top 60 %, dashboard bottom 40 % en onglets (Team/Enemies/Actions) |
| Mobile | < 768 | **Dégradé assumé** : combat top 45 %, barre ressources fixe, 1 onglet actif en dessous parmi (Team/Enemies/Log/Actions). Pas de cible principale mais jouable. |

---

## 2. Layout général

### Tableau de zones

| Zone | Dimensions (%) | Densité | Hiérarchie | Breakpoint behavior |
|---|---|---|---|---|
| Top bar | 100 × 9 | Haute | Chiffres en H1 monospace ; sparkline en H3 | Reste fixe partout, s'enroule en 2 lignes sous 1024 |
| Left col (Team) | 18 × 76 | Très haute | Carte par unité, sections HP/XP/Stats | Passe en onglet sur tablette |
| Combat center (Phaser) | 57 × 76 | N/A | Zone graphique | Peut scale-down pour tenir (avec ratio) |
| Right col (Enemies) | 18 × 76 | Haute | Bloc mob courant + preview waves | Passe en onglet sur tablette |
| Bottom bar Actions | 30 × 15 | Moyenne | Grille de gros boutons | Colonne sur mobile |
| Bottom bar Timeline | 70 × 15 | Très haute | Flux scrollable | Reste scrollable partout |
| Modales (overlays) | variable | Très haute | Plein écran avec backdrop blur | 100 % viewport sur mobile |

### Philosophie de hiérarchie visuelle

- **H0** : le chiffre Wave en top bar — plus gros élément de l'écran après le combat.
- **H1** : ressources (or, gems, soul), noms d'unités, noms de boss.
- **H2** : stats numériques (ATK, HP, DPS), niveaux, grades.
- **H3** : libellés, unités de mesure, tooltips collapsed.
- **H4** : timestamps, métadonnées tooltips expanded.

Règle : **jamais plus de 3 niveaux** de hiérarchie dans un même panneau pour rester lisible.

---

## 3. Barre supérieure — ressources et progression

### Éléments affichés

| # | Élément | Format | Animation au changement | Pulse / trigger | Tooltip hover |
|---|---|---|---|---|---|
| 1 | **Or ◆** | `1.2K`, `3.4M`, `1.2B`, `1.2T` | Tween increment sur 500 ms avec easing `Quad.Out` | Pulse doré aux paliers 10K / 100K / 1M / 10M / 100M | Total exact, or/s, temps pour next palier |
| 2 | **Gemmes ◇** | Nombre brut jusqu'à 999, puis `1.2K` | Tween increment 400 ms | Pulse violet au gain (rare donc chaque gain compte) | Total, utilité ("+1 fragment lors du prestige") |
| 3 | **Fragments d'âme ♦** | Brut | Tween | Flash doré au premier gain (tutoriel implicite) | **Masqué tant que le joueur n'a pas prestigé au moins une fois**, puis permanent |
| 4 | **WAVE N / MAX** | `47 / 52 MAX` | Saut avec flash blanc bref | Flash vert si nouveau max | Historique des paliers : W10 / W25 / W50 / W100 |
| 5 | **Barre progress next boss** | `[▓▓▓░░] next boss W50` | Bar fill tween 300 ms | — | "Boss dans 3 vagues" |
| 6 | **Or/s + sparkline** | `12.4/s ▁▂▃▄▂▃` 30 s | Sparkline shift toutes les 1 s | Sparkline turn red si or/s en chute brutale | Avg 1 min, 5 min, peak session |
| 7 | **Temps de jeu / dernier prestige** | `2h13` session, `47m` depuis prestige | Tick toutes les 1 s | — | Temps de jeu cumulé (toutes sessions) |
| 8 | **Niveau joueur** | `Niv.87` | Tween au levelup | Flash doré au levelup | Formule : somme des levels d'unités × (1 + max_grade_atteint × 0.1) |
| 9 | **Menu ☰** | Icône | — | — | "Options / Sauvegarde / À propos" |

### Formulation numérique abrégée

Formatter `formatNumber(n)` à coder une fois et réutiliser partout :

```
< 1 000         → affichage entier (47, 342)
< 10 000        → 1 décimale + 'K' (4.2K)
< 1 000 000     → entier + 'K' (42K, 342K)
< 10M           → 1 décimale + 'M' (4.2M)
< 1B            → entier + 'M' (42M)
< 10B           → 1 décimale + 'B'
< 1T            → entier + 'B'
...             → notation scientifique (1.2e18) au-delà
```

### Tooltip protocol

Tous les tooltips apparaissent après **400 ms** de hover fixe (évite les flashes lors d'un déplacement de souris). Ils disparaissent instantanément au `mouseleave`. Tous les tooltips ont la même ombre et bordure (cohérence).

---

## 4. Colonne gauche — équipe active

### Carte d'unité — structure détaillée

```
┌──────────────────────────┐  ← bordure 2px, couleur selon grade
│ [X]  Soldat  L8          │  ← [X] = icône classe (⚔ warrior, 🏹 archer)
│      grade 2             │  ← sous-ligne grade nom en smaller text
│ ┌──────────┐             │
│ │          │  DPS 62.3   │  ← sprite 48×48 px à gauche, DPS live à droite
│ │  sprite  │  kills 12   │  ← DPS: couleur heatmap vs attendu
│ │  anim    │  ⚔ → ⚫     │  ← "target: closest front" condensé
│ └──────────┘             │
│ HP ▓▓▓▓▓▓▓░░ 180 / 212   │  ← lag bar double (blanc descend après le rouge)
│ XP ▓▓▓░░░░░  34 / 90     │  ← progress vers next level
│                          │
│ ATK  47 (+5)  ⚡ 1.3s    │  ← delta coloré si buff
│ DEF   0   SPD 1.3s       │  ← optionnel selon stats présentes
│                          │
│ 🔥 ⚡ 🛡                 │  ← buffs/debuffs empilés (3 max visibles, "+N" si plus)
└──────────────────────────┘
```

### Éléments en détail

| Champ | Source de donnée | Refresh rate | Animation |
|---|---|---|---|
| Sprite animé | Phaser texture (ou mini-render DOM) | 60 fps sur anim Phaser ; stato DOM | Idle 2 frames, attack flash white, death greyscale |
| Nom + grade | `Fighter.name`, `gradeName(class, grade)` | On change | Flash doré au levelup |
| **HP lag bar** | `Fighter.hp / Fighter.maxHp` | 60 fps | **Deux bars superposées** : la rouge arrière (vraie HP) descend instantanément, la blanche avant descend 400 ms après avec easing → lit visuellement la taille du "hit" |
| XP bar | `Fighter.xp / xpToNextLevel(level)` | 60 fps | Fill tween 300 ms |
| ATK / DEF / SPD | `Fighter.atk, atkSpeed` | On change | Delta coloré `+5` vert / `-3` rouge persistant 3 s après la modification |
| Icône classe | `Fighter.class` | — | — |
| Icône cible | `Fighter.targeting` | — | — |
| DPS live | `TelemetrySystem.getCurrentCombatStats().dpsByUnit[id]` | 4 Hz | Tween entre mesures |
| Kills | `TelemetrySystem` agrégation sur combat courant | On kill | Flash à chaque nouveau kill |
| État mort | `Fighter.isAlive === false` | On change | Carte desaturée + croix rouge superposée + overlay "RESPAWN 0.8s" (countdown) |
| Buffs/debuffs | **Non encore implémenté** (proposition d'extension, voir §17) | — | — |

### Hover étendu (panneau historique)

Au hover d'une carte pendant 400 ms, un **panneau flottant** s'ouvre à droite de la carte (ou à gauche si près du bord) avec :

- Combats totaux joués par cette unité (`agg.unitStats[id].combats`)
- Taux de survie (`agg.survivalRateByUnit[id]` en %)
- Dégâts cumulés infligés (`agg.unitStats[id].damageDealt`)
- Dégâts cumulés subis
- XP totale gagnée (cumul, depuis recrutement — **nouvelle métrique à ajouter** à `TelemetrySystem`)
- Date de recrutement (**nouvelle donnée à ajouter** au Fighter ou au Roster spec)
- Mini-histogramme "DPS dernières 10 combats" si possible

Le panneau ferme au `mouseleave` après 200 ms de délai (évite les clignotements si la souris entre-sort rapidement).

### Bouton "Roster complet"

Sous la dernière carte d'équipe, un bouton pleine largeur `[▸ Roster (12 unités)]` — ouvre la modale Roster (voir §7.1). Le chiffre entre parenthèses est le total d'unités possédées.

---

## 5. Colonne droite — ennemis et vague

### Bloc monstre actuel

Même philosophie que la carte d'unité mais simplifié :

```
┌──────────────────────┐
│ Kobold Chef    L47   │
│ ┌────────┐           │
│ │ sprite │ menace ★★★│  ← menace dérivée de ratio HP vs team DPS
│ └────────┘           │
│ HP ▓▓▓▓▓▓░░ 180/450  │
│ ATK 65  ⚡ 1.5s      │
└──────────────────────┘
```

**Pas de carte par mob** tant qu'il n'y a qu'un mob par vague — gagner de la place. Le jour où il y a des groupes (extension future), lister les mobs empilés.

### Compteur de monstres restants

Sous le bloc mob : `Mobs wave : 1 / 1`. Le premier chiffre diminue au fur et à mesure qu'ils meurent, le deuxième est le total initial de la vague.

### Aperçu 3 prochaines vagues

```
┌───── NEXT WAVES ─────┐
│ W48  norm  niv ~48   │
│ W49  norm  niv ~49   │
│ W50 ★ BOSS niv 50    │  ← ★ jaune clignotant si boss dans les 3 à venir
└──────────────────────┘
```

Chaque ligne :
- Numéro de vague
- Type (`norm`, `★ BOSS`, ou `◆ ÉLITE` si extension future)
- Niveau du monstre (calculé via `computeMonsterStats(wave).hp` converti en niveau ressenti, ou juste `niv ~N`)
- Couleur spéciale si boss (jaune) ou biome change (couleur du biome suivant)

Au hover d'une ligne, tooltip : "Apparaît dans X s (au rythme actuel)", "Récompense attendue : +Y or", "HP estimé : Z".

### Rewards anticipées

Affichage condensé : `Rewards W47 : +42◆` + tooltip détail (or + gems si boss).

### Indicateur de difficulté

**Calcul automatique** à partir de la télémétrie + stats :

```
dpsRatio = team_dps / (monster_hp / typical_combat_duration)
tankRatio = team_total_hp / (monster_dps × typical_combat_duration)
difficulty = min(dpsRatio, tankRatio)

> 1.5  → 🟢 facile
0.8-1.5 → 🟡 tendu
< 0.8  → 🔴 risque wipe
```

Affiché avec l'icône de couleur + label texte. Hover révèle les deux ratios.

### Bestiaire quick-view

Icône en bas de colonne `[▸ Bestiaire (8 / 50 vus)]` — ouvre la modale Bestiaire.

---

## 6. Barre inférieure — actions et timeline

### Zone actions (gauche, ~30 %)

Grille de 2×2 boutons (éventuellement 3×2 si plus d'actions plus tard) :

```
┌──────────────────┬──────────────────┐
│ RECRUIT          │ UPGRADE          │
│ Guerrier         │ Sélection        │
│ coût 50 ◆        │ coût 200 ◆       │
│                  │                  │
├──────────────────┼──────────────────┤
│ FUSE             │ PRESTIGE         │
│ 3×Soldat → Guer. │ reset · +5 ♦     │
│ prêt             │ wave 50 min      │
│                  │                  │
└──────────────────┴──────────────────┘
```

**Règles d'état par bouton** :

| État | Couleur | Anim | Cliquable |
|---|---|---|---|
| **Disponible** | Accent classe | Pulse léger 1× (200 ms) quand vient de devenir disponible | Oui |
| **Indisponible (ressource manquante)** | Grisé | — | Non ; tooltip "Il manque 35◆" |
| **Indisponible (condition non remplie)** | Grisé + icône ⊘ | — | Non ; tooltip explique la condition |
| **En cooldown** (si applicable) | Bord animé | Rotation radiale | Non ; affiche le temps restant |

**Confirmations** pour actions destructives ou coûteuses :
- Fusion : petit popup "Fuser 3 Soldats L8 → 1 Guerrier L1 ? L'XP est perdue." avec boutons `[Confirmer] [Annuler]`.
- Prestige : modale Prestige full (voir §7.5).

### Zone timeline (droite, ~70 %)

Liste scrollable avec les **20 derniers événements**. Pattern d'entrée :

```
14:23  ⬆  Soldat L8 monte L9                          +stats visibles au hover
14:21  💀 Boss Kobold Chef vaincu · +250◆ +1◇          record de vague !
14:18  🏆 Nouveau record : vague 47                    
14:15  🌍 Biome → Grottes                              
14:12  ⭐ Achievement : Premier sang                   
14:09  ➕ Archer recruté · coût 50◆                    
14:05  🔥 Combo x5                                     
...
```

**Règles** :
- Nouvelle entrée **glisse depuis le haut** avec `Quad.Out` (250 ms).
- Ancienne entrée hors-vue est **supprimée** (pool de 30 items max en mémoire, 20 visibles).
- Chaque entrée est **cliquable** — click ouvre une mini-popover avec le payload complet (événement télémétrie brut).
- **Couleur par type** : ⬆ vert (levelup), 💀 doré (boss kill), 🏆 jaune pâle (record), 🌍 couleur biome, ⭐ jaune achievement, ➕ blanc recruit, 🔥 orange combo.
- Au **hover pause** le scroll automatique (si auto-scroll est activé).

### Source des événements

La timeline lit directement les events de `TelemetrySystem.recordEvent(...)` via un nouveau **listener broadcast** à ajouter (voir proposition §17). Pour le MVP, on peut aussi poller `TelemetrySystem.getRecentCombats(1)` à 2 Hz et déduire les nouveaux events.

---

## 7. Modales

Pour chaque modale on définit : **déclencheur** / **fermeture** / **pause le combat ?** / **intégration visuelle**.

### Règles communes

- **Backdrop flou** (`backdrop-filter: blur(4px)`) semi-transparent noir 60 %.
- **Centrée** sur le viewport, max-width 1200 px, max-height 85 vh.
- **Fermeture** : bouton `×` top-right, touche `Échap`, clic sur backdrop.
- **Transition d'ouverture** : fade + scale 0.95 → 1, 250 ms, `Back.Out`.
- Le combat **continue** par défaut (idle oblige), sauf pour Prestige qui pause (décision importante).

### 7.1 Roster complet

**Déclencheur** : bouton `[▸ Roster]` colonne gauche + hotkey `R`.

**Contenu** :
- Grille responsive de toutes les unités possédées (mini-cartes 160×200 px).
- Barre d'outils haut :
  - Onglets de filtre : `Tous · Guerriers · Archers · Autres`
  - Tri : `Puissance ↓ · Grade ↓ · Niveau ↓ · DPS ↓ · Date ↓`
  - Bouton **Auto-fuse** (fuse automatiquement tous les trios fusables)
- Zone de sélection multiple pour fusion manuelle (click = select, shift+click = range, maj touch)
- Drag-and-drop d'une mini-carte vers les slots d'équipe active (panneau latéral gauche de la modale montre l'équipe active avec 6 slots max).

**Donnée source** : nouveau **`RosterSystem`** (à créer, voir §17).

**Combat** : continue en background, on voit les combats via une mini-preview 200×120 en bas à droite de la modale (optionnel, polish).

### 7.2 Statistiques détaillées

**Déclencheur** : clic sur le niveau joueur en top bar + hotkey `S`.

**Contenu** — vrai dashboard analytics avec onglets :
- **Vue d'ensemble** : KPIs (combats joués, wave max, gold/min, total damage, total death, longest combat streak).
- **Par unité** : tableau triable de `unitStats` depuis télémétrie — colonnes id, classe, grade, level, damage dealt, damage taken, deaths, survivals, survival rate.
- **Par classe** : camembert dégâts infligés et subis par classe.
- **Courbe de progression** : graphe des waves atteintes dans le temps (ligne).
- **Durée par vague** : histogramme `agg.avgDurationByWave`.
- **Événements** : feed scrollable des 100 derniers combats complets avec events expandables.

Tout est tiré directement des agrégats **existants** de `TelemetrySystem.getAggregates()` — aucune donnée à inventer.

Un bouton `[Exporter JSON]` permet de télécharger un dump complet via `TelemetrySystem.exportJSON()`.

### 7.3 Bestiaire

**Déclencheur** : `[▸ Bestiaire]` colonne droite + hotkey `B`.

**Contenu** :
- Grille de fiches monstres : **silhouette noire** pour jamais vus, couleur pour rencontrés, halo doré pour tués 100+ fois.
- Onglets par biome.
- Clic sur une fiche → détails : stats de base, scaling par wave, drops connus, nombre de fois tué, record de temps pour le tuer.

**Note** : le bestiaire exige de **persister les mobs rencontrés**. Proposer un nouveau sub-système `BestiarySystem` qui écoute les `unit_died` télémétrie et agrège par classe+variant. Voir §17.

### 7.4 Achievements

**Déclencheur** : icône trophée top bar + hotkey `A`.

**Contenu** :
- Liste catégorisée (Combat, Roster, Économie, Collection, Prestige).
- Chaque entrée : titre, description, barre de progression (si multi-pallier), récompense, date de déblocage si fait.
- Les achievements non débloqués sont visibles mais grisés — **la liste elle-même est un spoiler utile** qui montre ce qui est possible.

**Note** : exige un `AchievementSystem` (à créer) branché sur les events télémétrie via prédicats.

### 7.5 Prestige

**Déclencheur** : bouton `[Prestige]` bottom bar + hotkey `P`.

**Contenu** — c'est la SEULE modale qui **pause** le combat tellement la décision est structurelle :
- Gros titre `PRESTIGE — RESET VERS LA VAGUE 1`
- Résumé de ce qui sera **perdu** : wave courante, or, gemmes, toutes les unités, tous les buffs temporaires
- Résumé de ce qui sera **conservé** : fragments d'âme, bonus permanents achetés, statistiques télémétrie, bestiaire, achievements
- Nombre de fragments d'âme qui seront **gagnés** : formule affichée (`floor(wave_max / 10)` ou similaire)
- Grille de bonus permanents achetables avec les fragments (ex: `+10% or global`, `+5% HP équipe`, `commence avec un Soldat`)
- Case à cocher `[ ] Réinitialiser aussi les statistiques` (désactivée par défaut, cf. `TelemetrySystem.onPrestige(resetAggregates)`)
- Bouton `[CONFIRMER LE PRESTIGE]` rouge qui exige une **double confirmation** (hold 1 s ou re-click).

**Note** : exige un `PrestigeSystem` avec catalogue de bonus + application au reset. Voir §17.

---

## 8. Style visuel et cohérence pixel art

### Palette sémantique

On dérive une palette à 16 couleurs qui couvre l'UI et respecte le contraste :

| Rôle | Couleur hex | Usage |
|---|---|---|
| Background principal | `#0f0f1e` | Fond de l'app |
| Background panel | `#1a1a2e` | Cartes, modales |
| Background panel élevé | `#252541` | Hover, modale focus |
| Bordure subtile | `#2d2d4a` | Séparateurs |
| Bordure accent | `#444464` | Bordures de cartes |
| Texte primaire | `#ffffff` | Chiffres importants |
| Texte secondaire | `#d8d8e8` | Libellés |
| Texte tertiaire | `#888898` | Timestamps, métadonnées |
| **Or / gain** | `#fbbf24` | Ressource or, gains, boss |
| **Dégâts** | `#ef4444` | HP qui baisse, défaite |
| **Soin / OK** | `#22c55e` | HP qui monte, warrior, ok |
| **Magie / info** | `#60a5fa` | Bleu froid, cooldowns |
| **Rare / archer** | `#a855f7` | Violet, archer, gemmes |
| **Légendaire** | `#f97316` | Orange vif, max grade |
| **Échec / indispo** | `#64748b` | Boutons grisés |
| **Critique / warning** | `#f87171` | Danger, confirm destructif |

Tous les textes sur fond panel respectent un **contraste ≥ 4.5:1**. Le bleu `#60a5fa` sur fond `#1a1a2e` donne ~7:1, le vert `#22c55e` donne ~6:1 — bons.

### Typographie

Deux polices, pas plus :

1. **"Press Start 2P"** (gratuit Google Fonts) — utilisée pour **titres, chiffres importants, wave counter, nombres de ressources**. Strictement pixel, 8×8 grid. Taille 8/10/12/16/20 px.
2. **"Inter"** (gratuit, via Google Fonts) — utilisée pour **descriptions, tooltips, texte long, historiques**. Moderne, lisible à toutes les tailles, excellent rendu sub-pixel. Tailles 11/13/15 px.

Alternative à "Inter" si plus léger : **"JetBrains Mono"** pour tout ce qui est tabulaire (stats, logs), reste-t-elle lisible.

### Cadres et bordures

**Style choisi** : **pixel-art 2-tone frame** — bordure 2 px avec highlight `top+left` légèrement plus clair et shadow `bottom+right` plus sombre, coins en pixel point pur (1 px), pas d'arrondi CSS. Ça donne un look "cartouche de jeu" sans tomber dans le skeuomorphisme papier-velin.

Exemple implémentation CSS d'une bordure unique :

```css
.frame {
  background: #1a1a2e;
  box-shadow:
    inset 2px 2px 0 #444464,     /* highlight top-left */
    inset -2px -2px 0 #0f0f1e;    /* shadow bottom-right */
  padding: 10px;
}
```

**Justification** : cohérent avec le pixel art, coût d'implémentation proche de zéro, facilement déclinable en variantes (cadre doré pour légendaire, cadre rouge pour boss).

### Animations d'interface

- Durée standard : **200-300 ms** sauf cas spéciaux.
- Easings par type :
  - Apparition : `Back.Out` (léger dépassement)
  - Disparition : `Quad.In` (chute accélérée)
  - Interpolation de valeur : `Quad.Out` (arrivée douce)
  - Feedback action : `Cubic.Out`
- **Jamais de jump-cut** pour un chiffre qui change (tween obligatoire).
- **Jamais plus de 500 ms** pour une ouverture de modale — frustrant sinon.
- Utiliser `transform` et `opacity` autant que possible (GPU-accéléré, 60 fps).

### Densité comme feature

Référence : **Path of Exile** (stash tab complet 12×12 cases + 8 ressources visibles en permanence) et **Loop Hero** (carte + cartes + stats + équipement sur un seul écran). L'important n'est pas de **remplir** l'espace, c'est de **stratifier** l'information. Le joueur parcourt de haut en bas l'écran et trouve du détail à chaque hover.

---

## 9. Réactivité et données temps réel

### Tableau de rafraîchissement par donnée

| Donnée | Source | Refresh | Animation | Pulse | Throttle |
|---|---|---|---|---|---|
| HP alliés | `Fighter.hp` direct | 60 fps (rAF) | Lag bar double | Flash rouge quand hit | Aucun (60 fps ok) |
| HP monstre | `Fighter.hp` direct | 60 fps | Lag bar simple | Flash doré aux coups critiques | Aucun |
| XP | `Fighter.xp` | 60 fps mais affiché 10 fps | Fill smooth | Pulse doré au levelup | 10 fps via throttle |
| Or/Gems (counter top) | `ResourceSystem` event | On change | Tween increment 500 ms | Pulse aux paliers | N/A (event-based) |
| DPS par unité | `TelemetrySystem.getCurrentCombatStats()` | 4 Hz | Tween entre mesures | Rouge si DPS < 80 % de la moyenne | 4 Hz |
| Sparkline or/s | Moyenne glissante 30 s | 1 Hz | Shift pixels | Rouge si chute brutale > 50 % | 1 Hz |
| Wave / progression boss | `CombatSystem.currentWave` | On change | Flash + tween progress bar | Flash à chaque boss | N/A |
| Difficulté (🟢🟡🔴) | Ratios live calculés | 2 Hz | Fade entre couleurs | — | 2 Hz |
| Mobs restants | `teamB.filter(isAlive).length` | On change | Pop du chiffre | — | N/A |
| Timeline events | `TelemetrySystem` listener | On event | Slide in 250 ms | — | N/A |
| Boutons d'actions | Re-check conditions | 2 Hz | Pulse à l'activation | Pulse 1× quand devient dispo | 2 Hz |

### Stratégie d'implémentation

Principe : **3 vitesses de rafraîchissement**, pas plus.

1. **Render-loop (60 fps, rAF)** — uniquement le strict minimum : HP bars (lag bar nécessite du frame-par-frame), sparklines en cours d'animation, progress bars tweenées. Un `UIRenderLoop` global s'occupe de ça.

2. **Throttle 10 Hz (100 ms)** — tout le reste "visuel temps réel" : XP bars, DPS affichés, timers. Un `setInterval(..., 100)` unique qui appelle un `tickUI()` qui met à jour tous les abonnés.

3. **Event-driven (à la demande)** — ressources, wave change, levelup, combat start/end, kill, achievement. Déclenché par les systems existants.

**Dirty flags** : chaque panel garde un `_dirty = true` au changement de donnée. Le render-loop ne met à jour que les panels marqués dirty, puis les remet à `false`. Évite de recalculer 50 textSet par frame.

**Pool DOM** : les éléments créés (floating reward, timeline entries) sont **pooled** et réutilisés au lieu d'être détruits. Évite le GC trash.

**Optim CSS** : toutes les animations utilisent `transform` et `opacity` (GPU). `will-change: transform` sur les éléments qui bougent fréquemment (lag bars, sparklines). Pas de `width` / `height` animés (force re-layout).

---

## 10. Accessibilité et confort

### Contraste et lisibilité

- Tous les textes importants (H0-H2) passent **WCAG AA** (ratio ≥ 4.5:1 sur fond).
- Les textes secondaires (H3) passent **AA Large** (ratio ≥ 3:1).
- **Jamais** de texte rouge sur fond sombre pour des stats importantes — le rouge passe mal pour ~8 % des joueurs (daltonisme). Utiliser icône + couleur ensemble.

### Options utilisateur (dans Options modal)

- **Taille d'UI** : `Compacte · Normale · Large` — change le zoom CSS root (0.85 / 1.0 / 1.15). Le layout doit rester stable (pas d'overflow).
- **Réduction des animations** : switch `Off / Réduit / Aucun` — `Aucun` désactive toutes les animations > 200 ms, remplace les tweens par des `setText` directs.
- **Notation numérique** : `Compacte (1.2K) · Complète (1 200)` — pour les joueurs qui veulent lire les vrais chiffres.
- **Auto-fuse** : switch `On / Off` — active la fusion automatique en arrière-plan quand un trio est détecté.
- **Confirmation prestige** : switch `Toujours · Au-delà du record · Jamais`.

### Confirmations d'actions destructives

Modal de confirmation obligatoire pour :
- Prestige (reset complet)
- Fusion d'une unité rare/légendaire (grade ≥ 6)
- Reset des statistiques télémétrie

### Undo

Réservé aux actions **non destructives** :
- Réorganisation de l'équipe active (drag-drop) → Ctrl+Z revient à l'ordre précédent (buffer 10 étapes).
- Filtre/tri du roster → reset au hover sur un bouton "reset filtres".

### Hotkeys

| Touche | Action |
|---|---|
| `R` | Ouvre/ferme Roster |
| `S` | Ouvre/ferme Stats |
| `B` | Ouvre/ferme Bestiaire |
| `A` | Ouvre/ferme Achievements |
| `P` | Ouvre Prestige (focus, pas toggle) |
| `Échap` | Ferme toute modale ouverte |
| `Espace` | Pause/reprise du combat (debug) |
| `F9` | Toggle l'overlay télémétrie debug (existant) |
| `F10` | Fusion debug (existant) |

---

## 11. Phaser vs DOM — décision par zone

| Zone | Tech | Justification |
|---|---|---|
| **Combat center** | **Phaser** | Animations 60 fps, particules, shaders, sprites — là où Phaser brille. |
| **Floating damage** | **Phaser** (existant) | Co-localisé avec les sprites, pool déjà implémenté. |
| **Combo counter** | **Phaser** (existant) | Positionné dans la zone de combat, anims intégrées au game clock. |
| **Wave banner** | **Phaser** (existant) | Même raison + overlap volontaire avec le combat. |
| **Top bar** | **DOM** | Texte, layout flexbox, tooltips natifs, CSS transitions. Zero bénéfice à le mettre en Phaser. |
| **Team cards** | **DOM** | Tooltips, hover états, scroll si > 3 unités, layout responsif. Sprites via `<img>` ou mini-render. |
| **Enemy cards** | **DOM** | Même raison. |
| **Actions buttons** | **DOM** | Boutons natifs = accessibility + keyboard nav gratuits. |
| **Event timeline** | **DOM** | Scroll fluide, pool de lignes, hover overlays, animations CSS. |
| **Modales** | **DOM** | Full-page layouts, forms, scrollables, accessible, i18n friendly. |
| **Sparkline or/s** | **DOM** (SVG) | Simple et léger en SVG, pas besoin de Phaser. |
| **Resource bar** | **DOM** | **Refactor** depuis l'actuelle en Phaser → migration progressive prévue par la roadmap. |

**Principe général** : **tout ce qui n'est pas du combat vit dans le DOM.** Le DOM est plus souple pour des UIs complexes, l'itération est beaucoup plus rapide (CSS hot reload), l'accessibilité est gratuite. Phaser reste dédié au moteur de jeu.

**Conséquence architecturale** : le Phaser game est dans un `<div id="game">` positionné absolute au centre. Autour, un layout CSS grid fournit les zones DOM. Les DOM panels s'abonnent aux systems JS (`ResourceSystem`, `TelemetrySystem`, etc.) exactement comme `ResourceBar.js` le fait déjà. Zéro couplage Phaser.

---

## 12. Roadmap d'implémentation MVP → cockpit → polish

### Phase 1 — MVP (1 à 2 jours)

Objectif : **l'UI est jouable**, le combat a un cadre, les ressources sont visibles, le joueur voit sa team et peut actioner l'essentiel.

- [ ] HTML shell layout grid (top bar, left col, center, right col, bottom bar)
- [ ] CSS palette + typographie chargées (Press Start 2P + Inter)
- [ ] `ResourceCounter` DOM — refactor de l'actuel Phaser `ResourceBar`
- [ ] `UnitCard` MVP — sprite placeholder, nom+grade, HP bar simple, XP bar, stats
- [ ] Renderer du combat Phaser dans le `<div id="game">` central
- [ ] Wave counter + next boss progress en top bar
- [ ] `EventLog` MVP — 20 entries, ajout via subscribe à `TelemetrySystem`
- [ ] Bouton `[Fuse]` fonctionnel (remplace le debug F10)
- [ ] `formatNumber(n)` helper

### Phase 2 — Cockpit (3 à 5 jours)

Objectif : **le tableau de bord est complet**, toutes les zones sont remplies, les hovers marchent, 2 modales principales sont là.

- [ ] Sparkline or/s via SVG
- [ ] Lag bar (double HP bar) fluide
- [ ] Stats avec delta `+5` vert / `-3` rouge
- [ ] Hover étendu sur cartes d'unité (historique depuis télémétrie)
- [ ] Enemy card complète avec sprite
- [ ] Next waves preview (3 lignes)
- [ ] Difficulty indicator 🟢🟡🔴 via ratios calculés
- [ ] Modal Roster (grille + tri + filtres + drag-drop basique)
- [ ] Modal Stats (dashboard dérivé de `TelemetrySystem.getAggregates()`)
- [ ] Hotkeys R / S / Échap
- [ ] Tooltips génériques (`Tooltip` component)
- [ ] Animations globales (Back.Out, Quad.Out sur transitions)

### Phase 3 — Polish (1+ semaine)

Objectif : **sensation cockpit complète**, rien ne manque, le joueur peut passer 2h sans frustration.

- [ ] Modal Bestiaire + `BestiarySystem` (nouveau)
- [ ] Modal Achievements + `AchievementSystem` (nouveau)
- [ ] Modal Prestige + `PrestigeSystem` (nouveau)
- [ ] Options modal (accessibilité, taille UI, réduction anim, notation)
- [ ] Pulse sur boutons nouvellement disponibles
- [ ] Confirmation destructive (fusion rare, reset stats)
- [ ] Undo drag-drop équipe
- [ ] Sprites animés dans les unit cards (mini-render Phaser ou CSS sprite sheet)
- [ ] i18n prêt (extraction des tooltips/microcopy)
- [ ] Breakpoint mobile dégradé jouable
- [ ] Audit contraste final (via outil type axe / Lighthouse)

**Temps total estimé** : MVP 1-2 j, Cockpit +3-5 j, Polish +1-2 semaines. Soit environ **3 semaines** du MVP au cockpit complet.

---

## 13. Composants réutilisables

12 briques à coder une seule fois. Chacune est un **module ES** exportant une classe ou une factory, avec une API claire et minimale.

### 13.1 `ResourceCounter`

Affiche une valeur de ressource avec icône, label, tween incrémental au changement, pulse aux paliers, tooltip.

```ts
new ResourceCounter(container, {
  label: 'Or',
  icon: '◆',
  color: '#fbbf24',
  source: ResourceSystem,        // singleton event-based
  sourceKey: 'gold',             // quelle prop lire / à quel event écouter
  format: 'compact',             // 'compact' | 'full'
  milestones: [10000, 100000, 1000000],
  tween: 500,
  tooltip: (value) => `Or total : ${value}\nOr/s : ${rate}`,
})
```

**API publique** : `setValue(n, animated=true)`, `destroy()`.

### 13.2 `UnitCard`

Carte d'une unité alliée avec HP/XP bars, stats, DPS live, kills, état mort.

```ts
new UnitCard(container, {
  fighter: Fighter,              // référence directe, la carte poll
  telemetry: TelemetrySystem,    // pour le DPS live
  onClick: (f) => openDetails(f),
  onHover: (f) => showHistory(f),
  compact: false,                // compact = 160×180, full = 220×220
})
```

**API publique** : `refresh()` (force un redraw), `setDead()`, `destroy()`.

### 13.3 `ProgressBar`

Barre de progression simple, couleur + label optionnel + tween au changement.

```ts
new ProgressBar(container, {
  min: 0, max: 100, value: 0,
  color: '#22c55e',
  bgColor: '#222',
  height: 8,
  label: '',                     // ex: "180 / 212"
  labelPosition: 'overlay',      // 'overlay' | 'right' | 'none'
  tweenDuration: 300,
})
```

**API publique** : `setValue(n, animated=true)`, `setMax(n)`, `setColor(hex)`, `destroy()`.

### 13.4 `LagBar`

Variante double-barre : couche arrière "réelle" + couche avant "lag" qui suit en retard — lit visuellement la taille d'un hit.

```ts
new LagBar(container, {
  min: 0, max: 100, value: 100,
  color: '#ef4444',              // couche arrière (hp réelle)
  lagColor: '#ffffff',           // couche avant (hp d'il y a 400 ms)
  lagDelay: 400,
  lagDuration: 500,
  height: 10,
})
```

### 13.5 `Tooltip`

Tooltip générique qui s'attache à un élément, apparaît après 400 ms de hover, contenu dynamique.

```ts
Tooltip.attach(element, {
  content: () => `<div>${html}</div>`,  // string ou element
  placement: 'auto',             // 'auto' | 'top' | 'bottom' | 'left' | 'right'
  delay: 400,
  maxWidth: 280,
})
```

**API** : `Tooltip.attach(el, opts)`, `Tooltip.detach(el)`.

### 13.6 `Modal`

Container modal avec backdrop flou, fade-in, close button, hotkey Échap.

```ts
new Modal({
  title: 'Roster',
  content: htmlOrElement,
  width: 900,
  height: 'auto',
  pausesGame: false,
  onClose: () => {},
  hotkey: 'R',
})
```

**API** : `open()`, `close()`, `setContent(html)`, `destroy()`.

### 13.7 `Button`

Bouton cockpit avec états (available / disabled / cooldown), pulse à l'activation, confirmation optionnelle.

```ts
new Button(container, {
  label: 'Fuse',
  sublabel: '3× Soldat',
  cost: { gold: 0, gems: 0 },    // vérifie ResourceSystem auto
  icon: '⚡',
  color: '#fbbf24',
  onClick: () => {},
  confirm: false,                // true = modal confirm avant action
  enabled: () => true,           // prédicat eval à chaque tick 2 Hz
  hotkey: null,
})
```

**API** : `enable()`, `disable(reason)`, `pulse()`, `setCost({...})`.

### 13.8 `Sparkline`

Mini-graphe temporel SVG. Shift à chaque nouvelle valeur, fill semi-transparent sous la ligne.

```ts
new Sparkline(container, {
  width: 120,
  height: 30,
  points: 30,                    // 30 valeurs de la fenêtre glissante
  color: '#fbbf24',
  warningColor: '#ef4444',
  warningThreshold: (value, avg) => value < avg * 0.5,
})
```

**API** : `push(value)`, `clear()`, `destroy()`.

### 13.9 `IconBadge`

Petite icône avec badge numérique, pulse au changement. Pour buffs, debuffs, compteurs compacts.

```ts
new IconBadge(container, {
  icon: '🔥',
  count: 3,
  color: '#f97316',
  tooltip: 'Burn · 5s restants',
})
```

### 13.10 `EventLog`

Flux d'événements scrollable avec pool DOM, slide-in des nouvelles entrées, filter par type, click pour détails.

```ts
new EventLog(container, {
  maxEntries: 20,
  poolSize: 30,
  telemetry: TelemetrySystem,    // s'abonne aux events via TelemetryBroadcast
  formatters: {
    unit_levelup: (e) => `⬆ ${e.unitId} monte L${e.newLevel}`,
    unit_died:    (e) => `💀 ${e.unitId} tombé`,
    // ...
  },
})
```

**API** : `push(event)`, `clear()`, `pauseScroll()`, `resumeScroll()`.

### 13.11 `DiffStat`

Stat numérique avec delta coloré persistant après modification (`+5` vert, `-3` rouge).

```ts
new DiffStat(container, {
  label: 'ATK',
  value: 47,
  diffDuration: 3000,            // combien de temps montrer le delta
  format: 'integer',
})
```

**API** : `setValue(n)` — déclenche auto le calcul du delta.

### 13.12 `Confirm`

Popup de confirmation pour actions destructives. Soit un hold 1 s, soit un double-click.

```ts
Confirm.show({
  title: 'Prestige ?',
  message: 'Vous perdrez tout votre or et vos unités.',
  confirmLabel: 'Prestige',
  cancelLabel: 'Annuler',
  danger: true,
  holdMs: 1000,                  // bouton à maintenir pour valider
})
// retourne une Promise<boolean>
```

---

## 14. Tooltips et microcopy

Liste exhaustive des textes d'aide (prête pour i18n). Format : `key = FR`.

### Top bar
```
top.gold                    = Or total
top.gold.hover              = Or total. Vous en gagnez {rate}/s. Au palier {next}, {bonus}.
top.gems                    = Gemmes
top.gems.hover              = Gemmes — droppées par les boss. Servent aux fusions spéciales et au prestige.
top.soul                    = Fragments d'âme
top.soul.hover              = Fragments d'âme — gagnés au prestige. Servent à acheter des bonus permanents.
top.wave                    = Vague actuelle / max
top.wave.hover              = Vague {current} / record {max}. Prochain boss : vague {nextBoss}.
top.wave.recordNew          = Nouveau record !
top.goldPerSec              = Or par seconde
top.goldPerSec.hover        = Moyenne glissante 30 s. Max session : {peak}/s.
top.time.session            = Temps de session
top.time.sinceLastPrestige  = Temps depuis le dernier prestige
top.playerLevel             = Niveau du joueur
top.playerLevel.hover       = Somme des niveaux d'unités × (1 + max_grade × 0.1).
top.menu                    = Menu (options, sauvegarde, à propos)
```

### Team cards
```
team.hp                     = Points de vie
team.xp                     = Expérience vers le prochain niveau
team.xp.max                 = Niveau maximum atteint dans ce grade (fusionner pour progresser)
team.atk                    = Dégâts par coup
team.atkSpeed               = Intervalle entre deux attaques, en secondes
team.dps                    = Dégâts par seconde (mesure live via télémétrie)
team.kills                  = Kills ce combat
team.target.closest         = Cible l'ennemi le plus proche
team.target.frontPriority   = Cible en priorité la ligne avant ennemie
team.target.lowestHp        = Cible l'ennemi avec le moins de HP
team.class.warrior          = Guerrier — tank mêlée, ligne avant
team.class.archer           = Archer — DPS distance, ligne arrière
team.class.mage             = Mage — dégâts de zone, ligne arrière
team.class.healer           = Soigneur — support, ligne arrière
team.death.respawn          = Respawn dans {seconds}s
team.rosterOpen             = Ouvrir le roster complet (R)
```

### Enemy column
```
enemy.threat.low            = Menace faible
enemy.threat.medium         = Menace moyenne
enemy.threat.high           = Menace élevée
enemy.threat.extreme        = Menace extrême — risque de wipe
enemy.difficulty.green      = Équipe nettement au-dessus — combat rapide
enemy.difficulty.yellow     = Combat tendu — pertes possibles
enemy.difficulty.red        = Risque de wipe — envisager de grind avant
enemy.nextWave              = Apparaît dans {seconds}s au rythme actuel
enemy.nextBoss              = Boss prévu vague {wave}
enemy.rewardAnticipated     = Récompense attendue
enemy.bestiaryOpen          = Ouvrir le bestiaire (B)
```

### Actions
```
actions.recruit             = Recruter un {class}. Coût {cost}◆.
actions.recruit.cantAfford  = Il vous manque {missing}◆
actions.upgrade             = Améliorer la sélection. Coût {cost}◆.
actions.fuse                = Fusionner 3 unités de même grade en 1 du grade supérieur.
actions.fuse.noTrio         = Aucun trio fusable. Recrutez ou montez vos unités en grade.
actions.fuse.confirm        = Fuser 3× {grade} → 1× {nextGrade} ? L'XP accumulée est perdue.
actions.prestige            = Prestige — reset complet contre des fragments d'âme.
actions.prestige.unavailable= Prestige disponible à partir de la vague {minWave}.
```

### Modals
```
modal.close                 = Fermer (Échap)
modal.roster.title          = Roster — {count} unités
modal.roster.autoFuse       = Fusionner automatiquement tous les trios fusables
modal.roster.emptySlot      = Emplacement libre — glissez une unité ici
modal.stats.title           = Statistiques détaillées
modal.stats.export          = Exporter en JSON
modal.bestiary.title        = Bestiaire — {seen}/{total} rencontrés
modal.bestiary.notSeen      = Monstre jamais rencontré
modal.achievements.title    = Succès
modal.achievements.progress = Progression : {current}/{total}
modal.prestige.title        = Prestige
modal.prestige.gain         = Vous gagnerez {fragments} fragments d'âme
modal.prestige.lost         = Vous perdrez : {list}
modal.prestige.kept         = Vous conserverez : {list}
modal.prestige.confirm      = Maintenez le bouton pour confirmer le prestige
```

### Événements (format de la timeline)
```
event.unit_levelup          = {unitName} monte L{newLevel}
event.unit_died             = {unitName} tombé
event.wave_ended.victory    = Vague {wave} gagnée · +{gold}◆{gemsOpt}
event.wave_ended.defeat     = Vague {wave} perdue
event.biome_change          = Biome → {biomeName}
event.boss_spawned          = Boss {bossName} apparaît
event.unit_fused            = Fusion : 3×{oldGrade} → 1×{newGrade}
event.achievement           = Succès débloqué : {name}
event.record                = Nouveau record : vague {wave}
event.recruit               = {class} recruté · coût {cost}◆
event.combo                 = Combo x{count}
```

### Options
```
options.uiSize              = Taille de l'interface
options.uiSize.compact      = Compacte
options.uiSize.normal       = Normale
options.uiSize.large        = Grande
options.reduceMotion        = Réduction des animations
options.numberFormat        = Format des nombres
options.numberFormat.compact= Compact (1.2K)
options.numberFormat.full   = Complet (1 200)
options.autoFuse            = Fusion automatique
options.confirmPrestige     = Confirmation du prestige
options.save                = Sauvegarde manuelle
options.reset               = Réinitialiser la partie
```

---

## 15. Pièges à éviter

10 erreurs classiques des UI d'idle games qu'on **doit** éviter sur ce projet :

1. **Overload d'information à froid.** Tout jeter à l'écran dès le lancement → paralysie. Solution : révéler par palier. Le fragment d'âme reste masqué jusqu'au premier prestige. Le bestiaire entier n'apparaît qu'après la première rencontre. Le pet/mascot UI est débloqué au premier milestone.

2. **Animations qui distraient du combat.** La sparkline qui flash plein écran, le timeline qui explose, les floating +1 qui remplissent la moitié du viewport. Règle : **aucune animation périphérique ne doit être plus intense que la plus intense du combat central**. Le focus visuel appartient au cœur du jeu.

3. **Modales qui pausent inutilement.** Un roster modal qui gèle tout → frustrant quand on cherche juste à checker ses stats. Sauf cas absolument nécessaire (Prestige), **les modales laissent le combat tourner**.

4. **Boutons trop petits pour le clic.** Règle : **minimum 44×44 px** de surface cliquable, même si le visuel est plus petit. La grille d'actions respecte ça. Les boutons secondaires dans les modales aussi.

5. **Manque de feedback au clic.** Un clic sans réaction visuelle = le joueur re-clique trois fois. Règle : **chaque click a un retour immédiat** (< 100 ms) — color flash, scale pulse, sound (future).

6. **Chiffres qui sautent brutalement.** 147 → 0 → 147 → 283 sans transition. Le cerveau ne suit pas. Tout chiffre s'interpole sur au moins 200 ms.

7. **Historique d'événements qui auto-scroll quand je lis.** Classique du fail. Solution : **pause du scroll automatique au hover**, reprise 2 s après le `mouseleave`.

8. **Hit indication sur HP bar sans lag bar.** La barre descend direct → le joueur ne voit pas *combien* il a perdu. Le lag bar résout ça gratuitement.

9. **Modale qui recouvre la zone de combat sans indiquer qu'on peut quand même cliquer dessus.** Le backdrop doit soit être semi-transparent assez pour voir le combat, soit afficher un mini-preview du combat dans un coin.

10. **Pas de promesse visible quand on approche d'un cap.** L'unité est à L10 — qu'est-ce qui se passe ensuite ? Si rien n'indique la fusion, le joueur ne sait pas. Toujours afficher le "next step" même quand c'est bloqué (ex : "L10 max — fusionne 3 pour passer en Soldat").

---

## 16. Checklist de validation

10 critères concrets, mesurables, dont 3 auto-vérifiables via `TelemetrySystem`.

| # | Critère | Vérification | Auto ? |
|---|---|---|---|
| 1 | **Le joueur peut identifier sa ressource la plus rare en moins d'une seconde** | Test manuel sur 3 personnes : "quelle est ta ressource la plus rare ?" et chronomètre la réponse | Non |
| 2 | **Tout changement de chiffre à l'écran est animé** (pas de jump cut) | Revue visuelle + audit code : grep `setText` sans tween → manuel | Partiel |
| 3 | **Aucun panneau ne dépasse 3 niveaux de hiérarchie visuelle** | Revue des composants : pour chaque carte/panel, compter les tailles de texte distinctes (≤ 3) | Non |
| 4 | **60 fps stables en session type** (1 combat actif + floating damage + sparkline) | `game.loop.actualFps` exposé dans un debug overlay, mesure sur 30 s | **Oui** |
| 5 | **L'interface reste jouable à 1024×768** | Test de redimensionnement, vérif qu'aucun élément critique n'est coupé | Non |
| 6 | **Tous les textes importants passent un contraste ≥ 4.5:1** | Audit Lighthouse ou axe DevTools sur les panels principaux | Non |
| 7 | **Aucune modale ne prend plus de 500 ms à s'ouvrir** | Benchmark via `performance.now()` dans le code d'ouverture | **Oui** |
| 8 | **Le joueur peut atteindre la vague 10 sans ouvrir une modale** | Test gameplay — on peut jouer à 100 % depuis l'UI persistante | Non |
| 9 | **Un changement d'HP est toujours lisible** (le joueur voit de combien il a perdu) | Revue des lag bars + tests manuels avec gros hits | Partiel |
| 10 | **95 % des combats durent entre 1.5 et 12 s** (courbe saine) | `TelemetrySystem.getAggregates().avgDurationByWave` + distribution | **Oui** |

---

## 17. Extensions proposées (hors GAME_DESIGN actuel)

Éléments qui ne figurent pas explicitement dans `GAME_DESIGN.md` mais dont l'UI a besoin. **Clairement flaggés comme propositions**.

### `RosterSystem` (proposition)

Store singleton qui liste toutes les unités possédées (au-delà de l'équipe active). Utilisé par la modale Roster, la fusion, le recruit. Operations : `add / remove / fuse / getAll / getActive`. Événements : `added, removed, fused, activeChanged`. Sérialisable pour le `SaveSystem`.

### `BestiarySystem` (proposition)

Agrège les `unit_died` télémétrie par classe de monstre pour construire le bestiaire. Stocke : total vu, total tué, meilleur temps de kill, récompenses maximales.

### `AchievementSystem` (proposition)

Table de prédicats indexés par événement télémétrie. À chaque event `TelemetrySystem`, le système évalue les prédicats concernés et débloque les achievements complétés. Interface : `register(id, predicate, reward)`, `getUnlocked()`, `getProgress(id)`.

### `PrestigeSystem` (proposition)

Gère le catalogue de bonus permanents, calcule les fragments à gagner au prestige, applique les bonus aux stats au boot. Interface : `computeFragmentsAt(wave)`, `applyBonuses()`, `prestige()`.

### `TelemetryBroadcast` (proposition mineure)

Extension de `TelemetrySystem` qui expose un `on(type, cb)` global — pas seulement le stockage interne. L'`EventLog` et l'`AchievementSystem` en ont besoin.

### `RecruitSystem` (proposition)

Bouton et logique de recrutement. Coût en or, génère une unité grade 1 level 1 d'une classe donnée. Alimente le `RosterSystem`. Exposé via une méthode `canRecruit(class)` + `recruit(class)`.

### Buffs/debuffs temporaires (proposition)

Les unit cards prévoient un emplacement pour des buffs/debuffs visuels, mais le game design n'en mentionne pas explicitement. Ce serait à introduire par les drafts tactiques du `GAME_FEEL_PLAN.md` (étapes 7-8 de la roadmap feel) ou par le contenu (items, enchantements).

### Sprites animés dans UnitCard (proposition technique)

Sprite animé côté DOM requiert soit un sprite sheet CSS (`animation: steps(2)`) soit un mini-canvas Phaser. Proposition : **CSS sprite sheet**, plus simple et ne duplique pas Phaser. Exige juste d'exporter les frames d'idle animation en PNG sheet dans `assets/sprites/`.

---

## Annexe — microcopy de démarrage

Pour le premier lancement, un petit texte explicatif à côté de chaque zone (hideable au premier clic, stocké en localStorage) :

- **Top bar** : "Vos ressources. L'or tombe à chaque kill. Les gemmes via les boss. Les fragments d'âme quand vous prestigerez."
- **Left col** : "Votre équipe active. Jusqu'à 6 unités. Chaque unité monte en niveau (L1 à L10) puis fusionne vers un grade supérieur."
- **Right col** : "L'ennemi du moment et ce qui vient. Anticipez les boss et les changements de biome."
- **Bottom actions** : "Vos actions du moment. Recrutez pour grossir le roster, fusez pour monter en grade, prestigez quand vous bloquez."
- **Bottom timeline** : "Tout ce qui vient de se passer. Cliquez pour les détails."

---

Fin du document.
