# Télémétrie de combat

Système de collecte d'événements de combat pour équilibrage et statistiques joueur.

## Objectifs

- **Équilibrage** : disposer de données réelles (DPS, durées, taux de survie) pour
  tuner les formules dans `balance.js`.
- **Stats joueur** : alimenter une future UI de statistiques consultables en jeu.
- **Non-intrusif** : zéro impact perf grâce à un flag `telemetry_enabled` qui
  transforme toutes les méthodes en no-op quand il est `false`.
- **Exportable** : dump JSON complet pour analyse hors-ligne.
- **Testable en isolation** : aucune dépendance à Phaser dans le cœur du
  module ; la classe `TelemetrySystemImpl` est exportée pour les tests.

## Fichiers concernés

| Fichier                              | Rôle                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| `src/systems/TelemetrySystem.js`     | Cœur du module (classe + singleton).                  |
| `src/ui/TelemetryOverlay.js`         | Overlay debug Phaser (toggle F9, export JSON).        |
| `src/data/config.js`                 | Flag `telemetry_enabled` + taille buffer + clé store. |
| `tests/telemetry.test.js`            | Tests unitaires purs.                                 |
| `tests/test-harness.html`            | Runner browser des tests.                             |

La collecte est émise depuis `src/systems/CombatSystem.js` aux points clés du
combat. Aucune autre partie du code ne doit importer `TelemetrySystem`
directement — le singleton est partagé et thread-safe par défaut.

## Événements

Chaque événement est un objet **plat, sérialisable JSON**, avec au minimum
les champs `type` (string) et `t` (ms relatifs au début du combat).

### `combat_started`

Émis par `TelemetrySystem.startCombat(waveId, team, monsters)`.

```jsonc
{
  "type": "combat_started",
  "t": 0,
  "waveId": 1,
  "team":     [ { "id": "u1", "class": "warrior", "grade": 1, "level": 1 }, ... ],
  "monsters": [ { "id": "u4", "class": "monster", "grade": 1, "level": 1 } ]
}
```

Les tableaux `team` et `monsters` sont des **snapshots** au moment du démarrage
du combat — même si une unité change de grade/level en cours de combat, le
snapshot reste figé.

### `attack_performed`

Émis par `CombatSystem._resolveAttack()` après l'application des dégâts.

```jsonc
{
  "type": "attack_performed",
  "t": 200,               // ms depuis le début du combat
  "attackerId": "u1",
  "targetId": "u4",
  "damage": 8,            // dégâts effectivement infligés (clampés à hp restant)
  "damageBlocked": 0,     // réservé (armure/résistance, pas encore implémenté)
  "critical": false       // réservé (crits, pas encore implémenté)
}
```

