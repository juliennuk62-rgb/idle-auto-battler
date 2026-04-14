# ROADMAP — Idle Auto-Battler

> Document de synthèse des audits debug + design (avril 2026)
> Roadmap sur 3 horizons : immédiat (semaine), court terme (mois), long terme (trimestre)

---

## 1. État actuel du jeu

**Points forts**
- Architecture solide : singletons bien découplés, ES modules natifs
- Aventure TD fonctionnelle avec 6 biomes, animations vivantes (pack 10/10 appliqué)
- Gacha complet (20 héros, 4 raretés, pity), synergies (8), prestige, talents
- Donjons tour par tour en cours (grille, PA/PM, sorts, 6 familles designées)
- Sauvegarde cloud Firebase + timestamp merge
- Onboarding progressif (1 victoire = tout débloqué)

**Points faibles identifiés**
- 3 bugs critiques silencieux qui corrompent la logique de combat et les sauvegardes
- Cohérence visuelle fragmentée entre 14 écrans (tokens CSS pas appliqués partout)
- Plusieurs systèmes (achievements, talents) mal branchés aux trackers
- Performance des particules non poolée
- Pas encore de contenu "endgame" véritable (prestige + infinite + achievements seulement)

---

## 2. Bugs à corriger — Triés par sévérité

### CRITIQUES (à fixer cette semaine)

**C1. Revive inversé dans `CombatSystem._handleKill`**
- Le check `wasEnemy` empêche les passifs `autoRevive` et `infiniteRevive` de se déclencher sur les alliés
- Impact : héros SSR/UR avec revive ne revive jamais → joueur pense que la rareté ne sert à rien
- Fix : inverser la condition et tester sur une vraie mort d'allié

**C2. Fuite mémoire des tweens idle dans `Fighter.js`**
- `_startIdleAnim()` crée un tween infinite jamais stoppé dans `die()` ni `removeAlly()`
- Impact : 20-50 MB de RAM/heure pendant les sessions longues (idle marathon)
- Fix : stocker `this._idleTween` et le `.stop()` + `.remove()` dans `die()`

**C3. Race condition cloud save quand `cloudTs = 0`**
- Si le compte cloud est vide (`cloudTs = 0`), n'importe quelle save locale est considérée "plus récente"
- Impact : nouvelle connexion sur un PC vierge écrase l'ancien cloud save avec du vide
- Fix : si `cloudTs === 0 && localKeys.length === 0`, ne pas merger — demander confirmation

### HAUTES (à fixer dans le mois)

**H1. Tracker `items_equipped` jamais appelé**
- `AchievementSystem.track('items_equipped')` n'est invoqué nulle part dans `ItemSystem.equip()`
- Impact : achievement "Équiper 10 items" impossible à débloquer
- Fix : ajouter l'appel dans la méthode `equip`

**H2. Particules projectiles/impact non poolées**
- Chaque projectile crée son propre `add.particles` → accumulation en vagues longues
- Impact : chute FPS après wave 50+
- Fix : réutiliser un emitter unique par scène, juste emit() à la volée

**H3. `SynergySystem.healPercent` NaN risk**
- Si `fighter.maxHp` est undefined (fighter juste spawné), `healPercent * maxHp` = NaN
- Impact : soins synergie healer appliquent 0 dmg invisible
- Fix : guard `if (Number.isFinite(fighter.maxHp))`

### MOYENNES (backlog)

**M1.** Modal Prestige ne rafraîchit pas après reset (besoin de reload manuel)
**M2.** `OnboardingSystem.consumeNotification()` peut perdre des notifs si 2 palliers en un combat
**M3.** Boutons "Retour" incohérents (parfois `location.reload`, parfois callback)
**M4.** `InventoryModal` ne montre pas le bonus de synergie dans le preview

### BASSES (amélioration continue)

L1-L10 : floating damage overlap, tooltips héros trop denses, scroll molette inversé sur la carte, durée des notifications toasts trop courte, etc.

---

## 3. Améliorations de design — Top 10 quick wins

### Design system
1. **Appliquer les tokens CSS partout** — 60% des écrans utilisent encore des hex en dur au lieu de `var(--color-primary)`. Factoriser.
2. **Unifier les boutons** — 5 styles différents aujourd'hui (menu-btn, cta-btn, modal-btn, action-btn, icon-btn). En garder 3 max avec variants.
3. **Grille de spacing 8px** — actuellement : padding 12px, 15px, 20px, 24px au hasard. Normaliser à multiples de 8.

