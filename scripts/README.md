# Multi-agent dev loop

Un script Node.js qui orchestre 3 agents Claude pour implémenter une tâche de manière autonome.

## Ce que ça fait

1. **Planner** 🧭 — lit le code de ton jeu, décompose la tâche en étapes
2. **Developer** 🛠️ — produit un diff `.patch` qui implémente le plan
3. **Reviewer** 🔍 — critique le diff, demande des corrections si besoin

Boucle Developer ↔ Reviewer jusqu'à 3 fois si le Reviewer refuse. Le patch est écrit dans `scripts/out/` — **jamais appliqué automatiquement**. Tu reviews, puis tu fais `git apply` si tu veux.

## Setup (5 minutes, une seule fois)

### 1. Installer Node.js

Si tu ne l'as pas déjà : [nodejs.org](https://nodejs.org/) → version LTS.

### 2. Installer la dépendance

Depuis la racine du projet :

```bash
npm init -y
npm install @anthropic-ai/sdk
```

Ça crée un `package.json` et installe le SDK.

### 3. Récupérer une clé API Anthropic

- Va sur [console.anthropic.com](https://console.anthropic.com/)
- Onglet **API Keys** → **Create Key**
- Copie la clé (`sk-ant-...`)
- Ajoute des crédits si tu n'en as pas (5 € suffisent pour ~15-20 runs)

### 4. Ouvrir un terminal dans le projet

```bash
cd "C:\Idle game"
set ANTHROPIC_API_KEY=sk-ant-ta-cle-ici
```

(sur Mac/Linux, remplace `set` par `export`)

## Utilisation

```bash
node scripts/agent-loop.js "Ajouter un tracker items_equipped dans ItemSystem.equip()"
```

Tu vas voir défiler dans le terminal :

```
🧭  [PLANNER]  Décomposition de la tâche…
🧭  [PLANNER]  Plan (risque low) :
  Résumé    : Ajouter un appel AchievementSystem.track dans equip()
  Fichiers  : src/systems/ItemSystem.js
  Étapes    : 2
🛠️  [DEVELOPER]  Round 1/3 — génération du diff…
🛠️  [DEVELOPER]  18 lignes de diff produites
🔍  [REVIEWER]  Analyse du diff…
🔍  [REVIEWER]  ✅ Approuvé. Suggestions : 1
⚙️  [SYSTEM]  📄 Patch  → scripts/out/2026-04-14T18-42-11.patch
⚙️  [SYSTEM]  📄 Report → scripts/out/2026-04-14T18-42-11.md
```

### Appliquer le patch

```bash
git apply scripts/out/2026-04-14T18-42-11.patch
```

Si tu n'aimes pas le résultat, tu ne fais rien — le patch reste dans `out/` et tu l'ignores.

## Coûts typiques

- Un run simple (1 fichier, < 50 lignes modifiées) : **~0,30 €**
- Un run moyen (3-4 fichiers) : **~0,80 €**
- Un run complexe avec 3 rounds de corrections : **~1,50 €**

Le script utilise le **prompt caching** pour ne pas re-facturer le contexte repo à chaque appel d'agent (réduction ~80% des coûts).

## Idées de tâches à tester sur ton jeu

- `"Fix le bug H1 : AchievementSystem.track('items_equipped') jamais appelé depuis ItemSystem.equip()"`
- `"Ajoute un tracker recordPrestige() dans LeaderboardSystem et branche-le dans PrestigeSystem"`
- `"Remplace setTimeout par scene.time.delayedCall dans tous les fichiers src/entities/"`
- `"Ajoute des tests de type-check JSDoc sur les méthodes publiques de CombatSystem"`

## Sécurité

- ✅ Le script **ne push rien** sur GitHub
- ✅ Le script **ne modifie aucun fichier** de ton projet
- ✅ Il écrit **uniquement** dans `scripts/out/`
- ✅ Tu reviews le diff avant de `git apply`

## Limitations connues

- Pas de feedback sur l'exécution réelle du jeu (les agents ne peuvent pas lancer Phaser headless)
- Les diffs complexes sur plusieurs fichiers peuvent échouer à `git apply` si les agents se trompent sur les numéros de ligne
- Pas adapté aux grosses features (> 100 lignes) — préférer découper à la main en sous-tâches
- Le Reviewer approuve parfois trop vite — toujours lire le diff à la main

## Prochaines étapes possibles

Si ce POC te plaît, on peut étendre :

- **Auto-apply optionnel** avec `--apply` pour appliquer le patch direct (déconseillé en solo)
- **Agent "tester"** qui lance les tests après apply et rollback si ça casse
- **Agent "committer"** qui ouvre une PR GitHub avec description auto-générée
- **Exécution dans GitHub Actions** tous les soirs sur des tâches d'une `todo.md`
