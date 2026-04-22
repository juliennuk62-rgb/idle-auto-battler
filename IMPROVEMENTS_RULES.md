# Règles pour les runs d'auto-amélioration

**À LIRE OBLIGATOIREMENT au début de chaque run.** Ces règles sont inviolables.

---

## 🎯 Mission

Améliorer le jeu "idle-auto-battler" (Phaser.js + DOM + Firebase) d'un cran à chaque run. Une amélioration concrète, visible pour le joueur, proprement implémentée et testable.

---

## ✅ CE QUI EST AUTORISÉ

- Ajouter/polish du contenu existant (achievements, items, dialogues, lore, missions)
- Fixer bugs identifiables avec certitude
- Améliorer l'UX d'UN SEUL écran par run
- Ajouter des animations/feedbacks visuels subtils
- Améliorer la lisibilité mobile d'un écran
- Ajouter/améliorer des sons sur une action existante
- Ajouter des variantes de dialogues ou narrator quotes
- Optimiser la performance d'un hotspot identifié (avec mesure avant/après si possible)
- Ajouter des tooltips, infos, clarifications UI
- Améliorer la narration/les textes en français

---

## ❌ CE QUI EST INTERDIT

### Systèmes sensibles à NE PAS TOUCHER
- `src/systems/AuthSystem.js` (Firebase Auth)
- `src/systems/SaveSystem.js` + toute logique de sauvegarde cloud
- `firestore.rules` et configuration Firebase
- `src/systems/ResourceSystem.js` (économie globale — gold/gems/soul)
- `src/data/balance.js` **sauf pour ajustements mineurs clairement motivés par un bug**
- La logique de `src/main.js` **sauf ajout mineur type toast/listener**

### Comportements interdits
- ❌ Ne pas refactorer du code qui marche
- ❌ Ne pas ajouter de dépendances npm (pas de `package.json` touché)
- ❌ Ne pas modifier l'architecture Phaser/scenes (CombatScene, DungeonCombatScene)
- ❌ Ne pas toucher à `index.html` sauf pour le cache bust `?v=X.X`
- ❌ Ne pas faire de "grande refonte", chaque run = 1 chantier ciblé
- ❌ Ne pas créer de nouveaux fichiers de plus de 300 lignes
- ❌ Ne pas générer du contenu IA qui n'existe pas (textes, lore) sans valider qu'il est cohérent avec le reste

### Limites de taille
- **Maximum 300 lignes modifiées par run** (additions + suppressions)
- **Maximum 5 fichiers touchés par run**
- **1 SEUL chantier cohérent par run** — pas 5 petits trucs

---

## 📋 WORKFLOW OBLIGATOIRE

Ordre strict à suivre :

### 1. Lecture du contexte (5 min)
- Lire ce fichier (`IMPROVEMENTS_RULES.md`)
- Lire `IMPROVEMENTS_LOG.md` en entier
- **Lire `BUGS_WISHLIST.md` — source prioritaire d'items à traiter**
- `git log --oneline -10` (voir les 10 derniers commits)
- Identifier ce qui a DÉJÀ été fait pour ne pas le refaire

### 2. Identification des candidats (5 min)
- **PRIORITÉ ABSOLUE** : regarder `BUGS_WISHLIST.md` et choisir un item non coché (`[ ]`). Les items de la wishlist sont les priorités de l'utilisateur.
- Si tous les items de la wishlist sont cochés OU aucun n'est faisable dans le scope (gros chantiers exclus), seulement alors faire de la recherche libre.
- Dans tous les cas : lister **3 à 5 idées candidates** et documenter ton choix
- Éliminer celles déjà faites selon LOG/git log
- Éliminer celles qui violent les règles ci-dessus
- Choisir **UNE** candidate avec le meilleur ROI (impact joueur ÷ effort)

### 2bis. Si tu traites un item de la wishlist
- Coche-le dans `BUGS_WISHLIST.md` : `- [x] **#X — titre** ✅ Run #N (YYYY-MM-DD)`
- Mentionne `Wishlist item : #X` dans la section "Choix" du LOG
- Inclus le commit du `BUGS_WISHLIST.md` dans ta branche

### 3. Implémentation (majorité du temps)
- Lire les fichiers à modifier **en entier** avant d'éditer
- Implémenter le changement proprement
- Respecter le style du codebase existant
- Commentaires en français si le fichier est en français

### 4. Vérification
- `node --check` sur chaque fichier .js modifié (doit passer)
- Si UI touchée : vérifier mentalement que le changement tient debout sur desktop ET mobile
- Pas de `console.log` oublié

### 5. Commit sur BRANCHE SÉPARÉE (jamais sur main)
```
git checkout -b auto-improve/YYYY-MM-DD-HHmm
git add <fichiers précis, pas -A>
git commit -m "auto-improve: <description>"
git push -u origin auto-improve/YYYY-MM-DD-HHmm
```

### 6. Journal
- Ajouter une nouvelle entrée à la FIN de `IMPROVEMENTS_LOG.md`
- Commit ce changement AUSSI (sur la même branche)
- Format strict (voir le template en haut du LOG)

### 7. Rapport final
Le run doit se terminer par un message récapitulatif :
- Ce qui a été fait
- Sur quelle branche
- Lignes modifiées totales
- Si rien n'a été fait, pourquoi

---

## 🚫 Cas "Rien trouvé ce tour"

Si aucune idée ne passe les critères (toutes déjà faites, toutes interdites, ou scope trop gros), c'est **OK**. Il faut :
1. Ajouter une entrée "Rien trouvé" dans le LOG avec la liste des idées considérées et pourquoi rejetées
2. Ne PAS forcer un changement bidon
3. Ne PAS créer de commit ni de branche

**Mieux vaut ne rien faire qu'un mauvais travail.**

---

## 🔒 Garde-fous

- ❗ Si tu dois modifier plus de 5 fichiers → STOP, trop gros, redécoupe ou abandonne
- ❗ Si tu dois casser l'API publique d'une classe → STOP, c'est hors scope
- ❗ Si tu n'es pas sûr à 90% que ton changement est correct → abandonne l'idée, prends-en une autre
- ❗ Jamais de `git push --force`, jamais `git reset --hard`, jamais modifier un commit déjà sur main
