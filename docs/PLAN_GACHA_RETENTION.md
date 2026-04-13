# Plan d'évolution — Gacha, Invocations et Rétention

## Vue d'ensemble

Transformer le jeu d'un auto-battler technique en une **expérience addictive** avec :
- Un système d'**invocation de héros** (gacha style Genshin)
- Des **coffres d'items** par biome
- Un **daily login** avec récompenses croissantes
- Des **missions** journalières et hebdomadaires
- Un **pokédex** de collection de héros

---

## 1. SYSTÈME D'INVOCATION DE HÉROS (GACHA)

### Concept

Le joueur dépense des **gemmes** pour invoquer des héros. Chaque héros est une version **améliorée** d'une classe existante (warrior, archer, mage, healer) avec un design unique, des stats bonus, et parfois un passif spécial.

Les héros invoqués **remplacent** les unités de base — un SSR Guerrier "Paladin Céleste" est directement meilleur qu'une Recrue.

### Raretés

| Rareté | Couleur | Taux single | Mult stats vs base | Passif spécial |
|---|---|---|---|---|
| R (Rare) | Bleu `#3b82f6` | 70% | ×1.2 | Non |
| SR (Super Rare) | Violet `#a855f7` | 20% | ×1.5 | Non |
| SSR (Super Super Rare) | Doré `#fbbf24` | 8% | ×2.0 | Oui (1 passif) |
| UR (Ultra Rare) | Rouge-orange `#ef4444` | 2% | ×3.0 | Oui (2 passifs) |

### Coûts

- **Single pull** : 5 gemmes
- **Multi-pull ×10** : 50 gemmes (garanti au moins 1 SR+)
- Le joueur gagne ~1 gemme/boss → environ 10 gemmes par biome complet

### Pity system (compteur visible)

- **Compteur SSR** : après 50 pulls sans SSR → la 51ème est SSR garanti
- **Compteur UR** : après 100 pulls sans UR → la 101ème est UR garanti
- Le compteur est **visible** dans l'écran d'invocation ("Pity SSR : 34/50")
- Le compteur se reset quand on obtient la rareté correspondante

### Pool de héros (à créer — ~20 héros au lancement)

**WARRIORS (5)** :
| Nom | Rareté | Passif |
|---|---|---|
| Garde Royal | R | — |
| Centurion | R | — |
| Chevalier Noir | SR | — |
| Paladin Céleste | SSR | +20% HP alliés à proximité |
| Dieu de la Guerre | UR | Invincible 2s quand HP <10%, Taunt permanent |

**ARCHERS (5)** :
| Nom | Rareté | Passif |
|---|---|---|
| Chasseur | R | — |
| Éclaireur | R | — |
| Ranger d'Élite | SR | — |
| Tireur d'Élite | SSR | Ignore 30% armure, +50px portée |
| Artémis | UR | Triple tir par défaut, +100% crit dmg |

**MAGES (5)** :
| Nom | Rareté | Passif |
|---|---|---|
| Apprenti Mystique | R | — |
| Pyromancien | R | — |
| Archimage | SR | — |
| Seigneur des Éléments | SSR | AoE brûle + gèle en alternance |
| Merlin | UR | Ultime charge 2× plus vite, AoE ×5 |

**HEALERS (5)** :
| Nom | Rareté | Passif |
|---|---|---|
| Acolyte Sacré | R | — |
| Druide | R | — |
| Prêtresse | SR | — |
| Ange Gardien | SSR | Revit 1 allié/combat, overheal → shield |
| Déesse de la Vie | UR | Heal = aussi dégâts, résurrection infinie |

### Animation d'invocation (style Genshin)

1. Écran s'assombrit → ciel étoilé
2. Étoile filante descend (couleur = rareté)
   - Bleue = R (rapide, sobre)
   - Violette = SR (légers effets)
   - Dorée = SSR (explosion de lumière, shake écran)
   - Rouge = UR (tremblement, éclairs, musique épique, lenteur dramatique)
