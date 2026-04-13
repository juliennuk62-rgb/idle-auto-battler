# GAME_DESIGN.md

## Vue d'ensemble

**Genre** : Auto-battler idle 2D pixel art
**Plateforme cible** : Web (navigateur)
**Stack technique** : Phaser.js + HTML/CSS/JS, sauvegarde localStorage
**Concept** : Le joueur dirige une équipe de combattants qui affronte automatiquement des vagues de monstres. La progression repose sur le recrutement, l'évolution et la fusion d'unités à travers un système de grades et de classes.

---

## Boucle de jeu principale

1. L'équipe combat automatiquement la vague de monstres en cours.
2. Chaque monstre tué rapporte de l'or, les boss rapportent des objets rares.
3. Le joueur dépense ses ressources pour : recruter, améliorer, faire évoluer ses unités.
4. L'équipe progresse vers des vagues plus difficiles.
5. À un certain palier, le joueur "prestige" pour relancer avec un bonus permanent.

---

## Système de combat

- **Automatique** : aucune action de combat directe du joueur.
- **Tick-based** : chaque unité a une cadence d'attaque (ex. 1.2s).
- **Ciblage** : configurable par classe (le plus proche, le plus faible, le plus fort).
- **Formation** : 2 lignes (avant / arrière). Les unités de mêlée ciblent en priorité la ligne avant ennemie.
- **Mort d'unité** : effet visuel (flash + poof), retrait du combat. Réapparition à la prochaine vague avec HP pleins.
- **Fin de vague** : tous les monstres morts → vague suivante, scaling de difficulté.
- **Défaite** : équipe entière morte → retour à la vague 1 (ou checkpoint), conservation des ressources.

---

## Classes d'unités

| Classe | Rôle | Position | Particularité |
|---|---|---|---|
| Guerrier | Tank / mêlée | Avant | Beaucoup d'HP, dégâts moyens |
| Archer | DPS distance | Arrière | Dégâts élevés, fragile |
| Mage | Dégâts de zone | Arrière | Touche plusieurs ennemis, cooldown long |
| Soigneur | Support | Arrière | Restaure les HP des alliés |

*(D'autres classes pourront être ajoutées plus tard sans modifier l'architecture.)*

---

## Système de grades

Chaque classe possède sa propre chaîne de grades. Exemple pour le Guerrier :

Recrue → Soldat → Guerrier → Vétéran → Chevalier → Champion → Héros → Légende

**Mécanique d'évolution** : fusion. Trois unités d'un même grade peuvent fusionner en une unité du grade supérieur. Chaque grade a son propre sprite pixel art.

**Niveaux à l'intérieur d'un grade** : chaque unité gagne de l'XP en combattant et monte en niveau (1 à 10 par grade), augmentant ses stats.

---

## Composition d'équipe

- **Taille initiale** : 3 unités actives.
- **Évolution** : déblocage d'emplacements supplémentaires via la progression, jusqu'à 6 max.
- **Roster** : le joueur possède un vivier d'unités plus large que son équipe active. Il choisit qui combat.

---

## Économie

- **Or** : ressource principale, gagnée à chaque monstre tué. Sert à recruter et améliorer.
- **Gemmes** : ressource rare, droppée par les boss. Sert aux évolutions spéciales et au prestige.
- **Fragments d'âme** : ressource de prestige, gagnée uniquement via le reset.

---

## Progression hors-ligne

À la reconnexion, le jeu calcule les gains accumulés pendant l'absence :
- Or gagné = (or par seconde de la dernière vague atteinte) × (temps écoulé) × 0.5
- Plafond : 8 heures d'accumulation maximum.
- Pas de progression de vague hors-ligne (le joueur doit être actif pour avancer).

---

## Prestige (méta-progression)

Quand le joueur bloque sur une vague, il peut "prestiger" :
- Reset complet de l'équipe et de l'or.
- Conservation des fragments d'âme et des bonus permanents achetés.
- Bonus permanents : +X% dégâts, +X% or, départ avec une unité de grade supérieur, etc.

---

## Équilibrage (formules de référence)

Toutes les formules sont centralisées dans `balance.js` :