### Lisibilité & feedback
4. **Typographie hiérarchisée** — h1/h2/h3 n'ont pas de tailles cohérentes entre écrans. Définir échelle 1.125.
5. **Tooltip héros en hover long** — beaucoup d'infos importantes cachées derrière un clic, montrer en hover 500ms.
6. **Toast system unifié** — remplacer les 3 systèmes actuels (notif onboarding, mission claim, error) par un seul composant.

### Visual polish
7. **Portraits de héros plus grands dans TeamScreen** — passer de 64px à 96px, ajouter glow rareté animé.
8. **Parallax sur le menu principal** — background avec 3 couches qui bougent au mouvement souris (vibe premium immédiate).
9. **Transitions entre écrans** — actuellement cut sec, ajouter fade 200ms + slide.
10. **Barre de vie avec gradient + shake sur dmg** — déjà partiellement en place, étendre aux fiches héros.

---

## 4. Nouvelles fonctionnalités — Ranking impact/effort

| # | Feature | Impact | Effort | Priorité |
|---|---------|--------|--------|----------|
| F1 | **Système de mouvement TD complet** | Très haut | Moyen | ⭐⭐⭐ |
| F2 | **Mode PvP asynchrone** (combat contre équipes d'autres joueurs) | Haut | Haut | ⭐⭐ |
| F3 | **Donjons roguelike** (base déjà posée, finir phases 2-4) | Très haut | Haut | ⭐⭐⭐ |
| F4 | **Battle Pass saisonnier** (30 niveaux, 2 tracks) | Haut | Moyen | ⭐⭐ |
| F5 | **Craft & fusion d'items** (combiner 3 R → 1 SR avec % succès) | Haut | Moyen | ⭐⭐⭐ |
| F6 | **Guildes / Clans** (chat + buffs passifs) | Moyen | Très haut | ⭐ |
| F7 | **Raid Boss hebdomadaire** (coop avec guildes) | Haut | Haut | ⭐ |
| F8 | **Événements saisonniers** (Halloween, Noël avec biomes temporaires) | Moyen | Moyen | ⭐⭐ |
| F9 | **Expansion arbre de talents** (3 branches par classe × 4 classes) | Haut | Moyen | ⭐⭐⭐ |
| F10 | **Leaderboard mode infini** | Moyen | Faible | ⭐⭐⭐ |

---

## 5. Roadmap à 3 horizons

### Horizon immédiat (cette semaine)
- [ ] Fix C1 (revive inversé) + C2 (tween leak) + C3 (race cloud)
- [ ] Fix H1 (items_equipped tracker)
- [ ] Quick wins design : tokens CSS uniformisés (#1), toast unifié (#6), portraits XL (#7)
- [ ] Leaderboard local mode infini (F10 — low effort, gros retour)

### Horizon court terme (ce mois)
- [ ] Finir les donjons roguelike (F3 phases 2 & 3 — sorts + IA + familles)
- [ ] Système de craft d'items (F5)
- [ ] Expansion talents 4 classes × 3 branches (F9)
- [ ] Fix tous les bugs HIGH + MEDIUM
- [ ] Polish design : transitions écrans (#9), parallax menu (#8)

### Horizon long terme (ce trimestre)
- [ ] Système mouvement TD complet (F1) — rework du combat principal
- [ ] Battle Pass S1 (F4) avec contenu narratif
- [ ] Événement Noël (F8) avec biome neige spécial
- [ ] PvP asynchrone (F2) avec top 100
- [ ] Raid Boss hebdo (F7) si la base de joueurs grandit

---

## 6. Vision long terme

Le jeu a aujourd'hui une **bonne base mécanique** mais manque de **rétention longue**. Les 3 piliers à renforcer :

1. **Social** — guildes, leaderboard, PvP (partager avec les 5-10 testeurs actuels)
2. **Progression infinie** — battle pass saisonnier pour que chaque mois apporte du nouveau
3. **Variété stratégique** — craft, expansion talents, raids coop pour que les builds aient vraiment de la profondeur

**Objectif 3 mois** : un joueur doit pouvoir lancer le jeu chaque jour pendant 15-30 min et trouver quelque chose de nouveau à faire (daily, raid, PvP, donjon, events).

---

## 7. Prochaine étape

Tu as 4 chemins possibles pour attaquer maintenant. Je te pose la question ci-dessous avec les options les plus pertinentes.
