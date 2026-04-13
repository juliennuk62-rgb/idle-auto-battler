# Plan de game feel et dynamisme — auto-battler idle

## Philosophie — les 4 piliers

Un auto-battler idle est un jeu où le joueur **regarde** plus qu'il ne joue. Le plaisir ne vient donc pas de la difficulté d'exécution mais de la qualité du spectacle et de la promesse constante d'une prochaine étape. Tout notre design de polish s'appuie sur quatre piliers que l'on doit pouvoir citer à n'importe quel moment de la session :

1. **Impact** — chaque action significative se *ressent*. Un coup sec, une mort "rituelle", un levelup célébré.
2. **Anticipation** — le joueur voit arriver les choses importantes quelques instants avant qu'elles ne frappent. La tension naît de l'attente.
3. **Variété** — casser la prévisibilité à toutes les échelles temporelles : dans la seconde (variance), dans la minute (event), dans l'heure (biome), dans la semaine (daily).
4. **Promesse** — l'écran ne doit jamais être "vide de carottes". Toujours visible : le prochain grade, le prochain biome, le prochain achievement, le prochain boss.

Un avantage non-négligeable : on a déjà un **`TelemetrySystem`** complet. On s'en sert pour **valider objectivement** que le polish paie — DPS, durée, taux de survie, avg combat duration sont mesurables et comparables avant/après chaque session de tuning.

---

## Axe 1 — Game feel moment-à-moment

### Tableau principal

Tri libre, regrouper par ordre du brief. Le tableau Quick-Wins en bas de doc re-trie par ratio impact/effort.

