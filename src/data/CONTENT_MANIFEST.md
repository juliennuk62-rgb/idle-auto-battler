# Content Manifest — État du contenu intégré

Document de référence pour savoir ce qui est **live** (actif dans le jeu) vs **dormant** (data de référence en attente de système).

## ✅ Live (actif)

| Fichier | Contenu | Système qui le consomme |
|---------|---------|-------------------------|
| `heroes.js` | 20 héros (5 par classe) | GachaSystem, TeamSystem |
| `items.js` | Templates items + enchants procéduraux | ItemSystem, loot |
| `monsters.js` | Monstres procéduraux par biome | CombatSystem |
| `biomes.js` | 6 biomes | MapScreen, CombatScene |
| `missions.js` | Missions daily de base | MissionSystem |
| `talents.js` | Talents par classe (base) | TalentSystem |
| `balance.js` | Paramètres gameplay globaux | Partout |
| `grades.js` | Système de grades R/SR/SSR/UR | Fighter, GachaSystem |
| **`achievements-v2.js`** | **40 achievements supplémentaires** | **AchievementSystem (v1 + v2)** |
| `events.js`, `achievements`... | Divers | |

## 💤 Dormant (data de référence, pas encore branchée)

Ces fichiers contiennent du contenu produit par le **content-atelier** (one-shot API Anthropic, avril 2026). Ils sont dans `src/data/` pour être facilement intégrables plus tard, mais **aucun système ne les lit pour l'instant**.

| Fichier | Contenu | À faire pour activer |
|---------|---------|----------------------|
| `items-extended.js` | 50 items uniques (épiques/légendaires/mythiques) | Ajouter rareté `mythic` + système de drop spécial + effets procs |
| `bosses-extended.js` | 12 boss scénarisés avec mécaniques | Extension CombatSystem pour gérer `mechanics` + UI dialogues |
| `events-calendar.js` | 15 événements temporaires (saisonniers + hebdo) | Créer `EventSystem` qui lit le calendrier + applique modifiers |
| `balance-tables.js` | Courbes XP, pity gacha, formules prestige | Comparer avec `balance.js` existant, migrer progressivement |

## 🗑 Non intégré (problèmes à régler)

| Fichier | Problème | Où il est |
|---------|---------|-----------|
| `lore.js` | Anglais + IDs héros inventés (pas les vrais du jeu) | `scripts/out/content-atelier/data/lore.js` |
| `missions-extended.js` | 80 missions mais en anglais | `scripts/out/content-atelier/data/missions-extended.js` |
| `talents-trees.js` | 112 talents, architecture incompatible avec `talents.js` | `scripts/out/content-atelier/data/talents-trees.js` |

Ces 3 fichiers ont été produits mais nécessitent une refonte en français / mapping IDs / adaptation schéma avant intégration. À refaire dans une prochaine session (soit via mini-run API en français, soit à la main en Claude Code).

## Coût total du content-atelier

- `content-atelier` initial : 1,13 $
- `content-finisher` (régénération des fichiers tronqués) : 0,43 $
- **Total : 1,56 $** pour **608 entrées générées**, dont ~320 intégrées (achievements + events + bosses + items comme data)

## Dernière mise à jour

15 avril 2026 — intégration session 1 : achievements v2 (live), events/bosses/items/balance (dormants).