3. Le héros apparaît au centre avec son nom + rareté
4. Stats affichées
5. Bouton "OK" → retour

Pour le multi-pull ×10 : les 10 tirages s'enchaînent rapidement, le dernier est toujours le meilleur (SR+ garanti), avec une pause dramatique dessus.

### Écran d'invocation

Accessible depuis le **menu principal** (nouveau bouton "INVOCATION").

```
┌────────────────────────────────────────────────────────┐
│  INVOCATION                                            │
│                                                        │
│  [artwork du héros featured]                           │
│                                                        │
│  Banner actuel : "Héros de Feu"                       │
│  Héros en avant : Seigneur des Éléments (SSR)         │
│  Taux up : 4% (normal 2%)                             │
│                                                        │
│  Pity SSR : 34/50    Pity UR : 78/100                 │
│                                                        │
│  [Single ×1 — 5◇]    [Multi ×10 — 50◇ (1 SR+ garanti)]│
│                                                        │
│  Gemmes : 127 ◇                                       │
└────────────────────────────────────────────────────────┘
```

---

## 2. COFFRES D'ITEMS PAR BIOME

### Concept

Des coffres achetables avec des gemmes qui droppent des items spécifiques à un biome. Permet de cibler le set qu'on veut compléter.

### Types de coffres

| Coffre | Contenu | Prix | Garanti |
|---|---|---|---|
| Coffre Forêt | Items set Forêt | 3 gemmes | 1 item Commun+ |
| Coffre Grottes | Items set Grottes | 3 gemmes | 1 item Commun+ |
| Coffre Ruines | Items set Ruines | 5 gemmes | 1 item Peu commun+ |
| Coffre Enfer | Items set Enfer | 5 gemmes | 1 item Peu commun+ |
| Coffre Neige | Items set Neige | 8 gemmes | 1 item Rare+ |
| Coffre Temple | Items set Temple | 8 gemmes | 1 item Rare+ |

### Animation d'ouverture

1. Le coffre apparaît (design pixel art par biome)
2. Le coffre tremble → s'ouvre → lumière (couleur = rareté)
3. L'item sort et flotte avec ses stats
4. Bouton "OK"

---

## 3. LOGIN QUOTIDIEN (DAILY REWARDS)

### Concept

Chaque jour de connexion consécutive donne une récompense croissante. Le compteur reset si on rate un jour.

### Grille de récompenses (cycle 30 jours)

| Jour | Récompense |
|---|---|
| 1 | 50 or |
| 2 | 100 or |
| 3 | 1 gemme |
| 4 | 200 or |
| 5 | 2 gemmes |
| 6 | 300 or |
| 7 | **5 gemmes + 1 coffre aléatoire** |
| 8-13 | Cycle similaire (or + gemmes croissants) |
| 14 | **10 gemmes + 1 coffre rare** |
| 21 | **15 gemmes** |
| 28 | **1 invocation gratuite** |
| 30 | **1 invocation SSR garantie** |

### UI

Pop-up au login montrant le calendrier du mois avec les récompenses. Le jour courant est mis en avant avec un bouton "RÉCLAMER". Les jours passés sont cochés.

---

## 4. MISSIONS JOURNALIÈRES ET HEBDOMADAIRES

### Missions quotidiennes (3 par jour, reset à minuit)

Exemples :
- "Tue 50 monstres" → 50 or
- "Gagne 3 combats de biome" → 1 gemme
- "Complète 1 étage de donjon" → 100 or
- "Forge 1 item" → 1 gemme
- "Recrute 1 unité" → 50 or
- "Utilise 3 ultimes" → 100 or

**Bonus complétion** : finir les 3 missions du jour → **3 gemmes bonus**.

### Missions hebdomadaires (5 par semaine, reset lundi)

Exemples :
- "Atteins la wave 30 en aventure" → 10 gemmes
- "Complète le donjon Crypte" → 15 gemmes
- "Fusionne 3 unités" → 5 gemmes
- "Collecte 10 items" → 1 coffre gratuit
- "Connecte-toi 5 jours cette semaine" → 10 gemmes