| # | Technique | Ce que c'est | Effet psychologique | Complexité | ROI | Jeu de référence |
|---|---|---|---|---|---|---|
| 1 | **Screen shake** | Vibration rapide de la caméra sur les gros impacts (`cameras.main.shake(ms, intensity)`). | Convertit l'impact visuel en sensation quasi-tactile. "Ça cogne vraiment." | Faible | Énorme | Nuclear Throne, Vampire Survivors |
| 2 | **Hit stop / freeze frame** | Gel de 30-80 ms au moment pile de l'impact (timer pause global). | Isole le moment critique. Le joueur ressent la "résistance" du coup. **LE hack le plus sous-exploité du game feel.** | Faible | Énorme | Dead Cells, Hades, Smash Bros |
| 3 | **Flash blanc à l'impact** | La cible devient pleinement blanche pendant 2-3 frames (`setTintFill(0xffffff)`). | Marquage "touché" instantané + impression de choc lumineux. | Faible | Élevé | Pokémon, Castle Crashers |
| 4 | **Knockback visuel** | La cible recule de quelques pixels puis revient en place via tween yoyo. | Conservation du momentum. Un coup "pousse" vraiment. | Faible | Élevé | Castlevania, Dead Cells |
| 5 | **Dégâts flottants animés** | Nombre qui pop au-dessus de la cible, scale-up puis fade-out avec easing (pool de Text). | Feedback numérique immédiat. **Indispensable absolu** dans un idle — c'est la lecture principale de l'efficacité. | Moyenne | Énorme | Diablo, Idle Heroes, Vampire Survivors |
| 6 | **Particules d'impact** | Petits éclats colorés qui jaillissent radialement à l'impact (Phaser `ParticleEmitter`). | Explosion visuelle de l'énergie cinétique. | Moyenne | Élevé | Hades, Soul Knight |
| 7 | **Courbes d'animation (easing)** | Remplacer `linear` par `Back.Out`, `Quad.Out`, `Cubic.InOut` sur tous les tweens existants. | Tout mouvement a du poids. Différence entre "jeu amateur" et "jeu pro". | Faible | Énorme | Slay the Spire, Celeste |
| 8 | **Camera zoom dynamique** | Léger zoom-in (×1.02-1.05) sur les moments importants (boss, crit, levelup), retour doux. | Emphase sans casser le rythme. "Camera breathes". À doser. | Faible | Moyen | Celeste, Hollow Knight |
| 9 | **Ralenti sur coups critiques** | Dilatation du temps (0.2-0.5 s) uniquement sur les crits (`scene.time.timeScale = 0.3`). | "Il s'est passé un truc spécial." Rare et précieux. | Faible | Élevé (crit only) | Max Payne, Dead Cells |
| 10 | **Effets de mort exagérés** | Animation de mort > 500 ms : scale-down + rotate + shatter particles + flash + fade long. | Chaque mort est *célébrée*. **Probablement LE critère numéro un pour un auto-battler où le joueur regarde.** | Moyenne | Énorme | Vampire Survivors, Soul Knight |
| 11 | **Anticipation + follow-through** | Avant d'attaquer, l'unité se compresse/recule (wind-up). Après, elle "dépasse" sa pose de repos avant de revenir. | Chaque coup devient un rythme à 3 temps au lieu d'un switch binaire. Principe Disney #2. | Moyenne | Élevé | Tous les jeux Blizzard, Dead Cells |
| 12 | **Hooks audio (sans son encore)** | Stubs `AudioSystem.play('hit_light')` aux points clés, fonction vide pour l'instant. | Zéro dette technique le jour où on rajoute le son. | Faible | Indirect mais critique | N/A (pratique de dev) |
| 13 | **Squash & stretch** *(bonus)* | Le sprite se compresse verticalement au wind-up, s'étire à l'impact, retour. Tween scaleX/scaleY. | Principe d'animation Disney #1. Donne un effet "caoutchouc" vivant, même avec 2 frames de sprite. | Faible | Élevé | Rayman, Celeste, Mario Odyssey |
| 14 | **Impact frames** *(bonus)* | Sur les gros coups, la cible est remplacée 1-2 frames par une silhouette pleine couleur (pipeline custom ou swap sprite pré-tinté). | Impact "absolu", beaucoup plus punchy qu'un simple tint. | Moyenne | Élevé | Dead Cells, Hyper Light Drifter, Hollow Knight |
| 15 | **Chain reactions visibles** *(bonus)* | Combo multiplier `x2`, `x3`, `x4` qui apparaît et grandit quand plusieurs kills s'enchaînent en < 2 s. | Sensation de "ça roule". Récompense visible de la durée de combat. | Moyenne | Élevé | Devil May Cry, Bayonetta, Hades |
| 16 | **Damage variance ±5%** *(bonus)* | Chaque hit multiplié par `random(0.95, 1.05)`. Une ligne de code. | Casse la répétition visuelle des floating damage sans changer la balance perçue. | Triviale | Moyen | Diablo, RuneScape |

### Hiérarchisation des effets combinés

Règle d'or : **ne jamais empiler les 16 effets sur un même hit**. Hiérarchiser :

- **Hit normal** : flash blanc (court) + knockback léger + dégât flottant. C'est tout.
- **Kill d'un monstre normal** : + particules + squash&stretch exagéré + screen shake très léger (50 ms, 0.002).
- **Coup critique** : + ralenti 0.25 s + hit stop 60 ms + dégât flottant jaune plus gros.
- **Kill d'un boss** : tout ce qui précède + zoom camera + particules dorées + fade long > 800 ms + bandeau "VICTORY" + éventuel freeze plein écran 150 ms.
- **Levelup d'unité** : anneau de particules qui monte + flash vertical + zoom léger + dégât flottant vert "+1".

Si on rate ce dosage, on obtient du *visual noise* qui fatigue en 5 min et qu'on ne peut plus retirer parce que "ça fait vide sans".

---

## Axe 2 — Dynamisme du gameplay (boucle moyenne)

### 2.1 Événements aléatoires pendant les vagues

Tous les types d'events partagent la même règle : **préavis visuel ≥ 1 s** avant qu'ils ne s'activent. Le joueur doit les voir arriver pour ressentir l'anticipation.