Note : `damage` est mesuré via `hpBefore - hpAfter`, donc sur le coup létal
on verra la valeur exacte consommée (pas le dégât brut de l'attaquant).

### `unit_died`

Émis juste après un `attack_performed` qui met `hp` à 0.

```jsonc
{
  "type": "unit_died",
  "t": 200,
  "unitId": "u4",
  "side": "enemy",        // 'ally' | 'enemy'
  "killedBy": "u3"        // id de l'attaquant qui a porté le coup létal
}
```

### `wave_ended`

Émis par `TelemetrySystem.endCombat(result)` à la fin d'un combat.

```jsonc
{
  "type": "wave_ended",
  "t": 200,               // = duration totale du combat
  "result": "victory",    // 'victory' | 'defeat'
  "duration": 200,        // ms
  "gold": 0,              // stub — toujours 0 jusqu'à l'étape 5 (or)
  "xp": 0                 // stub — toujours 0 jusqu'à l'étape 6 (XP)
}
```

### `unit_levelup` *(réservé, pas encore émis)*

Sera émis à l'étape 6 de la roadmap quand les unités gagneront de l'XP.
Schéma prévu :

```jsonc
{
  "type": "unit_levelup",
  "t": 1234,
  "unitId": "u1",
  "oldLevel": 3,
  "newLevel": 4
}
```

## Agrégats cumulés

Persistés dans `localStorage` sous la clé définie par
`CONFIG.telemetry_storage_key` (`telemetry_aggregates` par défaut). Mis à jour
à chaque `endCombat()` puis `JSON.stringify`-és.

La méthode `TelemetrySystem.getAggregates()` retourne une **vue calculée**
(pas la structure interne brute) :

| Clé                      | Type                         | Description                                                    |
| ------------------------ | ---------------------------- | -------------------------------------------------------------- |
| `combatsPlayed`          | `number`                     | Nombre total de combats terminés depuis le début de la session ou du dernier reset. |
| `totalDuration`          | `number`                     | Durée cumulée en ms passée en combat actif.                    |
| `totalGold`              | `number`                     | Or cumulé gagné (stub 0 pour l'instant).                       |
| `maxWave`                | `number`                     | Plus haute vague atteinte.                                     |
| `goldPerMinute`          | `number`                     | `totalGold / (totalDuration / 60000)`.                         |
| `damageDealtByClass`     | `{ [class]: number }`        | Dégâts cumulés infligés par classe (`warrior`, `monster`, …).  |
| `damageTakenByClass`     | `{ [class]: number }`        | Dégâts cumulés subis par classe.                               |
| `avgDurationByWave`      | `{ [waveId]: number }`       | Durée moyenne d'un combat par vague (en ms).                   |
| `unitStats`              | `{ [unitId]: UnitStats }`    | Stats par instance d'unité (voir ci-dessous).                  |
| `survivalRateByUnit`     | `{ [unitId]: 0..1 }`         | `survivals / combats` par unité (allié uniquement).            |

Où `UnitStats` est :

```jsonc
{
  "damageDealt":  456,    // cumul sur tous combats
  "damageTaken":  78,
  "deaths":       2,
  "survivals":    14,
  "combats":      16
}
```

## Buffer circulaire (combats bruts)

Les 100 derniers combats sont conservés **en mémoire uniquement** (pas dans
localStorage — le volume serait trop gros). Au-delà, les plus anciens sont
écrasés. La taille est configurable via `CONFIG.telemetry_buffer_size`.

Accès via `TelemetrySystem.getRecentCombats(n)` qui retourne les `n` derniers
combats, chacun avec son tableau complet d'événements.

## API du module

```js
import { TelemetrySystem } from './systems/TelemetrySystem.js';

// --- Collecte (appelé par CombatSystem) ---
TelemetrySystem.startCombat(waveId, team, monsters);
TelemetrySystem.recordEvent(type, payload);
TelemetrySystem.endCombat({ outcome: 'victory' | 'defeat', gold, xp });

// --- Lecture ---
TelemetrySystem.getCurrentCombatStats();     // combat en cours ou null
TelemetrySystem.getAggregates();             // cumul session ou null
TelemetrySystem.getRecentCombats(n);         // N derniers combats bruts
TelemetrySystem.exportJSON();                // dump complet (string JSON)

// --- Maintenance ---
TelemetrySystem.reset();                     // wipe tout + clear localStorage
TelemetrySystem.onPrestige(resetAggregates); // hook prestige (voir §ci-dessous)
```

Toutes les méthodes sont des **no-op** immédiats quand
`CONFIG.telemetry_enabled === false`.

## Export JSON

Deux chemins équivalents :

1. **Programmatique** :
   ```js
   const json = TelemetrySystem.exportJSON();
   // → string JSON indentée, prête à écrire dans un fichier / envoyer
   ```

2. **Interactive** via l'overlay debug : presser **F9** pour afficher
   l'overlay, cliquer sur **[ Export JSON ]**. Le browser télécharge
   automatiquement `telemetry_export_<timestamp>.json`.

Le fichier exporté contient :

```jsonc
{
  "exportedAt": 1775949425517,   // timestamp ms epoch
  "enabled": true,
  "aggregates": { /* ... vue getAggregates() ... */ },
  "recentCombats": [ /* ... N derniers combats avec leurs events ... */ ]
}
```

## Overlay debug F9

Coin supérieur droit, fond noir semi-transparent, texte monospace blanc.
Affichage en temps réel (rafraîchi à 5 Hz) :

- Vague courante + vague max atteinte + durée du combat en cours.
- DPS par unité (warriors et monsters) du combat en cours.
- HP `current/max` par unité, avec marker `†` sur les morts.
- Stats de session : combats joués, vague max, dégâts cumulés par classe.
- Bouton d'export JSON.

L'overlay n'absorbe aucun input du jeu — il écoute uniquement la touche F9
via Phaser et le pointer sur son bouton.

## Hook prestige

Par défaut, les agrégats **survivent** à un prestige : le but est de pouvoir
observer l'évolution du joueur sur la durée, en traversant plusieurs cycles
de reset. Pour wipe aussi les stats cumulées (option "Réinitialiser aussi
les statistiques" dans le menu prestige qui arrivera à l'étape 10) :

```js
TelemetrySystem.onPrestige(true);   // reset complet
TelemetrySystem.onPrestige(false);  // défaut : garde les agrégats
TelemetrySystem.onPrestige();       // idem (false)
```

## Ajouter un nouvel événement (procédure en 3 étapes)

1. **Documenter le schéma dans ce fichier** (section Événements).
   L'objet doit être plat, sérialisable JSON, et inclure au minimum un champ
   sémantique expliquant le contexte. Ne mets pas de références à des objets
   Phaser (containers, textures…) — uniquement des ids / valeurs primitives.

2. **Émettre l'événement depuis le code qui en est la source** via :
   ```js
   TelemetrySystem.recordEvent('mon_event', { ... payload ... });
   ```
   Le champ `t` est ajouté automatiquement (ms depuis le début du combat).
   Si ton event n'a pas de sens hors d'un combat, pas besoin de garde —
   `recordEvent` est déjà no-op si aucun combat n'est actif.

3. **Étendre l'agrégation si pertinent** dans `_updateAggregates()` de
   `src/systems/TelemetrySystem.js`. Parcours les events de `combat.events`
   et mets à jour la structure `aggregates`. Si tu ajoutes un nouveau champ
   d'agrégat, pense à l'initialiser dans `emptyAggregates()` pour que les
   saves legacy mergent proprement au chargement.

**Bonus** : ajoute un test unitaire dans `tests/telemetry.test.js` qui
vérifie que ton event est émis au bon moment et que son agrégation est
correcte. Le runner `tests/test-harness.html` relance tout en un rafraîchissement.

## Tests

```
http://localhost:8001/tests/test-harness.html
```

7 tests couvrant :
- Ordre des événements dans un combat simulé.
- Calcul DPS sur un cas connu.
- Buffer circulaire à 100 entrées.
- Agrégats cumulés après plusieurs combats.
- `telemetry_enabled: false` → méthodes no-op.
- `reset()` wipe complet.
- `onPrestige()` préserve par défaut, reset si demandé.

Les tests construisent des instances isolées via `new TelemetrySystemImpl({
enabled: true, storageKey: 'test_key_...' })` pour ne pas polluer la clé
localStorage de production.

## Limites et améliorations futures

- `damage` est mesuré sur `hpBefore - hpAfter`. Quand on aura de l'armure /
  résistance, il faudra émettre aussi `damageRaw` et renseigner `damageBlocked`
  correctement.
- Pas de granularité temporelle sub-ms (on utilise `Date.now()`). Si
  nécessaire pour analyser des combats très rapides, passer à
  `performance.now()` via `safeNow()`.
- Pas de batching d'événements. Si le volume devient un problème (cas d'une
  mêlée N vs M avec N, M > 20), envisager un flush groupé vers IndexedDB
  plutôt que `localStorage`.
