# Plan — Rework sprites : liste complète pour génération AI

## Context

Le jeu utilise 2 sprites (guerrier.gif 16×25 + tkobold.gif 18×24) pour TOUS les visuels. Toutes les classes alliées partagent le même sprite guerrier, tous les monstres partagent le même kobold. On veut un sprite unique par entité pour donner une identité visuelle forte à chaque élément du jeu.

## Convention technique

- **Résolution** : 32×32 px (sweet spot : assez grand pour les détails pixel art, assez petit pour le style rétro). Le code passera `spriteScale` de 3 à 2 (32×2 = 64px affichés, cohérent avec le GAME_DESIGN.md "64×64 par unité").
- **Format** : PNG (fond blanc uni pour faciliter le détourage, tu retireras le blanc après).
- **Style commun** : pixel art, vue 3/4 face, éclairage du haut, contours sombres 1px, palette limitée (~16-24 couleurs par sprite). Fond blanc uni.
- **Nommage** : `snake_case.png`, rangé dans `assets/sprites/allies/`, `assets/sprites/monsters/`, `assets/sprites/backgrounds/`.

## Prompt racine à préfixer à TOUS les prompts AI

```
Single pixel art game character sprite, 32x32 pixels, solid plain white background, 
3/4 front-facing view, 1px dark outlines, top-down lighting, limited color 
palette (16 colors max), retro RPG style, no text, centered on canvas.
```

---

## PHASE 1 — Alliés (4 sprites, impact maximal immédiat)

Chaque classe a 1 sprite de base. Les grades supérieurs sont distingués par le tint system existant (doré → orange → rouge → violet → bleu → cyan).

| # | Fichier | Entité | Prompt AI spécifique |
|---|---|---|---|
| 1 | `allies/warrior.png` | **Guerrier** — tank front | `Armored pixel art knight, short sword and small round shield, heavy plate armor, green-blue color scheme, sturdy stance, facing slightly right` |
| 2 | `allies/archer.png` | **Archer** — DPS back | `Hooded pixel art ranger, wooden longbow drawn, quiver of arrows on back, purple-violet leather armor, agile stance, facing slightly right` |
| 3 | `allies/mage.png` | **Mage** — AoE back | `Pixel art wizard, blue robe with stars, glowing crystal staff, pointed hat, blue-cyan color scheme, magical aura, facing slightly right` |
| 4 | `allies/healer.png` | **Soigneur** — support back | `Pixel art cleric priest, white-green robes, golden holy symbol staff, soft green glow, gentle expression, facing slightly right` |

**Priorité** : ★★★★★ — transforme instantanément le jeu. 30 min de génération AI + 5 min d'intégration.

---

## PHASE 2 — Monstres normaux (24 sprites)

### Forêt (waves 1-10)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 5 | `monsters/gobelin.png` | Gobelin | `Small green goblin creature, crude wooden club, pointy ears, menacing grin, ragged brown cloth, facing slightly left` |
| 6 | `monsters/loup.png` | Loup | `Fierce grey wolf, snarling teeth, hunched attack pose, wild fur, yellow eyes, facing slightly left` |
| 7 | `monsters/sanglier.png` | Sanglier | `Angry wild boar, large tusks, bristly brown fur, charging stance, red eyes, facing slightly left` |
| 8 | `monsters/araignee.png` | Araignée | `Giant spider, dark purple body, eight legs spread, red compound eyes, web strands, facing slightly left` |

### Grottes (waves 11-20)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 9 | `monsters/chauve_souris.png` | Chauve-souris | `Giant bat monster, dark wings spread wide, fangs bared, red eyes glowing, dark purple body, facing slightly left` |
| 10 | `monsters/troll.png` | Troll | `Cave troll, mossy green skin, large stone club, hunched posture, one eye bigger, facing slightly left` |
| 11 | `monsters/slime.png` | Slime | `Blue-green slime blob, translucent jelly body, smiling face, small bubbles inside, bouncy shape, facing slightly left` |
| 12 | `monsters/rat_geant.png` | Rat géant | `Giant rat monster, matted grey-brown fur, long tail, sharp teeth, red beady eyes, facing slightly left` |

