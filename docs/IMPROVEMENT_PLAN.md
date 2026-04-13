# PLAN D'AMELIORATION -- Idle Auto-Battler

**Version** : 1.0  
**Date** : 14 avril 2026  
**Auteur** : Audit technique + game design  
**Perimetre** : 125 fichiers, 22 471 lignes, alpha v0.1.0  

---

## RESUME EXECUTIF

### 5 Conclusions principales

1. **Le jeu a des fondations solides** : 15 systemes fonctionnels, architecture propre (singletons modulaires, zero dependance circulaire), combat aventure complet (741 lignes dans `CombatScene.js`), boucle de retention solide (daily login, missions, gacha, collection, prestige). Le ratio fonctionnel/code est excellent pour un dev solo.

2. **La composition d'equipe est cassee** : C'est LE probleme critique. `CombatScene._createDefaultTeam()` (ligne 592) cree TOUJOURS les memes 5 fighters (2 warriors, 1 archer, 1 mage, 1 healer). Les assignations de heros via `TeamScreen` et `GachaSystem.assignHero()` n'ont AUCUN effet sur qui combat. Le joueur n'a aucune agentivite sur sa composition.

3. **Des systemes sont definis mais non branches** : 20 heros avec passifs (`heroes.js`) mais `Fighter._recomputeStats()` (ligne 409) ignore les passifs type `permanentTaunt`, `lastStand`, `multiShot`, `autoRevive`, etc. Seuls `statMult` et `teamHpPercent` sont lus. 8 types d'enchantements definis dans `items.js` (ligne 25), mais seuls `atk`/`hp` flat et percent sont appliques dans `_recomputeStats()` -- `speed`, `gold`, `xp`, `heal` sont ignores.

4. **Le donjon est a 70%** : `DungeonExploreScreen.js` offre 5 salles avec scaling, mais les equipes de donjon ne sont pas connectees a la progression du joueur, pas de loot, pas de buff cards fonctionnelles. Le systeme est jouable mais creux.

5. **Pas d'onboarding ni d'endgame** : Un nouveau joueur voit 11 boutons dans `MenuScreen.js` sans aucune indication de par ou commencer. Apres les 6 biomes (60 vagues), rien de neuf ne se debloque.

### 3 Actions les plus urgentes

| # | Action | Fichiers concernes | Effort |
|---|--------|--------------------|--------|
| 1 | Brancher la composition d'equipe sur le combat | `CombatScene.js`, `GachaSystem.js`, `TeamScreen.js` | 2-3 jours |
| 2 | Activer les passifs de heros | `Fighter.js`, `CombatSystem.js`, `heroes.js` | 2-3 jours |
| 3 | Ajouter un tutoriel 3 etapes + fleches directrices | `MenuScreen.js`, nouveau `TutorialSystem.js` | 1-2 jours |

---

## 1. DIAGNOSTIC DETAILLE

Chaque probleme est score selon : **Gravite** (1-5) x **Urgence** (1-5) = **Priorite** (1-25).

| # | Probleme | Gravite | Urgence | Priorite | Fichier(s) |
|---|----------|---------|---------|----------|------------|
| D1 | Composition d'equipe hardcodee | 5 | 5 | **25** | `CombatScene.js:592-651` |
| D2 | Passifs de heros jamais actives | 5 | 4 | **20** | `Fighter.js:409-473`, `heroes.js` |
| D3 | Enchantements speed/gold/xp/heal ignores | 3 | 3 | **9** | `Fighter.js:430-463`, `items.js:25-34` |
| D4 | Aucun onboarding | 4 | 5 | **20** | `MenuScreen.js`, `main.js` |
| D5 | Donjon non connecte a la progression | 3 | 2 | **6** | `DungeonExploreScreen.js`, `DungeonCombatScene.js` |
| D6 | Pas d'endgame apres biome 6 | 3 | 2 | **6** | `biomes.js`, `CombatScene.js` |
| D7 | Telemetrie totalGold toujours 0 | 2 | 3 | **6** | `TelemetrySystem.js:29` |
| D8 | Dead code sur disque | 1 | 1 | **1** | `DungeonListScreen.js`, `DungeonChoiceScreen.js`, `DungeonSystem.js` |
| D9 | Pas de feedback sonore | 3 | 3 | **9** | Aucun fichier audio |
| D10 | Cloud save 90% (pas de conflict resolution) | 2 | 2 | **4** | `AuthSystem.js`, `main.js:54-60` |
| D11 | Aucun test automatise (sauf telemetrie) | 2 | 2 | **4** | `tests/telemetry.test.js` |
| D12 | Talents definis mais effets avances non branches | 3 | 3 | **9** | `TalentSystem.js`, `talents.js`, `Fighter.js` |

---

## 2. AXES D'AMELIORATION

---

### AXE 1 -- Composition d'equipe customisable

**Accroche** : "Le joueur doit CHOISIR qui combat."

**Diagnostic specifique** :
- `CombatScene._createDefaultTeam()` (ligne 592-651) cree toujours : 2 Warriors (ids implicites), 1 Archer, 1 Mage, 1 Healer. Aucune lecture des assignations gacha.
- `TeamScreen.js` permet d'assigner des heros via `GachaSystem.assignHero(heroId, fighterId)` avec les slots fixes `u1` (warrior), `u2` (archer), `u3` (mage), `u4` (healer).
- `Fighter._recomputeStats()` (ligne 417-427) lit bien `GachaSystem.getHeroModifiers(this.id)` pour le `statMult`, mais les ids utilises dans `_createDefaultTeam` ne correspondent PAS aux ids `u1-u4` de `TEAM_SLOTS` dans `TeamScreen.js`.
- Resultat : le joueur peut assigner des heros dans l'ecran equipe, mais le combat instancie des fighters avec des ids differents, donc `getHeroModifiers()` retourne `{ statMult: 1 }` systematiquement.

**Vision cible** :
Le joueur compose son equipe de 3-6 unites parmi les classes disponibles. Les heros gacha sont assignes et leurs passifs s'activent en combat. La composition est une DECISION strategique.