| Event | Déclenchement | Effet | Code / Contenu | Étape roadmap |
|---|---|---|---|---|
| **Boss surprise** | Random 5% de chance par vague à partir de la vague 8 | Remplace le monstre de la vague par un mini-boss renforcé avec drop bonus | [code] manager d'event + [contenu] sprites boss | 3-4 |
| **Vague d'élite** | Toutes les 7-13 vagues (random dans fenêtre) | 5 monstres renforcés au lieu d'un monstre classique | [contenu] variant mobs | 3 |
| **Pluie d'or** | Random 3% par vague à partir de la vague 15 | +30 % or pour 3 vagues, shower de particules dorées en fond | [code+contenu] | 5 (quand l'or existe) |
| **Malédiction** | Random 5% par vague à partir de la vague 20 | Buff ennemi temporaire (+20 % HP, +10 % vitesse), gros bonus à la clé | [code] modifier system | 3-4 |
| **Sanctuaire** | 1 par biome (tous les 10 vagues) | Vague "safe" où l'équipe régénère à fond + petite mini-cinématique | [contenu] + [code] | 5-6 |

### 2.2 Objectifs courts

Cycle 5-15 min, renouvelés automatiquement. Récompense légère mais visible.

- **Contrats rapides** : slots de 2-3 objectifs actifs en permanence, visibles en bas d'écran.
- **Exemples de templates** :
  - "Tue 50 gobelins"
  - "Atteins la vague 30 sans perdre d'unité"
  - "Gagne 5 combats en moins de 2 s chacun"
  - "Fusionne 3 unités dans la même session"
  - "Inflige 10 000 dégâts avec des archers"
- **Récompense** : 50-500 or selon le niveau, petit pop UI.
- **Référence** : Vampire Survivors a des "achievements" qui font exactement ça.
- **Code nécessaire** : tracker générique d'objectifs (prédicat + counter + hook TelemetrySystem). Étape 5-6.
- **Contenu** : liste de templates dans `objectives.json`.

### 2.3 Drafts tactiques périodiques

**Toutes les 10 vagues**, mini-pause (~3 s auto-dismissable) : choix entre 3 cartes-buff.

