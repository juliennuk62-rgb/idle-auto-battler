# Wishlist de bugs et améliorations (source prioritaire pour les runs auto)

**Consigne aux runs d'auto-amélioration :**
Tu dois consulter ce fichier à chaque run et **prioriser** les items listés ici. Un item coché `[x]` est fait, `[ ]` est à faire. Lorsque tu traites un item, ajoute son numéro dans ton entrée du LOG et coche-le dans ce fichier (commit inclus dans ta branche).

Si tous les items de cette liste sont déjà cochés, retombe sur la recherche libre d'idées.

---

## 🔧 Bugs à fixer

- [x] **#B2 — Apparition des alliés cassée sur nouveau biome** ✅ v4.2
  Fix dans `CombatSystem.startNextBiome()` : force le respawn de tous les alliés morts avant de reprendre le combat. Sans ça, un héros qui mourait pile pendant le changement de biome pouvait rester "mort" (timer respawn interrompu par la pause de préparation).

- [x] **#B7 — Timeline grisée lors du respawn sur vague supérieure** ✅ v4.2
  Résolu par le fix #B2 — même racine. La classe `.dead` sur UnitCard (qui applique `grayscale(1)`) restait coincée quand le fighter ne se ressuscitait pas au biome change. Le respawn forcé résout l'affichage grisé.

- [x] **#B11 — Conflit de niveaux des héros à vérifier** ✅ v4.2
  Ajout d'une méthode `Fighter.setLevel(newLevel)` qui force `_recomputeStats()` + `_updateLabel()`. À utiliser pour toute modification externe de `fighter.level` afin d'éviter la désynchronisation level affiché / stats réelles.

- [x] **#B12 — x4 qui saute toutes les 5 vagues** ✅ v4.2
  Bug trouvé : le slow-mo boss kill (ligne 510 CombatSystem) remettait `timeScale = 1` en dur au lieu de restaurer la valeur avant slow-mo. Comme les boss apparaissent toutes les 5 vagues, le speed x2/x4 choisi par le joueur était reset à x1 à chaque boss. Fix : sauvegarde de `prevTimeScale` avant slow-mo et restauration après.

- [x] **#B14 — Temps affiché dans stats fin de combat incorrect en x2/x4** ✅ v4.2
  Fix dans `TelemetrySystem` : ajout d'un champ `gameTimeElapsed` alimenté par `tickGameTime(scaledDelta)` appelé depuis `CombatScene.update()`. La durée reportée dans les stats utilise désormais le temps "jeu" (cohérent quel que soit le timeScale) au lieu du temps réel wall-clock.

---

## ✨ Quick wins UX (petit effort)

- [x] **#Q1 — Stuff pour le healer** ✅ v4.2
  `Fighter._recomputeStats()` calcule désormais `this.healPower` (depuis les enchants `heal_power` flat) et `this.healReceived` (depuis le set bonus 3-pièces Grottes). `CombatSystem._resolveHeal()` utilise `(healer.atk + healer.healPower) × (1 + (synergies + target.healReceived)%)` pour le calcul de soin. Les items healer ont maintenant un vrai impact.

- [x] **#Q3 — Pictos sur les récompenses de missions** ✅ Session manuelle 2026-04-20
  Pictos 💰 (or) et ◇ (gems) ajoutés dans MissionScreen + MissionToast, avec CSS dédié (drop-shadow, couleurs).

- [x] **#Q4 — Baisser le drop rate d'items par vague** ✅ Session manuelle 2026-04-20
  `base_drop_rate` : 15% → 8%, `drop_rate_per_wave` : 0.5% → 0.3%. Au wave 20 : 25% → 14%, au wave 50 : 40% → 23%.

- [x] **#Q5 — Animation feedback sur le forge** ✅ Session manuelle 2026-04-20
  Overlay `forge-reveal-card` avec scale+rotate pop-in, icône flottante, stats affichées, auto-close 2.5s ou clic.

- [x] **#Q6 — Afficher l'or disponible dans l'UI forge** ✅ Session manuelle 2026-04-20
  Indicateur `forge-gold-indicator` ajouté au-dessus du bouton forge avec or dispo + coût + manque éventuel. Bouton disabled si insuffisant.

- [x] **#Q9 — Fond coloré différent par slot type (arme/armure/anneau)** ✅ Session manuelle 2026-04-20
  CSS `[data-type="weapon"]` (rouge), `[data-type="armor"]` (bleu), `[data-type="accessory"]` (vert) avec gradient et border assortis.

---

## 🏔 Gros chantiers (NE PAS attaquer en runs auto — sessions dédiées)

> Ces items violent la règle "max 300 lignes / 5 fichiers" des runs automatiques. Laisser pour sessions manuelles avec l'utilisateur.

- [x] **#G8 — Refonte globale inventaire avec filtre + tri haut de gamme** ✅ Session manuelle 2026-04-20 (v4.0) — toolbar compteur + search + filtres rareté/set/équipé + tri 6 options + batch sell par rareté + comparateur diff ATK/HP + badges ON/tier + responsive mobile.
- [x] **#G10 — Refonte invocations/coffres "grosse dopamine"** ✅ Session manuelle 2026-04-20 (v3.9 + v4.0) — invocations (suspense/crash/aura/typewriter) + coffres (stars bg / aura pulse / halo glow / 8 rays divergents / screen shake / vibration / skip button / sons).
- [x] **#G13 — UI 100% étirable auto responsive** ✅ Session manuelle 2026-04-20 (v4.1) — variables fluides (`--container-max`, `--fs-*` via clamp), containers principaux refondus (menu/invocation/coffres/missions/collection/team/bestiaire), Modal.js auto-responsive, 3 breakpoints ajoutés (≥1600px ultra-wide / ≥2200px 4K / portrait court).

---

## 📝 Comment cocher un item

Quand un run complète un item :

```markdown
- [x] **#Q6 — Afficher l'or disponible dans l'UI forge** ✅ Run #N (YYYY-MM-DD)
```

Et dans `IMPROVEMENTS_LOG.md`, mentionner `Wishlist item : #Q6` dans la section "Choix".

---

## 📅 Historique

- **2026-04-20** : Wishlist créée par l'utilisateur (14 items identifiés)
