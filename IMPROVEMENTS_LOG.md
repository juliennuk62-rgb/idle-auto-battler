# Journal des runs d'auto-amélioration

Chaque run d'agent ajoute une entrée à la FIN de ce fichier.
Format strict à respecter pour que les runs suivants puissent s'en servir.

---

## Template (à copier à chaque nouvelle entrée)

```markdown
## Run du YYYY-MM-DD HH:mm — #N
**Status :** ✅ Amélioration livrée | ⏭ Rien trouvé ce tour

**Candidats considérés :**
- Idée A : …
- Idée B : …
- Idée C : …

**Choix :** Idée retenue + justification (pourquoi meilleur ROI)

**Problème détecté :** Description précise en 1-2 phrases.

**Action réalisée :** Ce qui a été fait, en détail.

**Fichiers touchés :**
- `chemin/fichier1.js` : nature du changement
- `chemin/fichier2.css` : nature du changement

**Lignes modifiées :** +XX / -YY

**Branche :** `auto-improve/YYYY-MM-DD-HHmm`

**Commit(s) :** `<hash>` <message>

**Résultat joueur :** Ce que le joueur va percevoir / ce qui est mieux.

**À surveiller au run suivant :** Potentielle régression à tester, ou suite à faire.
```

---

## 📌 Contexte de départ (état au 2026-04-20)

État du jeu avant le premier run d'auto-amélioration. Ces améliorations ont été faites manuellement avec Claude Code avant la mise en place du système :

- **v3.7** (dernier commit : `6ea5ec7`) : revert des SVG héros, retour aux 4 PNG de classe. PROMPTS_HEROES.md créé pour génération IA externe.
- **v3.6** : 22 héros SVG pixel art uniques (reverté — jugé pas satisfaisant)
- **v3.5** : Codex/Bestiaire complet — 5 onglets (Héros/Monstres/Boss/Items/Monde) avec système de découverte progressive
- **v3.4** : icônes SVG pixel art pour les équipements (18 SVG inline par biome × type)
- **v3.3** : fix spam infini toasts achievements (groupement 500ms)
- **v3.2** : debug inventaire (20→60 slots, auto-sell qui protège rare+, badge NEW)
- **v3.1** : menu mobile -25% + SoundSystem Web Audio natif (oscillateurs directs)
- **v3.0** : mobile responsive agressif + Firestore rules corrigées

**Systèmes actifs :**
- EventSystem (events saisonniers par calendrier)
- OpeningScreen (cinématique première fois)
- MissionSystem, AchievementSystem (60 achievements, 80 missions)
- GachaSystem (22 héros, MYTHIC tier)
- NarratorSystem (commentaires RNG contextuels)
- BestiarySystem (découverte Codex)
- TalentSystem, PrestigeSystem, DailySystem

**Contenu dormant ou partiel :**
- `src/data/items-extended.js` : 50 items uniques intégrés comme boss drops (40% chance)
- `src/data/bosses-extended.js` : 12 boss scénarisés (dialogues intégrés, mécaniques pas implémentées)
- Sprites héros individuels : en attente de génération IA externe (PROMPTS_HEROES.md)

---

## 🗂 Historique des runs

## Run du 2026-04-20 16:30 — #1
**Status :** ✅ Amélioration livrée

**Candidats considérés :**
- Idée A : Corriger et compléter les guides contextuels (GuideModal) — plusieurs guides contenaient des infos erronées (bonus prestige inexistants, nombre de héros faux) + 2 écrans (Achievements, Team) utilisaient le guide `menu` en fallback
- Idée B : Ajouter de nouvelles catégories de narratorLines (victory, levelUp, bossEncounter) — trop de recherche requise pour identifier les sites d'appel
- Idée C : Ajouter tooltips HTML `title=""` sur les boutons du menu principal — très faible valeur ajoutée puisque chaque bouton a déjà son sous-texte descriptif
- Idée D : Afficher des noms humains dans StatsModal à la place des IDs techniques (`warrior_1` etc.) — risque de casser la structure de télémétrie

**Choix :** Idée A — meilleur ROI (impact joueur direct, risque quasi nul, scope restreint à des données texte). Les joueurs qui consultaient les guides `collection` et `prestige` recevaient des infos fausses (bonus qui n'existent pas, 20 héros au lieu de 22). Les joueurs qui cliquaient le `?` depuis Achievements ou Team voyaient le guide général du menu au lieu d'un guide contextuel dédié.

**Problème détecté :**
- Guide `prestige` listait +XP%/+Vitesse d'attaque comme bonus alors que les vrais bonus sont +25%/+50% Or, +15% HP, +15% ATK, Soldat de départ.
- Guide `collection` disait "20 héros" alors qu'il y en a 22 (incluant 2 Mythiques).
- Guide `summon` n'évoquait pas la rareté Mythique existante dans HERO_RARITIES.
- `AchievementScreen` et `TeamScreen` appelaient `attachGuideButton(..., 'menu')` faute de guide dédié.
- Commentaire dans `AchievementScreen.js` disait "20 achievements" au lieu de 60 (réels : 20 v1 + 40 v2).

**Action réalisée :**
- Réécrit le guide `prestige` avec les 5 vrais bonus et leurs coûts + précisions sur le reset (vague 20 min, 1 fragment / 10 vagues, liste explicite de ce qui est conservé).
- Mis à jour le guide `collection` : 22 héros (5 par classe + 2 Mythiques), noms des milestones, mention que Mythique n'a pas de pity.
- Ajouté la ligne Mythique au guide `summon` avec rate et mult officiels.
- Ajouté deux nouveaux guides complets : `team` (3 sections) et `achievements` (3 sections).
- Mis à jour `AchievementScreen.js` et `TeamScreen.js` pour pointer sur les bons IDs.
- Corrigé le commentaire obsolète dans `AchievementScreen.js`.

**Fichiers touchés :**
- `src/data/guideContent.js` : corrections + ajout de 2 sections (team, achievements)
- `src/screens/AchievementScreen.js` : id guide + commentaire
- `src/screens/TeamScreen.js` : id guide

**Lignes modifiées :** +79 / -19 (98 au total)

**Branche :** `auto-improve/2026-04-20-run1`

**Commit(s) :** `e7d977f` auto-improve #1: corrige et complete les guides contextuels

**Résultat joueur :** Les joueurs qui consultent le `?` (aide contextuelle) dans le jeu voient enfin :
- Les bons bonus de prestige qu'ils peuvent acheter réellement (pas des bonus fantômes).
- Le vrai nombre de héros à collectionner (22) et l'existence de la rareté Mythique secrète.
- Une aide dédiée sur les écrans Équipe et Achievements (avant : guide menu générique).
Aucun changement visuel structurel — seul le texte du modal d'aide est plus précis et complet.

**À surveiller au run suivant :**
- Vérifier si d'autres textes du jeu mentionnent encore "20 héros" (ex : OpeningScreen, narrator).
- Les guides `dungeons`, `map`, `chests` semblent corrects mais n'ont pas été re-vérifiés contre le code réel — à contrôler si un run futur touche ces systèmes.
- Certains guides très courts (`talents`, `stats`, `inventory`) pourraient être enrichis dans un run futur.