**Bonus complétion** : finir les 5 missions → **1 invocation gratuite**.

### UI

Accessible depuis le menu principal (icône "!" avec badge compteur de missions dispo). Liste scrollable avec barres de progression.

---

## 5. COLLECTION / POKÉDEX DE HÉROS

### Concept

Un écran "Collection" qui montre TOUS les héros du jeu, même ceux qu'on n'a pas. Les non-obtenus sont en silhouette sombre. Obtenir un héros débloque sa fiche complète (lore, stats, artwork).

### Bonus de collection

Compléter des "sets" de collection donne des bonus permanents :
- Obtenir tous les R → +5% or permanent
- Obtenir tous les SR → +5% XP permanent
- Obtenir tous les SSR → +10% ATK permanent
- Obtenir tous les UR → titre "Collectionneur Ultime" + skin dorée pour l'UI

### UI

Grille de portraits (4 colonnes). Silhouette noire = non obtenu. Coloré = obtenu. Halo doré = UR. Clic = fiche détaillée avec lore, stats, et comparaison avec la classe de base.

---

## 6. PLAN D'IMPLÉMENTATION

### Phase 1 — Gacha core (2-3 jours)
- `src/data/heroes.js` — pool de 20 héros avec stats/passifs
- `src/systems/GachaSystem.js` — pull logic, pity, rates
- `src/ui/SummonScreen.js` — écran d'invocation avec animation
- `src/ui/SummonAnimation.js` — la cinématique de reveal (étoile filante, flash rareté)
- Intégration dans le MenuScreen
- Héros invoques → remplacent les unités dans le roster

### Phase 2 — Coffres d'items (1 jour)
- Extension de ItemSystem pour les coffres
- `src/ui/ChestScreen.js` — boutique de coffres
- Animation d'ouverture de coffre

### Phase 3 — Daily login (1 jour)
- `src/systems/DailySystem.js` — track jours consécutifs, récompenses
- `src/ui/DailyRewardPopup.js` — calendrier popup au login
- Intégration dans le boot flow (après login → check daily)

### Phase 4 — Missions (2 jours)
- `src/systems/MissionSystem.js` — quêtes journalières/hebdo, prédicats, progression
- `src/ui/MissionPanel.js` — liste de missions avec barres de progression
- Hooks dans CombatSystem, ItemSystem, FusionSystem pour tracker la progression

### Phase 5 — Collection (1 jour)
- `src/ui/CollectionScreen.js` — grille de héros, fiches détaillées
- Bonus de collection dans PrestigeSystem ou un nouveau CollectionSystem

### Total estimé : ~7-8 jours de dev

### Priorité recommandée

1. **Gacha** (le cœur de l'attraction — l'excitement des pulls)
2. **Daily login** (le hook quotidien — revenir chaque jour)
3. **Missions** (les objectifs à court terme — toujours quelque chose à faire)
4. **Coffres** (le loot ciblé — compléter ses sets)
5. **Collection** (l'objectif long terme — tout débloquer)

---

## 7. ÉCONOMIE RÉVISÉE

Avec le gacha, les gemmes deviennent la **monnaie centrale** du jeu. L'économie doit être calibrée :

| Source de gemmes | Gemmes/jour estimé |
|---|---|
| Boss de biome (1/boss) | ~2/jour |
| Donjon (completion) | ~3/jour |
| Missions quotidiennes | ~4/jour (3 missions + bonus) |
| Missions hebdo (moyenné/jour) | ~5/jour |
| Daily login (moyenné) | ~2/jour |
| **Total** | **~16 gemmes/jour** |

| Dépense | Coût |
|---|---|
| Single pull | 5 gemmes |
| Multi-pull ×10 | 50 gemmes (~3 jours de farming) |
| Coffre biome | 3-8 gemmes |
| Reset talents | 5 gemmes |

Un multi-pull demande ~3 jours de jeu actif. C'est **accessible mais pas trivial** — le joueur a une raison de revenir chaque jour.