```js
const BALANCE = {
  monster_hp_base: 20,
  monster_hp_growth: 1.15,   // hp = base * growth^wave
  monster_atk_base: 5,
  monster_atk_growth: 1.12,
  gold_per_kill_base: 3,
  gold_growth: 1.10,
  unit_xp_per_kill: 5,
  fusion_cost: 3,            // 3 unités → 1 du grade au-dessus
  offline_efficiency: 0.5,
  offline_cap_hours: 8,
};
```

---

## Architecture technique

### Structure de fichiers prévue

```
/src
  /scenes        → scènes Phaser (Combat, Roster, Menu)
  /entities      → classes Unit, Monster, Team
  /systems       → CombatSystem, FusionSystem, SaveSystem, TelemetrySystem
  /data          → units.json, monsters.json, balance.js, config.js
  /ui            → composants UI (roster, boutons, overlays, TelemetryOverlay)
/assets
  /sprites       → sprites pixel art
  /sfx           → sons (plus tard)
/docs            → documentation technique (TELEMETRY.md, …)
/tests           → tests unitaires + harness browser
```

### Télémétrie de combat

Un système de télémétrie (`src/systems/TelemetrySystem.js`) collecte les
événements de combat (`combat_started`, `attack_performed`, `unit_died`,
`wave_ended`, `unit_levelup`) pour permettre l'équilibrage sur données
réelles et alimenter une future UI de stats joueur. Activable/désactivable
via `CONFIG.telemetry_enabled` (no-op complet quand désactivé). Les agrégats
cumulés sont persistés dans `localStorage`, les événements bruts tournent
dans un buffer circulaire mémoire (100 derniers combats). Un overlay debug
accessible par `F9` (`src/ui/TelemetryOverlay.js`) permet de lire les stats
en temps réel et d'exporter un dump JSON complet. Voir `docs/TELEMETRY.md`
pour le schéma exhaustif et la procédure d'ajout d'un événement.

### Données externes

Les unités et monstres sont décrits en JSON pour pouvoir être ajoutés sans toucher au code :

```json
{
  "id": "warrior_recruit",
  "class": "warrior",
  "grade": 1,
  "name": "Recrue",
  "hp": 80,
  "atk": 8,
  "atk_speed": 1.2,
  "targeting": "closest",
  "sprite": "warrior_recruit.png"
}
```

---

## Pixel art : règles de cohérence

- **Résolution sprites** : 64×64 px par unité.
- **Palette** : limitée à 32 couleurs maximum, partagée entre tous les assets.
- **Style** : contours sombres 1px, vue de 3/4 face, éclairage du haut.
- **Animations** : idle (2 frames), attaque (3 frames), mort (effet code, pas d'animation).
- **Génération** : tous les sprites passent par un post-traitement (réduction palette + nearest neighbor).

---

## Roadmap de développement

1. Setup Phaser + 1 guerrier vs 1 monstre (combat auto basique).
2. Passage à 3 unités vs 1 monstre (gestion d'équipe + ciblage).
3. Vagues de monstres (groupes, scaling).
4. Système de classes (Guerrier + Archer + formation 2 lignes).
5. Or + UI de roster minimale.
6. Niveaux d'unités via XP.
7. Système de grades et fusion.
8. Sauvegarde localStorage + progression hors-ligne.
9. Polish visuel (animations, dégâts flottants, effets de mort).
10. Prestige et bonus permanents.
11. Ajout des classes Mage et Soigneur.
12. Contenu : nouveaux monstres, boss, vagues spéciales.

---

## Principes de design à respecter

- **Lisibilité avant tout** : le joueur doit comprendre ce qui se passe à l'écran sans effort.
- **Feedback immédiat** : chaque action (kill, level up, fusion) doit avoir un effet visuel et sonore.
- **Pas de mur sans porte** : si le joueur bloque, il doit toujours voir une option (améliorer, prestiger, changer de formation).
- **Données externalisées** : aucune valeur d'équilibrage en dur dans le code.
- **Itérations courtes** : chaque étape de la roadmap doit être jouable avant de passer à la suivante.