### Ruines (waves 21-30)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 13 | `monsters/squelette.png` | Squelette | `Skeleton warrior, rusty sword, cracked skull, glowing blue eye sockets, tattered armor remnants, facing slightly left` |
| 14 | `monsters/momie.png` | Momie | `Mummy monster, wrapped in ancient bandages, glowing yellow eyes, arms raised, dust particles, facing slightly left` |
| 15 | `monsters/sphinx.png` | Sphinx | `Small stone sphinx creature, lion body with human face, golden headdress, cracked stone texture, facing slightly left` |
| 16 | `monsters/fantome.png` | Fantôme | `Ghostly spirit, translucent white-blue body, hollow eyes, floating wispy tail, ethereal glow, facing slightly left` |

### Enfer (waves 31-40)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 17 | `monsters/demon.png` | Démon | `Red demon warrior, small horns, dark wings, flaming sword, muscular build, fiery eyes, facing slightly left` |
| 18 | `monsters/imp.png` | Imp | `Small red imp, tiny bat wings, mischievous grin, pitchfork, pointy tail, facing slightly left` |
| 19 | `monsters/cerbere.png` | Cerbère | `Three-headed hellhound, dark red fur, flaming mane, snarling mouths, chains, facing slightly left` |
| 20 | `monsters/succube.png` | Succube | `Dark succubus, bat wings, purple skin, glowing eyes, dark magic aura, elegant pose, facing slightly left` |

### Neige (waves 41-50)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 21 | `monsters/yeti.png` | Yéti | `White yeti, thick snow-white fur, large fangs, ice-blue eyes, massive fists, snowflakes, facing slightly left` |
| 22 | `monsters/ours_blanc.png` | Ours blanc | `Polar bear monster, thick white fur, standing on hind legs, icy breath, blue claws, facing slightly left` |
| 23 | `monsters/mage_glace.png` | Mage de glace | `Ice wizard enemy, frozen robes, crystal ice staff, pale blue skin, snowflake crown, facing slightly left` |
| 24 | `monsters/loup_arctique.png` | Loup arctique | `Arctic wolf, white-silver fur, icy blue eyes, frost breath, sleek hunting pose, facing slightly left` |

### Temple (waves 51-60)

| # | Fichier | Entité | Prompt AI |
|---|---|---|---|
| 25 | `monsters/gardien.png` | Gardien | `Temple guardian, golden armor, floating stone body, glowing runes, ancient sword, facing slightly left` |
| 26 | `monsters/golem.png` | Golem | `Stone golem, cracked rock body, glowing purple core, massive stone fists, rune markings, facing slightly left` |
| 27 | `monsters/esprit.png` | Esprit | `Ancient spirit, golden ethereal form, flowing energy tendrils, wise old face, temple symbols, facing slightly left` |
| 28 | `monsters/sentinelle.png` | Sentinelle | `Mechanical sentinel, bronze metal body, glowing red eye, spear weapon, temple guardian design, facing slightly left` |

---

## PHASE 3 — Boss (6 sprites, visuellement plus grands)

Les boss doivent se distinguer immédiatement. Résolution **48×48 px** au lieu de 32×32 pour marquer la différence de taille. Le code applique déjà un scale ×1.4 sur les boss.