**Propositions concretes** :
1. **Modifier `_createDefaultTeam()`** pour lire les assignations depuis `GachaSystem.getAssignments()` et creer les fighters avec les ids correspondants (`u1`, `u2`, `u3`, `u4`). Cela branche immediatement le pipeline existant.
2. **Ajouter un slot "5eme membre"** dans `TEAM_SLOTS` (actuellement 4 slots, l'equipe par defaut en a 5). Le 5eme slot pourrait etre n'importe quelle classe.
3. **Permettre de choisir la CLASSE** de chaque slot (pas seulement le heros a l'interieur). Le joueur pourrait avoir 3 warriors et 0 healer s'il le veut.
4. **Sauvegarder la composition** dans le SaveSystem. `_createTeamFromSave()` (ligne 654) existe deja mais ne preserve pas les assignations heros.
5. **Afficher la composition dans le Cockpit** pendant le combat pour que le joueur voie ses choix en action.

**Impact** : TRANSFORMATEUR -- sans ca, le jeu n'est pas un auto-battler, c'est un ecran de veille.  
**Effort** : 2-3 jours  
**Dependances** : Aucune  
**Indicateurs de succes** : Le joueur voit ses heros assignes combattre. Un changement d'equipe dans TeamScreen change le prochain combat.

---

### AXE 2 -- Game feel et feedback

**Accroche** : "Chaque action doit etre satisfaisante."

**Diagnostic specifique** :
- Aucun son dans le jeu. Zero fichier audio charge dans `CombatScene.preload()`.
- Les animations d'attaque (`Fighter.playAttackTween()`, ligne 227-262) sont correctes mais identiques pour toutes les classes.
- Le hit flash (`_playHurtFlash()`, ligne 667-683) est un simple blanc 100ms -- fonctionnel mais generique.
- Les dommages flottants (`FloatingDamage.js`) existent mais pas de differenciation visuelle critique/normal au-dela de la couleur.
- Le combo counter (`ComboCounter.js`) est present et fonctionnel (fenetre 2500ms).
- Aucun screen shake sur les coups critiques ou la mort d'un boss.

**Vision cible** :
Chaque frappe est ressentie. Le joueur sait instinctivement si son equipe performe bien grace aux retours visuels et sonores.

**Propositions concretes** :
1. **Ajouter 5 sons de base** : hit melee, hit ranged, mort monstre, mort boss (plus gros), level up. Des SFX 8-bit gratuits suffisent (jsfxr.me).
2. **Screen shake leger** (2-3px, 80ms) sur chaque kill, plus prononce (5px, 150ms) sur les boss. Phaser le supporte nativement avec `this.cameras.main.shake()`.
3. **Differentier les animations d'attaque par classe** : le warrior fait un dash court, l'archer tire une fleche (deja fait via projectiles), le mage a un flash lumineux, le healer pulse en vert.
4. **Slow-motion 200ms** au moment du kill du boss (baisser `this.time.timeScale` a 0.3 puis remonter). Effet "impact" tres satisfaisant.
5. **Nombre de dommages plus expressif** : taille proportionnelle au ratio damage/maxHp de la cible. Un gros coup = gros chiffre.

**Impact** : Fort -- le game feel est ce qui fait revenir un joueur casual.  
**Effort** : 3-4 jours  
**Dependances** : Aucune  
**Indicateurs de succes** : Le premier testeur dit "le jeu a du punch" ou equivalent.

---

### AXE 3 -- Profondeur tactique (synergies, formations)

**Accroche** : "Des choix significatifs a chaque composition."

**Diagnostic specifique** :
- Le systeme de `line` (front/back) existe dans `balance.js` (warrior=front, archer/mage/healer=back) et le ciblage `front_priority` des monstres donne du sens a la formation.
- Mais aucune synergie de classe n'existe. Avoir 2 warriors ou 3 ne change rien au-dela des stats brutes.
- Les 36 talents (`talents.js`) offrent de la personnalisation mais les effets avances (double frappe, bouclier absorbant, execution, resurrection) ne sont PAS implementes dans `CombatSystem.js`. Seuls `atkPercent` et `hpPercent` sont lus via `TalentSystem.getModifiers()`.
- Les set bonuses d'items (`items.js:38-45`) sont calcules (`computeSetBonus`) mais `speed_percent`, `heal_received`, `gold_percent`, `xp_percent` ne sont pas appliques dans `_recomputeStats()`.

**Vision cible** :
Le joueur reflechit a sa composition. "Est-ce que je mets 2 warriors pour tanker ou 1 warrior + 1 assassin pour le DPS?" Les synergies recompensent les compositions creatives.

**Propositions concretes** :
1. **Implementer les passifs de heros** dans `CombatSystem.js` : `permanentTaunt` (force le ciblage), `lastStand` (invincible 2s sous 10% HP), `multiShot` (3 projectiles), `autoRevive` (1 resurrection/combat), `dualElement`, `ultChargeBonus`, `aoeMult`.
2. **Ajouter des synergies de classe** : 2 warriors = +10% HP equipe, 2 archers = +15% ATK archers, etc. Un objet `SYNERGIES` dans `balance.js` lu au debut du combat.
3. **Implementer les talents avances** : double frappe (`w_dps_3`), bouclier (`w_tank_3`), execution (`a_snp_3`), resurrection (`w_sup_3`). Ils sont definis dans `talents.js` mais jamais lus par le combat.
4. **Ajouter 2 nouvelles classes** (optionnel, horizon moyen) : Assassin (single target, crit), Tank/Paladin (taunt, bouclier). Enrichit l'espace de composition.
5. **Afficher les synergies actives** dans le TeamScreen et le Cockpit en combat.

**Impact** : Transformateur -- c'est ce qui transforme un idle en auto-battler.  
**Effort** : 5-8 jours (passifs 3j + synergies 2j + talents avances 2j)  
**Dependances** : AXE 1 (composition customisable)  
**Indicateurs de succes** : Le joueur change sa composition entre 2 biomes pour s'adapter aux ennemis.

---

### AXE 4 -- Variete de contenu

**Accroche** : "Toujours quelque chose de nouveau a decouvrir."

**Diagnostic specifique** :
- 6 biomes avec 10 waves chacun = 60 waves de contenu. Apres, le jeu boucle (modulo 6 dans `biomeForWave()`).
- 18 monstres au total (4 normaux + 1 boss par biome, 3 biomes avec des sprites fallback).
- 21 templates d'items (3 par biome = 18 set pieces + 3 generiques possibles).
- 4 types d'attaque en aventure : single, aoe, heal, projectile. Tous les monstres utilisent `single`.
- Les monstres n'ont aucune mecanique speciale. Pas de poison, pas de bouclier, pas de rage, pas d'invocation de renforts.

**Vision cible** :
Chaque biome a une identite mecanique. Les monstres ont des comportements differents qui forcent des adaptations de composition.

**Propositions concretes** :
1. **Ajouter des modificateurs de biome** : Foret = regeneration monstre, Grottes = obscurite (ranged -30% precision), Enfer = brulure periodique (dommages ticks), Neige = ralentissement (-20% attack speed), Temple = bouclier boss (absorbe 500 dommages).
2. **Donner des capacites aux monstres** : le Troll regenere, le Sphinx esquive 1 attaque sur 3, le Demon brule (DoT), le Golem a un bouclier. Un champ `ability` dans `MONSTER_POOLS` lu par `CombatSystem`.
3. **Sprites manquants** : 6 monstres utilisent le fallback (`monsters.js` lignes 41-67). Generer ou commander les sprites pour Pharaon, Balrog, Cerbere, Succube, Yeti, Ours blanc.
4. **Ajouter un 7eme biome** "Abysses" (waves 61-70) avec des monstres marins/eldritch.
5. **Events rotatifs** : un biome "special" par semaine avec des regles modifiees (double gold, monstres geants, etc.).

**Impact** : Fort  
**Effort** : 5-10 jours (modificateurs 2j, capacites monstres 3j, sprites 2-3j, 7eme biome 2j)  
**Dependances** : Aucune pour les modificateurs, AXE 3 pour les capacites monstres  
**Indicateurs de succes** : Le joueur change sa composition selon le biome qu'il attaque.

---

### AXE 5 -- Economie et progression

**Accroche** : "Chaque minute jouee fait progresser."

**Diagnostic specifique** :
- L'or scale a `growth: 1.10` par wave (`balance.js:75`), les monstres a `hp_growth: 1.18` (`balance.js:67`). Le scaling monstres depasse l'or, donc le joueur est en deficit croissant -- c'est voulu (force le prestige).
- Le prestige est accessible a wave 20 (`balance.js:183`) avec `fragment_divisor: 10` -- wave 20 = 2 fragments. Les bonus coutent 2-5 fragments. Le premier prestige apporte 1 bonus significatif en ~30 min de jeu.
- Les gemmes sont rares : 1 par boss (toutes les 5 waves), un pull coute 5 gemmes. Premier pull single = wave 25 environ. Multi-pull (50 gemmes) = ~250 boss = beaucoup de jeu.
- L'enchantement `gold_percent` (items.js:31) et le set bonus Temple `gold_percent: 20` (items.js:44) ne sont PAS lus par le code. Un joueur qui farm l'or avec du gold% ne verra aucun bonus.

**Vision cible** :
La progression est fluide avec des paliers clairs. Le joueur sait toujours ce qu'il accumule et pourquoi.

**Propositions concretes** :
1. **Brancher les enchantements gold%/xp%** dans les endroits adequats : `CombatSystem.computeKillReward()` pour gold%, `Progression.computeXpReward()` pour xp%. Necessite de passer l'equipe en parametre pour lire les items equipes.
2. **Ajouter un multiplicateur d'or afk** visible : quand le joueur revient, montrer "Vous avez gagne X or (efficacite 50%)" avec un bouton "doubler (pub)" prepare pour la monetisation future.
3. **Creer un systeme de milestones** : wave 10 = debloque le donjon, wave 20 = debloque le prestige, wave 30 = debloque un 5eme slot d'equipe. Donne des objectifs intermediaires.
4. **Equilibrer le cout du gacha** : baisser le premier pull a 3 gemmes (au lieu de 5) pour que le joueur decouvre la mecanique plus vite. Le premier pull devrait arriver vers wave 15 (3 boss tues).
5. **Ajouter un "gold sink" mid-game** : amelioration d'equipement, reroll d'enchantements, achat de slots d'inventaire. L'or s'accumule sans usage apres les premieres fusions.

**Impact** : Fort  
**Effort** : 3-5 jours  
**Dependances** : AXE 1 (pour que les items equipes soient lus)  
**Indicateurs de succes** : Le joueur ne se retrouve jamais "bloque sans rien a acheter" ni "en rupture de ressource sans recours".

---

### AXE 6 -- Onboarding et premieres minutes

**Accroche** : "Le joueur sait quoi faire dans les 30 premieres secondes."

**Diagnostic specifique** :
- `MenuScreen.js` affiche 11 boutons simultanement (Aventure, Donjons, Invocation, Coffres, Missions, Collection, Equipe, Talents, Inventaire, Prestige, Statistiques). Un nouveau joueur est paralyse par le choix.
- Aucun systeme de tutorial ou de guidage. `GuideModal.js` existe mais c'est un manuel statique, pas un tutoriel interactif.
- Le premier combat se lance sans explication. Le joueur ne sait pas que ses unites combattent automatiquement, que les boss arrivent toutes les 5 waves, ou que le loot est automatique.
- Le guide (`guideContent.js`) est un mur de texte -- utile pour reference, inutile pour l'apprentissage.

**Vision cible** :
Le joueur est guide par la main pendant 2 minutes, puis lache progressivement. Les menus se debloquent au fur et a mesure.

**Propositions concretes** :
1. **Deblocage progressif du menu** : Au premier lancement, seuls "Aventure" et "Equipe" sont visibles. Les autres boutons se debloquent via des milestones (wave 5 = Inventaire, wave 10 = Missions + Donjons, wave 20 = Prestige + Talents, etc.).
2. **Tutorial en 3 etapes** : (a) "Lancez votre premiere aventure" fleche vers le bouton Aventure, (b) premier combat avec tooltip "Vos unites combattent automatiquement !", (c) retour au menu avec "Bravo ! Equipez un heros pour booster votre equipe".
3. **Premier pull gacha gratuit** : offrir 5 gemmes + un pull garanti SR au premier login. Le joueur decouvre le systeme immediatement.
4. **Notifications contextuelles** : un badge rouge sur les boutons pertinents quand une action est disponible (mission a reclamer, objet a equiper, prestige disponible). Le badge mission existe deja (`MenuScreen.js:53`), l'etendre aux autres systemes.
5. **Tooltip de biome** avant le premier combat : "Foret -- waves 1-10 -- monstres faibles, ideal pour debuter".

**Impact** : Transformateur pour la premiere impression.  
**Effort** : 2-4 jours  
**Dependances** : Aucune  
**Indicateurs de succes** : Un testeur neuf comprend le jeu sans explications externes en moins de 2 minutes.

---

### AXE 7 -- Narratif et univers

**Accroche** : "Donner une raison de combattre."

**Diagnostic specifique** :
- Chaque heros a un champ `lore` dans `heroes.js` (ex: "Fidele protecteur du royaume", "Son armure absorbe la lumiere"). Ce lore n'est affiche nulle part dans le jeu.
- Les biomes ont des noms et des couleurs mais aucune histoire.
- Le donjon "Horde Gobeline" (`DungeonExploreScreen.js:37`) est le seul element narratif.
- Aucun dialogue, aucun PNJ, aucune cinematique.

**Vision cible** :
Un fil narratif leger mais motivant. Le joueur sait POURQUOI il progresse.

**Propositions concretes** :
1. **Intro narrative** au premier lancement (3 lignes max) : "Le Rift s'est ouvert. Des hordes de monstres envahissent le monde. Assemblez votre equipe et repoussez-les biome par biome."
2. **Dialogue de boss** : un texte d'une ligne avant chaque boss (integration dans `WaveBanner.js`). "Le Roi Gobelin rugit : Vous ne passerez pas !"
3. **Afficher le lore des heros** dans la collection (`CollectionScreen.js`) et dans le TeamScreen quand on selectionne un heros.
4. **Nommer les runs de donjon** : "Expedition dans la Foret Sombre" plutot que "Donjon Foret".
5. **Ecran de victoire de biome** avec un petit resume : "Vous avez pacifie la Foret ! Les Grottes sombres vous attendent..."

**Impact** : Moyen  
**Effort** : 1-2 jours (textes + integration UI)  
**Dependances** : Aucune  
**Indicateurs de succes** : Le joueur peut repondre a "de quoi parle le jeu ?" sans hesiter.

---

### AXE 8 -- Accessibilite et confort

**Accroche** : "Le joueur reste longtemps parce que c'est confortable."

**Diagnostic specifique** :
- Le jeu fonctionne a 800x480 (resolution fixe dans la config Phaser). Pas de responsive.
- Pas d'option de vitesse (x1/x2/x4). Le `timeScale` est utilise dans `CombatScene.update()` (ligne 269) mais aucun bouton UI ne le controle.
- Pas de mode sombre/clair.
- La taille des textes est fixe dans le CSS. Pas d'option d'accessibilite.
- Le Cockpit DOM (`Cockpit.js`) fonctionne bien mais n'a pas de bouton "retour au menu" rapide pendant le combat.

**Vision cible** :
Le jeu est jouable confortablement sur n'importe quel ecran PC, avec des options de confort pour les longues sessions.

**Propositions concretes** :
1. **Boutons de vitesse x1/x2/x4** dans le Cockpit. Modifier `this.time.timeScale` + afficher la vitesse active. Deja supporte par le moteur (ligne 269 de `CombatScene.js`).
2. **Auto-battle toggle** : quand active, le jeu enchaine les biomes automatiquement apres victoire (idle pur).
3. **Bouton retour menu** dans le Cockpit (avec confirmation "Quitter le combat ?").
4. **Raccourcis clavier** : Espace = pause, 1/2/3 = vitesse, U = ultime du guerrier, etc.
5. **Notifications de progression** plus visibles : quand un objet drop, quand un heros level up, quand une mission est completee.

**Impact** : Fort pour la retention  
**Effort** : 2-3 jours  
**Dependances** : Aucune  
**Indicateurs de succes** : Le joueur peut faire une session de 30 min sans frustration d'interface.

---

### AXE 9 -- Meta-jeu et endgame

**Accroche** : "Toujours un objectif a atteindre."

**Diagnostic specifique** :
- Apres 60 waves (6 biomes), le jeu boucle via `biomeForWave()` (`biomes.js:31`) avec modulo 6. Memes monstres, memes stats (avec scaling continu). Aucun nouveau contenu.
- Le prestige est infini mais les bonus sont limites a ~8 achats (`PrestigeSystem.js` bonuses). Apres 2-3 prestiges, il n'y a plus rien a acheter.
- Le donjon offre une run unique de 5 salles, pas de progression entre les runs.
- Pas de classement, pas de challenge periodique, pas de mode competitif.

**Vision cible** :
Le joueur a toujours un objectif. Meme apres 50h de jeu, il y a quelque chose a debloquer ou optimiser.

**Propositions concretes** :
1. **Tour infinie (endless mode)** : apres le biome 6, un mode "Abysse" ou les waves continuent avec un scaling agressif. Classement du meilleur wave atteint.
2. **Prestige++ (ascension)** : apres 3 prestiges, debloquer un systeme de "paragon" qui offre des micro-bonus infinis (+0.5% ATK par point, accumulation lente).
3. **Donjons rotatifs** : un nouveau donjon chaque semaine avec des regles speciales. Les buff cards de `dungeonConfig.js` (12 cartes definies) deviennent la mecanique centrale.
4. **Succes/Achievements** : "Tue 1000 monstres", "Atteins wave 100", "Collecte les 20 heros", "Finis le donjon sans healer". Recompenses en gemmes.
5. **Mode Boss Rush** : affronter les 6 boss d'affilee avec un timer. Recompense unique (skin, titre).
6. **Arene PvP asynchrone** (horizon long) : le joueur defie les compositions d'autres joueurs (IA controle). Classement ELO.

**Impact** : Transformateur pour la retention long-terme  
**Effort** : 8-15 jours selon l'ambition  
**Dependances** : AXE 1 (composition) + AXE 3 (profondeur tactique)  
**Indicateurs de succes** : Un joueur revient apres 1 semaine parce qu'il y a un nouvel objectif.

---

### AXE 10 -- Partageabilite et viralite

**Accroche** : "Chaque victoire merite d'etre partagee."

**Diagnostic specifique** :
- Aucun mecanisme de partage. Pas de screenshot de composition, pas de lien de profil.
- Le Discord est prevu (`DISCORD_SETUP.md` existe dans `docs/`) mais pas integre au jeu.
- Pas de codes d'invitation ou de parrainage.

**Vision cible** :
Le joueur partage naturellement ses victoires et sa progression. Chaque partage est une pub gratuite.

**Propositions concretes** :
1. **Bouton "Partager ma composition"** dans le TeamScreen : genere une image (canvas → PNG) avec les heros, les stats, le wave max.
2. **Lien Discord** dans le menu avec compteur de joueurs en ligne.
3. **Code ami** : chaque joueur a un code unique. Parrainer un ami = 10 gemmes pour les deux.
4. **Recap de session** a la fermeture : "Session de 45min -- 200 monstres tues, 3 boss vaincus, 2 items legendaires". Bouton copier/partager.
5. **Leaderboard** simple (top 10 wave max) dans Firebase, affiche dans le menu.

**Impact** : Moyen (fort si la base de joueurs grandit)  
**Effort** : 3-5 jours  
**Dependances** : Firebase (deja en place via `AuthSystem.js`)  
**Indicateurs de succes** : Au moins 1 testeur partage un screenshot spontanement.

---

## 3. AXES TECHNIQUES

### 3.1 Architecture

**Etat actuel** : Architecture propre -- singletons modulaires (`GachaSystem`, `ItemSystem`, `TelemetrySystem`, etc.), separation nette DOM/Phaser, pas de dependance circulaire.

**Ameliorations** :
- **Event bus central** : remplacer les `_listeners` custom de chaque systeme par un EventEmitter partage. Reduira le couplage et facilitera les achievements/missions.
- **State machine pour les ecrans** : le flow `main.js` gere la navigation via des callbacks. Un pattern State/Router simplifiera l'ajout de nouveaux ecrans.
- **Separation donnees/logique** : les constantes de `balance.js` sont excellentes. Etendre le pattern aux futures mecaniques (synergies, modificateurs de biome).

### 3.2 Performance

**Etat actuel** : Le jeu tourne a 60fps sur un PC standard. Le pool de projectiles (`CombatScene.projectilePool`, ligne 120) est bien optimise. Les emetteurs de particules sont pre-alloues.

**Ameliorations** :
- **Object pooling pour les FloatingDamage** : actuellement crees/detruits. Passer en pool recycle.
- **Throttler le TelemetryOverlay** : le debug overlay (F9) peut ralentir si trop d'events s'accumulent.
- **Lazy loading des sprites** : charger les sprites du biome courant seulement, pas les 6 biomes.

### 3.3 Pipeline de contenu

**Etat actuel** : Ajouter un monstre = 1 entree dans `MONSTER_POOLS` + 1 sprite + 1 `this.load.image()`. Simple mais entierement manuel.

**Ameliorations** :
- **Fichier de manifest** (`assets/manifest.json`) pour auto-charger les sprites.
- **Generateur de biome** : un script qui cree le squelette (4 monstres + 1 boss + backgrounds + set d'items) a partir d'un template.
- **Hot-reload des balances** : lire `balance.js` depuis un JSON externe pour permettre le tuning sans rebuild.

### 3.4 Debug et telemetrie

**Etat actuel** : `TelemetrySystem.js` est bien concu (buffer circulaire, agregats localStorage). `DevConsole.js` existe. Le `TelemetryOverlay` (F9) affiche les stats en temps reel.

**Ameliorations** :
- **Corriger totalGold** : `emptyAggregates()` initialise `totalGold: 0` mais aucun event ne l'incremente. Brancher `gold_earned` sur `TelemetrySystem.aggregates.totalGold += amount` dans le handler du kill.
- **Ajouter un replay system** : enregistrer les seeds de combat pour pouvoir reproduire un fight (utile pour le debug de balance).
- **Dashboard admin** : `AdminPanel.js` existe. Y ajouter les metriques de balance (DPS moyen par classe, survie par wave).

### 3.5 Tests

**Etat actuel** : Un seul fichier de test (`tests/telemetry.test.js`). Zero test pour le combat, la progression, le gacha, les items.

**Ameliorations** :
- **Tests unitaires** pour `Progression.js` (formules XP/stats), `GachaSystem` (pity counters), `ItemSystem` (drop rates, forge).
- **Test de regression du balance** : verifier que `computeMonsterStats(wave)` produit les valeurs attendues pour les waves cles (1, 5, 10, 20, 50).
- **Test d'integration** : simuler un combat complet sans Phaser (mock la scene) et verifier le flow kill→reward→xp→levelup.

### 3.6 Save et migration

**Etat actuel** : `SAVE_VERSION = 1` dans `SaveSystem.js`. Pas de migration. Le cloud save charge en brut dans localStorage (`main.js:56-60`).

**Ameliorations** :
- **Systeme de migration** : quand `SAVE_VERSION` change, appliquer des transformations sequentielles (v1→v2, v2→v3).
- **Conflict resolution cloud** : comparer les timestamps local vs cloud. Si les deux ont ete modifies, proposer un choix au joueur.
- **Backup avant prestige** : sauvegarder un snapshot avant le reset pour permettre un "undo prestige" pendant 24h.

### 3.7 Deploiement

**Etat actuel** : Serveur local (`.claude/launch.json` avec configuration de dev). Pas de pipeline de build/deploy.

**Ameliorations** :
- **Build avec Vite/Rollup** : minification, tree-shaking, hash des assets pour le cache.
- **Deploy sur Netlify/Vercel** pour les alpha testeurs. Un click deploy depuis GitHub.
- **Feature flags** : un fichier `flags.json` pour activer/desactiver des features par environnement (debug, alpha, release).

---

## 4. PLAN D'ACTION EN 3 HORIZONS

---

### HORIZON 1 -- Court terme (1-2 semaines)

**Objectif** : Le jeu est jouable avec une composition customisable et des retours satisfaisants.

| # | Tache | Effort | Fichiers |
|---|-------|--------|----------|
| 1.1 | Brancher la composition d'equipe sur le combat | 2j | `CombatScene.js`, `GachaSystem.js` |
| 1.2 | Aligner les fighter IDs avec TEAM_SLOTS (`u1-u4`) | 0.5j | `CombatScene.js`, `TeamScreen.js` |
| 1.3 | Activer les passifs simples (statMult, teamHpPercent) | 1j | `Fighter.js`, `CombatSystem.js` |
| 1.4 | Brancher enchantements gold%/xp%/speed% | 1j | `Fighter.js`, `CombatSystem.js` |
| 1.5 | Corriger totalGold dans la telemetrie | 0.5j | `TelemetrySystem.js`, `CombatSystem.js` |
| 1.6 | Supprimer le dead code | 0.5j | `DungeonListScreen.js`, `DungeonChoiceScreen.js`, `DungeonSystem.js` |
| 1.7 | Ajouter boutons vitesse x1/x2/x4 | 0.5j | `Cockpit.js`, `CombatScene.js` |
| 1.8 | Premier pull gacha gratuit | 0.5j | `GachaSystem.js`, `main.js` |
| 1.9 | Tutorial 3 etapes basique | 1.5j | nouveau `TutorialSystem.js`, `MenuScreen.js` |
| 1.10 | Screen shake sur kill boss | 0.5j | `CombatScene.js` |

**Total** : ~8-9 jours

**Etat cible du jeu** :
Le joueur compose son equipe dans TeamScreen, lance un combat, et ses heros assignes combattent avec leurs bonus de stats. Les enchantements fonctionnent tous. La premiere experience est guidee.

**Top 3 risques** :
1. Le changement d'IDs fighters (1.2) pourrait casser les saves existantes. Mitigation : migration de save v1→v2.
2. Le tutorial (1.9) pourrait bloquer des joueurs revenant (deja avances). Mitigation : flag `tutorialDone` dans localStorage.
3. L'equilibrage post-passifs pourrait etre casse (SSR trop fort). Mitigation : playtester 30min apres implementation.

---

### HORIZON 2 -- Moyen terme (1-2 mois)

**Objectif** : Le jeu a de la profondeur tactique, un onboarding fluide, et un endgame emergent.

| # | Tache | Effort | Dependances |
|---|-------|--------|-------------|
| 2.1 | Implementer tous les passifs de heros (10 passifs) | 3j | H1 complet |
| 2.2 | Synergies de classe (bonus 2/3 meme classe) | 2j | H1.1 |
| 2.3 | Implementer les talents avances (8 effets) | 3j | H1.3 |
| 2.4 | Deblocage progressif du menu (milestones) | 1.5j | H1.9 |
| 2.5 | Modificateurs de biome | 2j | -- |
| 2.6 | Capacites speciales des monstres (5 types) | 3j | -- |
| 2.7 | Sons de base (5 SFX) | 1j | -- |
| 2.8 | Tour infinie / Abysse | 2j | -- |
| 2.9 | Systeme d'achievements (15 succes) | 2j | -- |
| 2.10 | Ameliorer le donjon (loot, integration heros) | 3j | H1.1 |
| 2.11 | Build pipeline (Vite + deploy Netlify) | 1j | -- |
| 2.12 | Tests unitaires (progression, gacha, combat) | 2j | -- |

**Total** : ~25 jours

**Etat cible du jeu** :
Un auto-battler complet avec des choix de composition significatifs, des biomes avec des mecaniques uniques, un endgame via la tour infinie, des achievements qui motivent l'exploration. Deploye en ligne pour les testeurs.

**Top 3 risques** :
1. L'equilibrage des synergies + passifs + talents risque de creer des combinaisons brisees. Mitigation : playtests frequents, ajustement des valeurs dans `balance.js`.
2. Les sons peuvent etre percus comme generiques. Mitigation : utiliser jsfxr pour un style retro assume.
3. Le scope est ambitieux pour 1 personne. Mitigation : prioriser 2.1-2.6 et traiter le reste en bonus.

---

### HORIZON 3 -- Long terme (3-6 mois)

**Objectif** : Le jeu est pret pour un launch public avec des mecaniques differenciantes.

| # | Tache | Effort | Dependances |
|---|-------|--------|-------------|
| 3.1 | Arene PvP asynchrone | 10j | H2 complet |
| 3.2 | Donjons rotatifs hebdomadaires | 5j | H2.10 |
| 3.3 | Boss Rush mode | 3j | H2 |
| 3.4 | Systeme de guildes | 8j | Firebase |
| 3.5 | 2 nouvelles classes (Assassin, Paladin) | 5j | H2.2 |
| 3.6 | Monetisation (battle pass, cosmetics) | 10j | -- |
| 3.7 | Localisation (EN) | 3j | -- |
| 3.8 | Mobile (PWA responsive) | 5j | -- |
| 3.9 | Musique et ambiance sonore complete | 3j | -- |
| 3.10 | Narrative : dialogues de boss, cinematiques | 3j | H2.5 |

**Total** : ~55 jours

**Etat cible du jeu** :
Un idle auto-battler publiable avec PvP, progression profonde, contenu rotatif, et monetisation non-intrusive. Pret pour un soft launch.

**Top 3 risques** :
1. Le PvP (3.1) peut reveler des desequilibres profonds. Mitigation : lancer en "beta PvP" avec un petit groupe.
2. La monetisation (3.6) peut nuire au fun si mal calibree. Mitigation : cosmetics only, pas de pay-to-win.
3. Le mobile (3.8) necessite un refactor UI significatif. Mitigation : PWA responsive, pas d'app native.

---

## 5. 10 QUICK WINS (moins de 2h chacun, classes par ROI)

| # | Quick Win | ROI | Effort | Fichier(s) |
|---|-----------|-----|--------|------------|
| 1 | **Screen shake sur kill boss** -- `this.cameras.main.shake(150, 0.005)` dans l'event de mort boss | Enorme | 15min | `CombatScene.js` ou `CombatSystem.js` |
| 2 | **Boutons vitesse x1/x2/x4** -- un toggle dans le Cockpit qui set `scene.time.timeScale` | Enorme | 45min | `Cockpit.js`, `CombatScene.js` |
| 3 | **Premier pull gacha gratuit** -- offrir 5 gemmes au premier login si `ownedHeroes.length === 0` | Gros | 30min | `GachaSystem.js`, `main.js` |
| 4 | **Corriger totalGold** -- incrementer `aggregates.totalGold += reward.gold` dans le handler kill | Moyen | 15min | `TelemetrySystem.js`, `CombatSystem.js` |
| 5 | **Supprimer le dead code** -- `rm DungeonListScreen.js DungeonChoiceScreen.js DungeonSystem.js` | Proprete | 10min | 3 fichiers |
| 6 | **Afficher le lore des heros** dans CollectionScreen et TeamScreen | Moyen | 1h | `CollectionScreen.js`, `TeamScreen.js` |
| 7 | **Badge rouge sur tous les boutons du menu** (pas que missions) | Gros | 1h | `MenuScreen.js` |
| 8 | **Slow-motion 200ms au boss kill** -- `timeScale = 0.3` pendant 200ms puis retour | Gros | 30min | `CombatSystem.js` |
| 9 | **Tooltip wave/biome** dans le Cockpit (affiche "Foret 3/10") | Moyen | 30min | `Cockpit.js` |
| 10 | **Raccourci clavier Espace = pause** | Moyen | 20min | `CombatScene.js` |

---

## 6. 5 PIEGES MORTELS + Garde-fous

### Piege 1 : L'equilibrage infini
**Risque** : Passer des semaines a ajuster les chiffres de `balance.js` sans jamais etre satisfait.
**Garde-fou** : Fixer des sessions de balance de 2h MAX. Utiliser la telemetrie pour prendre des decisions basees sur les donnees, pas l'intuition. Si un testeur ne remarque pas le desequilibre, ce n'est pas un probleme.

### Piege 2 : Le scope creep
**Risque** : Ajouter des features (PvP, guildes, mobile) avant que le core loop soit solide.
**Garde-fou** : Regle stricte -- aucune feature de l'Horizon 3 avant que l'Horizon 1 soit 100% termine et teste. Tenir une liste "parking lot" pour les idees futures.

### Piege 3 : La dette technique invisible
**Risque** : Le code est propre maintenant, mais chaque systeme ajoute (synergies, passifs, talents avances) ajoute de la complexite dans `_recomputeStats()` et `CombatSystem._resolveAttack()`.
**Garde-fou** : Ecrire un test pour chaque nouveau modificateur AVANT de l'implementer (TDD). Si `_recomputeStats()` depasse 80 lignes, extraire en sous-fonctions (`_applyPrestige()`, `_applyGacha()`, `_applyItems()`, `_applyTalents()`, `_applySynergies()`).

### Piege 4 : L'alpha eternelle
**Risque** : Ne jamais considerer le jeu "assez bien" pour le montrer. Perfectionnisme du dev solo.
**Garde-fou** : Date de l'alpha = CE VENDREDI. Envoyer aux testeurs MEME si la composition n'est pas branchee. Le feedback de vrais joueurs vaut 10x plus que du polish solo. Fixer une date de beta dans 1 mois.

### Piege 5 : Ignorer le feedback des testeurs
**Risque** : Les testeurs disent "je ne comprends pas le menu" mais le dev repond "il faut lire le guide".
**Garde-fou** : Regle du "5 secondes" -- si un testeur ne comprend pas un ecran en 5 secondes, c'est un bug de design, pas un probleme de joueur. Enregistrer les sessions de test (screen share Discord). Ne jamais expliquer verbalement ce que le jeu devrait montrer.

---

## 7. MATRICE IMPACT/EFFORT

```
IMPACT
  ^
  |
T |  [Composition]     [Passifs heros]     [Synergies]
R |  [Onboarding]                           [Tour infinie]
A |
N |
S |----------------------------------------------------
F |  [Speed x1/x2]     [Sons SFX]          [PvP async]
O |  [Screen shake]     [Talents avances]   [Nouvelles classes]
R |  [1er pull gratuit] [Modif biomes]      [Guildes]
T |  [Slow-mo boss]     [Donjon v2]
  |----------------------------------------------------
M |  [Badge rouge]      [Achievements]      [Mobile PWA]
O |  [Tooltip wave]     [Build pipeline]    [Monetisation]
Y |  [Fix totalGold]    [Tests unitaires]
E |  [Lore heros]
N |----------------------------------------------------
F |  [Dead code]        [Replay system]
A |  [Pause clavier]    [Hot-reload balance]
I |
B |
L |----+----------------+--------------------+---------->
  | <1 jour          1-3 jours           5+ jours   EFFORT
```

---

## 8. GLOSSAIRE

| Terme | Definition |
|-------|------------|
| **Auto-battler** | Genre de jeu ou le joueur compose une equipe mais le combat se deroule automatiquement. Le choix strategique est dans la preparation, pas l'execution. |
| **Core loop** | La boucle de gameplay principale. Ici : composer l'equipe → lancer un combat → gagner des ressources → ameliorer l'equipe → recommencer. |
| **Game feel** | L'ensemble des retours sensoriels (visuels, sonores, haptiques) qui rendent les interactions satisfaisantes. Aussi appele "juice". |
| **Gacha** | Systeme d'invocation aleatoire de personnages avec des rarites differentes et un mecanisme de pity (garantie apres N tirages sans resultat rare). |
| **Idle** | Genre de jeu ou la progression continue meme quand le joueur ne joue pas activement. Les gains hors-ligne sont une composante cle. |
| **Onboarding** | L'experience des premieres minutes de jeu. La facon dont le joueur apprend les mecaniques sans lire un manuel. |
| **Pity system** | Mecanisme de protection dans un gacha : apres N tirages sans obtenir un personnage rare, le prochain est garanti. Ici : 50 pulls pour SSR, 100 pour UR. |
| **Prestige** | Mecanisme de reset volontaire ou le joueur recommence a zero en echange de bonus permanents. Aussi appele "ascension" ou "rebirth". |
| **Scaling** | L'augmentation progressive de la difficulte (stats monstres) et des recompenses au fil des vagues. Formule exponentielle : `stat = base * growth^(wave-1)`. |
| **Synergie** | Bonus active quand certaines conditions de composition sont remplies (ex : 2 guerriers dans l'equipe = +10% HP). |
| **Gold sink** | Mecanisme qui retire de l'or de l'economie pour eviter l'inflation (forge, reroll, achat de slots). |
| **Meta-jeu** | Les systemes de progression qui transcendent les combats individuels : prestige, collection, achievements, classement. |
| **Quick win** | Amelioration a fort impact et faible effort. Le meilleur ratio valeur/temps. |
| **Screen shake** | Vibration breve de la camera pour accentuer l'impact d'une action (explosion, coup critique, mort de boss). |
| **Feature flag** | Variable qui active/desactive une fonctionnalite sans modifier le code. Permet de deployer du code inacheve sans l'exposer aux joueurs. |

---

## 9. BIBLIOGRAPHIE

### Jeux de reference

1. **AFK Arena (Lilith Games)** -- Reference pour l'idle auto-battler : composition d'equipe, synergies de faction, prestige, endgame tower, PvP asynchrone. Etudier leur onboarding (excellent) et leur systeme de synergies.

2. **Raid: Shadow Legends (Plarium)** -- Malgre sa reputation agressive, son systeme de build de champion (equipement, masteries, synergies d'equipe) est une reference de profondeur. Etudier les mastery trees (equivalent de nos talents).

3. **Idle Champions of the Forgotten Realms (Codename Entertainment)** -- Reference pour le game feel en idle : formations, synergies de proximite, buff stacking. Leur systeme de formation (qui est a cote de qui) est excellent.

4. **Teamfight Tactics (Riot Games)** -- Reference auto-battler pour les synergies de classe/origine, le systeme de shop, et l'equilibrage dynamique.

5. **Melvor Idle (Games by Malcs)** -- Idle game solo dev devenu un succes. Etudier leur progression (milestones clairs, deblocage progressif), leur systeme de combat, et leur approche de monetisation (version gratuite + premium).

### Articles et videos

6. **"The Compulsion Loop" -- Game Maker's Toolkit (YouTube)** -- Excellent pour comprendre les boucles de retention et comment les rendre satisfaisantes sans etre manipulatrices.

7. **"Juice it or Lose it" -- Martin Jonasson & Petri Purho (GDC Talk)** -- LA reference sur le game feel. Comment des tweens, des particules et du screen shake transforment un jeu generique en experience satisfaisante.

8. **"Idle Game Design: Engagement without Exploitation" -- GDC 2019** -- Equilibrer la retention et le respect du joueur dans les idle games.

9. **"Balancing an Economy in a F2P Idle Game" -- Kongregate Blog** -- Formules et approches pour equilibrer l'inflation/deflation dans un idle.

10. **Documentation Phaser 3 -- Camera Effects** -- Reference technique pour les screen shakes, fades, et effets visuels : `this.cameras.main.shake()`, `this.cameras.main.flash()`.

---

## 10. PROCHAINES ETAPES -- 3 taches pour demain matin

---

### Tache 1 : Brancher la composition d'equipe sur le combat

**Prompt exact pour Claude Code** :
```
Dans src/scenes/CombatScene.js, modifie _createDefaultTeam() pour :
1. Lire les assignations depuis GachaSystem.getAssignments() 
2. Creer les fighters avec les IDs de TEAM_SLOTS (u1, u2, u3, u4)
3. Appliquer les hero modifiers de GachaSystem.getHeroModifiers(fighterId) a chaque fighter
4. Si aucune assignation n'existe, garder le comportement par defaut actuel

Le but : quand un joueur assigne un hero SR Archer au slot u2 dans TeamScreen, 
le prochain combat doit creer un fighter archer avec l'id "u2" pour que 
getHeroModifiers("u2") retourne le bon statMult.

Verifie aussi que _createTeamFromSave() utilise les memes IDs pour la coherence.
Ne casse pas le comportement existant si aucun hero n'est assigne.
```

**Verification** : Lancer le jeu, assigner un heros dans TeamScreen, lancer un combat, verifier dans la console (F9 telemetrie overlay) que le fighter a les stats boostees.

---

### Tache 2 : Activer les enchantements manquants

**Prompt exact pour Claude Code** :
```
Dans src/entities/Fighter.js, fonction _recomputeStats() :
1. Les enchantements speed%, gold%, xp%, heal% sont definis dans items.js ENCHANT_POOL 
   mais ignores dans _recomputeStats(). 
2. Pour speed% : modifier this.atkSpeed (reduire le delai d'attaque de speed%)
3. Pour gold% et xp% : stocker comme proprietes sur le fighter (this.goldBonus, this.xpBonus) 
   pour que CombatSystem puisse les lire au moment du reward
4. Pour heal% : stocker comme this.healPowerBonus pour que _resolveHeal() l'utilise

Ensuite dans CombatSystem.js :
5. Dans le calcul de reward (computeKillReward ou la ou l'or est attribue), 
   lire la somme des goldBonus de l'equipe et l'appliquer
6. Dans le calcul d'XP, lire la somme des xpBonus de l'equipe et l'appliquer
```

**Verification** : Equiper un item avec enchantement gold% et verifier que les gains d'or augmentent (comparer telemetrie avant/apres).

---

### Tache 3 : Quick wins visuels (screen shake + vitesse)

**Prompt exact pour Claude Code** :
```
3 quick wins a implementer :

1. SCREEN SHAKE sur kill boss : dans CombatSystem.js, quand un boss meurt 
   (dans le handler de victoire de wave boss), ajouter :
   this.scene.cameras.main.shake(150, 0.005);

2. SLOW-MOTION sur kill boss : juste avant le screen shake, ajouter :
   this.scene.time.timeScale = 0.3;
   this.scene.time.delayedCall(200, () => { this.scene.time.timeScale = savedTimeScale; });
   (sauvegarder le timeScale courant avant pour ne pas casser le x2/x4)

3. BOUTONS VITESSE x1/x2/x4 dans le Cockpit (src/ui/Cockpit.js) :
   Ajouter 3 boutons dans le top bar qui modifient scene.time.timeScale.
   Le bouton actif a un style distinct (border doree).
   Stocker la preference dans localStorage pour la conserver entre sessions.
```

**Verification** : Jouer jusqu'a wave 5 (premier boss), verifier le screen shake + ralenti. Tester les boutons de vitesse et verifier qu'ils persistent apres un refresh.

---

*Document genere le 14 avril 2026. A mettre a jour apres chaque session de playtesting.*
