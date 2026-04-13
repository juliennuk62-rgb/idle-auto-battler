# Idle Auto-Battler

Auto-battler idle en pixel art 2D, construit avec Phaser.js.
Voir [`GAME_DESIGN.md`](./GAME_DESIGN.md) pour le design complet du jeu.

## État actuel

**Étape 1 de la roadmap** : 1 guerrier contre 1 monstre, combat automatique en boucle.

Objectif de cette étape : valider l'ossature technique (scène Phaser, entités, système de combat tick-based, rendu isolé, données externalisées). Les sprites sont pour l'instant des rectangles colorés — ils seront remplacés à la prochaine étape graphique.

## Lancement

Le code utilise les ES modules natifs du navigateur, ce qui nécessite un serveur HTTP local (ouvrir `index.html` en `file://` ne fonctionnera pas).

### Option 1 — Python (recommandé)

```
cd "C:\Idle game"
py -m http.server 8000
```

Puis ouvrir <http://localhost:8000/> dans le navigateur.

### Option 2 — Node.js

```
cd "C:\Idle game"
npx --yes http-server -p 8000 -c-1
```

### Option 3 — VS Code Live Server

Installer l'extension « Live Server », clic droit sur `index.html` → « Open with Live Server ».

## Ce que vous devez voir

- Un rectangle bleu « Guerrier » à gauche, un rectangle rouge « Monstre » à droite.
- Deux barres de vie vertes qui se vident en temps réel.
- Un petit nudge latéral à chaque attaque, un flash blanc sur la cible touchée.
- À 0 HP : la cible fade+shrink, puis réapparaît avec HP plein après ~1 s.
- La boucle tourne indéfiniment.

## Structure du projet

```
/src
  /scenes     → scènes Phaser (CombatScene)
  /entities   → classes d'entités de jeu (Fighter)
  /systems    → systèmes transversaux (CombatSystem)
  /data       → valeurs d'équilibrage et données statiques (balance.js)
index.html    → point d'entrée, charge Phaser via CDN
GAME_DESIGN.md → design complet du jeu
```

## Prochaines étapes

Voir la section « Roadmap de développement » dans [`GAME_DESIGN.md`](./GAME_DESIGN.md).