| # | Fichier | Entité | Biome | Prompt AI |
|---|---|---|---|---|
| 29 | `monsters/boss_roi_gobelin.png` | Roi Gobelin | Forêt | `Large goblin king, golden crown, ornate wooden throne-staff, cape made of leaves, menacing, 48x48 pixel art, facing slightly left` |
| 30 | `monsters/boss_troll_ancien.png` | Troll Ancien | Grottes | `Massive ancient cave troll, mossy beard, glowing mushrooms on shoulders, enormous stone hammer, 48x48 pixel art, facing slightly left` |
| 31 | `monsters/boss_pharaon.png` | Pharaon Maudit | Ruines | `Undead pharaoh, golden sarcophagus armor, glowing green eyes, ancient staff of power, hieroglyph aura, 48x48 pixel art, facing slightly left` |
| 32 | `monsters/boss_balrog.png` | Balrog | Enfer | `Massive fire demon balrog, flaming wings, whip of fire, crown of flames, molten rock body, 48x48 pixel art, facing slightly left` |
| 33 | `monsters/boss_roi_neiges.png` | Roi des Neiges | Neige | `Ice king, crystalline crown, frozen cape, ice scepter, blizzard aura, pale blue skin, 48x48 pixel art, facing slightly left` |
| 34 | `monsters/boss_dragon.png` | Dragon Ancestral | Temple | `Ancient golden dragon, small but regal, glowing scales, wisdom in eyes, temple energy, 48x48 pixel art, facing slightly left` |

---

## PHASE 4 — Backgrounds biomes (6 images)

Résolution **800×480 px** (taille exacte du canvas Phaser). Pas besoin de transparence.

| # | Fichier | Biome | Prompt AI |
|---|---|---|---|
| 35 | `backgrounds/bg_forest.jpg` | Forêt | `Pixel art forest battle background, 800x480, lush green trees, mossy ground, dappled sunlight, fantasy RPG clearing, side-view platformer style, no characters` |
| 36 | `backgrounds/bg_caves.jpg` | Grottes | `Pixel art cave background, 800x480, dark cavern with stalactites, glowing crystals, underground river, dim blue lighting, no characters` |
| 37 | `backgrounds/bg_ruins.jpg` | Ruines | `Pixel art desert ruins background, 800x480, crumbling sandstone pillars, hieroglyphs on walls, golden sand, warm sunset lighting, no characters` |
| 38 | `backgrounds/bg_hell.jpg` | Enfer | `Pixel art hellscape background, 800x480, lava rivers, dark volcanic rocks, red sky, fire pillars, ominous atmosphere, no characters` |
| 39 | `backgrounds/bg_snow.jpg` | Neige | `Pixel art frozen tundra background, 800x480, snow-covered mountains, frozen lake, northern lights in sky, pine trees with snow, no characters` |
| 40 | `backgrounds/bg_temple.jpg` | Temple | `Pixel art ancient temple interior background, 800x480, golden columns, mystical purple energy, floating runes, sacred architecture, no characters` |

---

## Résumé des totaux

| Phase | Catégorie | Nombre | Résolution | Priorité |
|---|---|---|---|---|
| 1 | Alliés (4 classes) | 4 | 32×32 | ★★★★★ |
| 2 | Monstres normaux (6 biomes × 4) | 24 | 32×32 | ★★★★ |
| 3 | Boss (6 biomes × 1) | 6 | 48×48 | ★★★★ |
| 4 | Backgrounds biomes | 6 | 800×480 | ★★★ |
| **Total** | | **40** | | |

**Phase bonus (optionnelle)** : sprites par grade = 32 sprites supplémentaires (4 classes × 8 grades). Non prioritaire car le tint system existant fonctionne bien.

## Workflow de génération recommandé

1. Générer les 4 alliés en premier → intégration immédiate → test visuel
2. Générer les monstres biome par biome (forêt d'abord → test, puis grottes → test, etc.)
3. Générer les boss après tous les normaux
4. Générer les backgrounds en dernier (les tints actuels fonctionnent OK en attendant)

## Intégration code (après avoir les fichiers)

Le code nécessitera :
- Mise à jour de `CombatScene.preload()` pour charger tous les sprites
- Table de mapping monstre-nom → spriteKey dans `monsters.js`
- Mise à jour de `_spawnWaveMonsters` pour utiliser le bon spriteKey par monstre
- Mise à jour de `_createDefaultTeam` et `recruitUnit` pour les spriteKeys par classe
- `spriteScale` de 3 → 2 partout (adaptation au 32×32)
- Gestion background par biome dans `setBiome()` (swap d'image, pas juste tint)