- Cartes temporaires (durée 5-10 vagues) : "Double dégâts archers", "Tous les guerriers ont +20 % HP", "Crit chance +10 % pour tous".
- Cartes permanentes rares : "Tu commences chaque run avec un guerrier Vétéran", "+1 slot d'équipe".
- **3 choix affichés, le joueur peut skip** (bouton discret) pour rester 100 % passif s'il le souhaite. La règle "idle" est préservée.
- **Code** : Drafter module + UI de cards. Étape 7-8.
- **Référence** : Slay the Spire (card draft), Vampire Survivors (level-up cards), Hades (boons d'Olympien).

**Pourquoi c'est crucial** : c'est le seul point où le joueur redevient *acteur* dans le gameplay de base. Sans ça, un idle devient vite du "regarde les barres diminuer". Les drafts créent un *sentiment d'auteur* de la run.

### 2.4 Pics de difficulté lisibles

Rythme = survie psychologique d'un idle. Structure à 3 niveaux :

- **Mini-boss** : vagues 3, 6, 9, 12, 15... Monstre 3× HP, drop garanti d'un item.
- **Boss** : vagues 5, 10, 15, 20... Monstre unique avec sprite spécifique, 10× HP, barre de vie énorme.
- **Mega-boss** : vagues 25, 50, 75, 100. Boss multi-phase avec annonce cinématique (fade noir + nom qui s'affiche).
- **Fin de biome** : vague 10 × biomeIndex, mega-boss ET transition visuelle vers le biome suivant.

**Annonce** : bandeau "WAVE X — BOSS" qui slide depuis le haut 1.5 s avant le combat, s'estompe pendant le combat, revient en "VICTORY" ou "DEFEAT" à la fin.

- **Code** : [code] logique de scaling wave + bandeau UI. Étape 3.
- **Contenu** : sprites boss + mega-boss. Étape 4+.

### 2.5 Variété visuelle

Changement de biome **tous les 10 niveaux** — absolument critique pour que le joueur ne se lasse pas après 15 min.

| Biome | Vagues | Palette dominante | Météo | Mobs |
|---|---|---|---|---|
| Forêt | 1-10 | Verts, bruns | Feuilles | Gobelins, loups, sangliers |
| Grottes | 11-20 | Gris, bleus | Gouttes d'eau | Chauves-souris, trolls, slimes |
| Ruines | 21-30 | Sable, or | Vent de sable | Squelettes, momies, sphinx |
| Enfer | 31-40 | Rouges, noirs | Cendres | Démons, imps, balrogs |
| Neige | 41-50 | Blancs, cyans | Flocons | Yétis, ours, mages de glace |
| Temple | 51+ | Violets, or | Brouillard | Bouddhas, gardiens, dragons |

**Météo** : cosmétique pure, via particles en overlay. Doit être **légère** pour ne pas gêner la lecture.

- **Code** : système de biome manager + swap background + palette runtime (tint). Étape 3-4.
- **Contenu** : 6 backgrounds + palettes + variants mobs. Contenu massif mais incrémental.

**Référence** : Brotato, Vampire Survivors (changement de stage), tous les idle modernes.

### 2.6 Synergies visibles entre unités

Système à activer automatiquement quand des conditions sont réunies, avec **feedback visuel obligatoire**.

- **Formation** : archer derrière guerrier → aura bleue partagée + marker "FORMATION" au-dessus + bonus précision +15 %.
- **Même classe** : 3 guerriers adjacents → bannière "BROTHERHOOD" + stat boost 10 %.
- **Même grade** : 2 unités de grade ≥ 3 → halo doré + crit chance +5 %.
- **Opposition saine** : mage à droite + tank à gauche → ligne d'énergie qui les relie + réduction dégâts mage -30 %.

Règle : chaque synergie = **effet visuel clair** (aura, bannière, particles, ligne). Si le joueur ne voit pas la synergie, elle n'existe pas.

- **Code** : SynergySystem qui scan les positions/classes/grades à chaque changement d'équipe. Étape 7.
- **Référence** : Teamfight Tactics (auras de synergie), Hero Wars.

---

## Axe 3 — Rétention long terme (la boucle longue)

### 3.1 Notifications visuelles de progression hors-ligne

Écran de retour dédié quand le joueur relance le jeu après 5+ min d'absence.

- **Affichage** : "Pendant ton absence (2h 17) :"
- **Gains animés** : chiffres qui scrollent façon compteur, or qui tombe en particules, unités qui apparaissent en silhouette puis révélées.
- **Bouton "Tout récupérer"** qui fait exploser tout à l'écran en particules dorées. Satisfaction pure.
- **Ne jamais** donner les gains "silencieusement". Toujours célébrer.

- **Code** : écran dédié `OfflineRewardScene`. Étape 8 (dépend save + offline prog déjà prévus dans roadmap).
- **Référence** : Cookie Clicker, AFK Arena, NGU Idle, Idle Heroes.

### 3.2 Système de collection — bestiaire

Écran "Bestiaire" accessible depuis le menu.

- **Monstres** : grille de vignettes, silhouette noire pour jamais vus, couleur pour rencontrés, dorés pour battus 100+ fois.
- **Unités** : même grille, par classe et grade. Chaque case débloquée donne le nom, les stats de base, un flavor text.
- **Le simple fait de voir "47 / 200"** en haut du bestiaire est un hook de rétention massif.

- **Code** : écran `CollectionScene` + tracking dans save. Étape 11-12.
- **Contenu** : flavor text + illustrations. Incrémental.
- **Référence** : Pokémon, Monster Hunter, Slay the Spire (compendium).

### 3.3 Achievements visibles

**30 achievements de base** visibles dès le début, grisés. Pop à l'écran quand débloqués.

- **Règle clé** : afficher les achievements dès le premier lancement, **même verrouillés**. La liste visible *est* la carotte.
- **Exemples tiers** :
  - Faciles : "Premier sang" (1 kill), "Recrue" (1 unité), "Survivant" (vague 10).
  - Moyens : "Armée" (6 unités), "Vétéran" (vague 50), "Riche" (100 000 or).
  - Difficiles : "Perfectionniste" (vague 50 sans mort), "Méga-prestige" (prestige 5 fois), "Complet" (bestiaire 100 %).
- **Récompense** : fragment d'âme, bonus permanent léger, titre cosmétique.

- **Code** : AchievementSystem avec prédicats branchés sur `TelemetrySystem`. Étape 5-8.
- **Référence** : Steam achievements, Binding of Isaac.

### 3.4 Événements quotidiens et hebdomadaires

- **Daily** : 3 petits défis qui rotent chaque jour à minuit local. Visibles en permanence dans un coin de l'écran.
  - "Atteins la vague 20 en 5 min"
  - "Tue 1000 ennemis aujourd'hui"
  - "Fusionne 5 unités"
- **Weekly** : 1 gros défi qui tourne chaque lundi. Récompense substantielle.
  - "Atteins la vague 100"
  - "Ne perds aucune unité sur 50 vagues consécutives"
  - "Débloque 3 achievements cette semaine"
- **Reset visible** : timer qui décompte jusqu'au prochain reset. Le simple fait de voir le timer pousse à "finir avant la fin du jour".

- **Code** : DailySystem branché sur `Date.now()` + save. Étape 8.
- **Référence** : Cookie Clicker seasons, Fortnite daily.

### 3.5 Promesse toujours visible ("next thing teased")

**Règle d'or inviolable** : *le joueur ne doit jamais se retrouver devant l'écran sans voir au moins UNE "prochaine chose" à moins de 30 min de grind.*

Cartes visibles en permanence :

- **Prochain grade** : quand on a 2/3 d'une fusion prête, afficher un slot "?" grisé avec le sprite du grade supérieur en semi-transparence.
- **Prochain biome** : icône verrouillée à droite de la wave counter avec "Débloqué vague 21".
- **Prochain achievement proche** : afficher le plus proche de l'être atteint, avec barre de progression.
- **Prochain boss** : "Boss dans 3 vagues" en haut à droite pendant les combats.

**Aucun écran, aucun moment du jeu ne doit être "vide" de promesse.** Si on ne sait pas quoi mettre, on met un countdown.

- **Code** : TeaserSystem qui agrège les "prochaines choses" et les expose à l'UI. Étape 5+.
- **Référence** : Candy Crush (carte qui se dévoile), Disco Elysium (thought cabinet), Cookie Clicker (grandmas milestones).

### 3.6 Premier prestige rapide

**La courbe doit être tunée pour que le premier prestige arrive entre 25 et 60 min de jeu inaugural**, idéalement autour de 45 min.

- Le premier prestige est un *rite de passage*. Avant lui, le joueur ne comprend pas la vraie profondeur du jeu. Après, il a un "aha !".
- **Récompense du premier prestige** : doit être substantielle et lisible. **Pas** "+1 % d'or" mais "+50 % d'or permanent" OU "déblocage de la classe Mage" OU "nouveau slot d'équipe permanent".
- Pour les prestiges suivants, la courbe peut se durcir (la règle du fast-first-reset est classique dans tous les idles bien tunés).

- **Code** : PrestigeSystem avec formule tunée. Étape 10.
- **Référence** : Adventure Capitalist (premier angel investor vite), Realm Grinder (premier reincarnation), Idle Heroes (premier tier).

---

## Roadmap priorisée — tri impact/effort

Tableau trié **par ratio impact/effort décroissant**, pas par ordre logique. L'idée : faire d'abord ce qui transforme le plus pour le moins d'effort, même si ça enfreint l'ordre "propre" de la roadmap d'origine.

Légende effort : **S** = < 1 h, **M** = 1-4 h, **L** = demi-journée+.
Légende impact : **★ à ★★★★★**.

| # | Item | Effort | Impact | Ratio | Étape roadmap rattachée |
|---|---|---|---|---|---|
| 1 | Easing `Back.Out` / `Quad.Out` sur tous les tweens existants (attaque, mort, respawn) | S | ★★★★★ | Max | 1 (rétrofit) |
| 2 | Hit stop 60 ms sur tout coup qui tue | S | ★★★★★ | Max | 1 (rétrofit) |
| 3 | Dégâts flottants animés basiques (Text pool + tween scale/alpha) | M | ★★★★★ | Très haut | 9 (on l'avance) |
| 4 | Flash blanc boosté à 120 ms + screen shake léger sur mort de monstre | S | ★★★★☆ | Très haut | 1 (rétrofit) |
| 5 | Effets de mort exagérés > 600 ms (shrink + rotate + particles + fade long) | M | ★★★★★ | Très haut | 9 (on l'avance) |
| 6 | Damage variance ±5 % | Triviale | ★★ | Haut | 1 (une ligne) |
| 7 | Squash & stretch sur wind-up d'attaque | S | ★★★ | Haut | 9 (on l'avance) |
| 8 | Camera zoom ×1.02 sur kill (50 ms in, 150 ms out) | S | ★★★ | Haut | 9 (on l'avance) |
| 9 | Particules d'impact avec pool partagé | M | ★★★★ | Haut | 9 |
| 10 | Boss tous les 5 vagues + bandeau "WAVE N — BOSS" | M | ★★★★ | Haut | 3 |
| 11 | Biome swap tous les 10 vagues (background + palette) | L | ★★★★ | Moyen-haut | 3 |
| 12 | Premier prestige dosé 25-60 min (tuning de courbe uniquement) | M | ★★★★★ | Haut | 10 |
| 13 | Drafts tactiques tous les 10 niveaux | L | ★★★★★ | Moyen-haut | 7-8 |
| 14 | Hors-ligne animé dédié (écran de retour) | M | ★★★★ | Moyen-haut | 8 |
| 15 | Ralenti sur crits (time dilation 0.3× pendant 250 ms) | S | ★★★☆ | Moyen | Étape crits (TBD) |
| 16 | Anticipation + follow-through 3 temps | M | ★★★ | Moyen | 9 |
| 17 | Chain reactions multiplier visible | M | ★★★ | Moyen | 9+ |
| 18 | Impact frames silhouette blanche | L | ★★★ | Moyen | 9+ |
| 19 | Achievements visibles dès le début | L | ★★★ | Moyen | 5-8 |
| 20 | Collection / bestiaire | L | ★★★ | Moyen | 11-12 |
| 21 | Synergies visibles entre unités | M | ★★★ | Moyen | 7 |
| 22 | Événements aléatoires (boss surprise, pluie d'or…) | M | ★★★ | Moyen | 3-5 |
| 23 | Objectifs courts / contrats | M | ★★ | Moyen | 5-6 |
| 24 | Daily / weekly | L | ★★ | Bas | 8 |
| 25 | AudioSystem stub avec hooks vides | S | ★ (direct) / ★★★★ (diff) | Indirect critique | 1 (rétrofit) |

**À noter** : 7 items sur les 25 sont en effort S. Ils représentent l'immense majorité du gain perceptible sur la première heure. On commence par là.

---

## Quick wins — 5 changements < 1 h chacun

Ces 5 items, faits dans l'ordre, transforment la sensation du jeu **aujourd'hui**. Ils peuvent tous être codés en moins d'une heure, testés via la preview live, validés sur le `TelemetrySystem`.

### 1. Easing sur les tweens existants *(15 min)*

**Où** : `Fighter.js` — tous les `scene.tweens.add(...)` existants.
**Quoi** : ajouter `ease: 'Back.Out'` sur le `playAttackTween`, `ease: 'Quad.In'` sur le `die`, `ease: 'Cubic.Out'` sur le `respawn`.
**Effet immédiat** : tout le jeu passe de "amateur" à "pro" sans autre changement.
**Check** : visuel, tu verras immédiatement le bump élastique à chaque attaque.

### 2. Hit stop 60 ms sur mort d'unité *(20 min)*

**Où** : `CombatSystem.js` — dans la branche `if (!target.isAlive)`.
**Quoi** : `scene.tweens.pauseAll()` + `scene.time.delayedCall(60, () => scene.tweens.resumeAll())`. Optionnellement setter `scene.time.timeScale = 0` pendant 60 ms.
**Effet immédiat** : chaque kill "punch" visuellement. Impossible de revenir en arrière une fois qu'on l'a essayé.
**Check** : chronomètre le temps entre un hit létal et la résolution de l'animation de mort. Doit faire ~60 ms de "respiration".

### 3. Flash blanc boosté + screen shake micro sur mort *(20 min)*

**Où** : `Fighter.js` (`die()`) + `CombatScene.js`.
**Quoi** : passer `_playHurtFlash` à 150 ms de durée au lieu de 100. Ajouter `this.scene.cameras.main.shake(80, 0.003)` sur la mort du monstre uniquement.
**Effet immédiat** : chaque mort du monstre fait vibrer tout l'écran. Sensation de poids.
**Check** : auto-vérifiable — ouvre l'overlay F9, regarde un cycle complet, tu vois le shake à chaque respawn.

### 4. Damage variance ±5 % *(5 min)*

**Où** : `CombatSystem.js` — `_resolveAttack`, avant `target.takeDamage(attacker.atk)`.
**Quoi** :
```js
const variance = 0.95 + Math.random() * 0.10;
const dmg = Math.max(1, Math.round(attacker.atk * variance));
target.takeDamage(dmg);
```
Passer `dmg` (pas `attacker.atk`) à `takeDamage` et à l'event `attack_performed`.
**Effet immédiat** : les dégâts flottants n'affichent plus le même chiffre 20 fois, ça respire.
**Check** : dans l'overlay F9, les valeurs de dégâts varient entre 7 et 9 (warrior atk = 8).

### 5. Dégâts flottants animés basiques *(45 min)*

**Où** : nouveau fichier `src/ui/FloatingDamage.js` + appel dans `CombatSystem._resolveAttack`.
**Quoi** : petit système de pool qui pop un `Text` au-dessus de la cible, tween vers le haut + scale up + fade out sur 700 ms avec `ease: 'Quad.Out'`. Couleur blanche pour hits normaux (réservé : jaune pour crits futurs).
**Effet immédiat** : c'est le seul ajout qui à lui seul fait passer le jeu de "démo technique" à "vrai idle". Les chiffres qui jaillissent = lecture + satisfaction.
**Check** : TelemetrySystem mesure déjà les `attack_performed` — le nombre d'events doit correspondre au nombre de dégâts flottants visibles à l'écran sur 10 s.

---

## Pièges à éviter

Erreurs classiques de polish sur les idles. Chacune est tombée sur quelqu'un avant toi.

1. **Animations trop lentes.** Le joueur *regarde*, donc chaque animation doit être nerveuse. Cible : < 300 ms pour la plupart des transitions, jamais > 800 ms sauf pour les morts de boss. Un guerrier qui met 500 ms à faire un nudge d'attaque, c'est insupportable après 5 min.

2. **Dégâts flottants illisibles.** Police trop petite, couleur blanche sur fond clair, pas de contour noir, pop par paquet sans pool. Règle : police minimum 14 px, contour 2 px sombre, pool réutilisé, jamais plus de ~20 à l'écran en même temps (si plus, regroupe).

3. **Menus modaux plein écran.** Le moindre menu qui couvre tout l'écran tue le sentiment "idle". Tout doit être overlay in-place ou drawer latéral. **Exception** : écran de prestige (c'est cérémoniel, on *veut* la coupure).

4. **Screen shake permanent ou trop intense.** Le shake doit être un *event*, pas une présence. Règle : intensité max 0.005, durée max 100 ms sauf boss. Un shake constant donne la nausée en 20 min.

5. **Over-polish sur l'action banale.** Empiler shake + hitstop + flash + particles + zoom + floating damage sur *chaque* hit normal = visual noise. Hiérarchiser (voir §1 "Hiérarchisation des effets combinés"). Garder le gros punch pour les moments spéciaux.

6. **Numbers qui gonflent trop tôt.** L'or qui atteint 10B en 10 min, c'est la perte complète du sens de la progression. Garde la courbe gérable sur les 2 premières heures (max 6 chiffres), puis ouvre les vannes.

7. **Pas d'anticipation sur les boss.** Un boss qui apparaît pile au tick d'une vague sans préavis = le joueur rate l'arrivée. Règle : 1.5-2 s d'annonce visuelle avant TOUT boss, même un mini.

8. **Particules sans pool.** Un `new ParticleEmitter` créé à chaque kill → après 1 h de jeu, frame rate qui dégringole. Toujours pool réutilisé.

9. **UI qui bouge pendant le combat.** Les boutons qui apparaissent/disparaissent/se déplacent pendant un combat cassent la lecture. Fige le layout pendant une wave, laisse les changements pour les transitions.

10. **Rien à regarder entre deux waves.** Le gap de respawn est plat et visible. Remplis-le : timer visible, bonus qui monte, mini-animations d'équipe qui récupèrent.

---

## Checklist de validation

À la fin de chaque session de polish, passer ces 7 critères. Ils sont conçus pour être **objectifs** — on peut répondre oui/non sans débat. Certains sont auto-vérifiables via `TelemetrySystem`.

| # | Critère | Comment vérifier | Auto via telemetry ? |
|---|---|---|---|
| 1 | Un joueur qui découvre le jeu a une réaction visible (sourire, haussement de sourcils, "oh") au moins une fois sur les 5 premières minutes. | Test manuel, 3-5 personnes différentes (amis, famille). Observer silencieusement. | Non |
| 2 | La mort d'un boss prend au moins **1500 ms** de "rituel visuel" entre l'impact létal et la fin de toutes les animations. | Chronomètre ou enregistrement d'écran. | Non |
| 3 | Le jeu tourne à **60 fps stable** pendant une wave avec 20+ dégâts flottants à l'écran. | `game.loop.actualFps` dans l'overlay F9 ajouté pour le test. | Oui (via overlay) |
| 4 | **95 % des combats normaux** durent entre 1.5 et 8 secondes. | `TelemetrySystem.getAggregates().avgDurationByWave` croisé avec la distribution via `getRecentCombats(100)`. | **Oui** |
| 5 | Un joueur peut citer en une phrase "ce qu'il attend ensuite" 10 min après avoir lancé le jeu. | Test manuel : "qu'est-ce que tu vises maintenant ?" | Non |
| 6 | L'écran n'est jamais "vide" (rien qui bouge) pendant plus de **2 secondes** consécutives en session normale. | Observation manuelle ou script qui compte les frames sans delta de rendu. | Partiel |
| 7 | Le premier prestige arrive entre **25 et 60 min** de jeu inaugural moyen. | `TelemetrySystem.getAggregates().totalDuration` au moment du premier `onPrestige()` call. | **Oui** |

**Bonus** : on peut ajouter un 8e critère *subjectif* mais crucial → "après avoir fermé le jeu, j'ai envie de le rouvrir dans les 24h". Si la réponse est non, aucun polish ne sauvera le jeu. Si la réponse est oui, on tient quelque chose.

---

## En résumé

Trois convictions pour ce projet :

1. **Le polish n'est pas accessoire** — dans un auto-battler idle, c'est **la boucle principale**. Un jeu avec des mécaniques sophistiquées mais un polish plat est mort. Un jeu avec des mécaniques simples mais un polish énorme se vend.
2. **L'essentiel du gain vient de petits items** — les 7 items en effort **S** du tableau de priorité pèsent ~70 % de la sensation finale. Le reste est du raffinement.
3. **On valide objectivement via `TelemetrySystem`** — on sait déjà mesurer durée, DPS, taux de survie. On sait donc *prouver* si une session de polish a amélioré le jeu, ou si on a juste perdu du temps.

La règle d'or : après chaque ajout de polish, re-lance le jeu et chronomètre ton propre sourire. Si tu souris avant la vague 5, c'est gagné. Si tu regardes ta montre, c'est raté.
