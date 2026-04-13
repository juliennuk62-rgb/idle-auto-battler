# Vision — Système de déplacement (Tower Defense dynamique)

## Concept

Transformer le combat statique tick-based en **tower defense dynamique** :

- Les monstres **spawn à droite** et **marchent vers la gauche**
- Les alliés mêlée (warriors) **avancent vers les monstres** pour les bloquer
- Les alliés distance (archer, mage) **restent en arrière** et tirent des projectiles visuels
- Le healer reste au fond et soigne
- **Si un monstre atteint le bord gauche** → dégâts directs ou perte de vie

```
← ALLIÉS DÉFENDENT                    MONSTRES AVANCENT →

  [Healer]  [Mage]  [Archer]     [Warrior]----→←[Gobelin]  [Loup]  [Araignée]
                                  [Warrior]----→     ←[Troll]
                                                          ←[Squelette]
```

## Nouvelles stats par entité

| Stat | Description | Warrior | Archer | Mage | Healer | Gobelin |
|---|---|---|---|---|---|---|
| `moveSpeed` | px/s de déplacement | 60 | 0 (fixe) | 0 (fixe) | 0 (fixe) | 40 |
| `attackRange` | portée en px | 50 | 300 | 250 | 200 | 50 |
| `isRanged` | reste en place et tire | false | true | true | true | false |
| `blockSlots` | combien d'ennemis peut bloquer | 2 | 0 | 0 | 0 | 0 |

## Phases d'implémentation

### Phase A — Mouvement basique (1 jour)

- Ajout de `scene.update(time, delta)` dans CombatScene
- Chaque monstre a une vélocité vers la gauche
- Chaque warrior a une vélocité vers la droite (vers le monstre le plus proche)
- Quand un warrior est à portée → engagement (les deux s'arrêtent, combat tick-based commence)
- Si un monstre n'a pas de warrior en face → il continue à avancer

### Phase B — Ranged (0.5 jour)

- Les archers/mages ne bougent pas (position fixe)
- Ils attaquent le monstre le plus proche qui est **dans leur range**
- Si aucun monstre à portée → idle (pas d'attaque)

### Phase C — Projectiles visuels (0.5 jour)

- Quand un ranged attaque, un petit sprite (flèche, boule de feu) vole de l'allié au monstre
- Le dégât est appliqué à l'arrivée du projectile (pas instantanément)
- Pool de projectiles réutilisables

### Phase D — Spawner progressif (0.5 jour)

- Au lieu de spawner tous les monstres en même temps au début de la wave
- Les monstres arrivent 1 par 1, toutes les 1-2 secondes, depuis le bord droit
- Crée un flux continu au lieu d'un burst → plus dynamique visuellement

### Phase E — Polish (1 jour)

- Animation de marche (oscillation verticale du sprite pendant le déplacement)
- Knockback au premier contact warrior/monstre (petit recul visuel)
- Particules de tir pour les ranged (traînée derrière le projectile)
- Indicateur de portée au survol d'un allié (cercle semi-transparent)
- "Ligne de mort" rouge clignotante au bord gauche

## Impact gameplay

Le positionnement initial des alliés (défini en phase préparation) devient **stratégique** :
- Warriors en avant pour bloquer tôt → moins de monstres passent mais ils prennent plus de dégâts
- Warriors en retrait → les ranged ont plus de temps pour tirer mais les monstres arrivent plus vite

Le jeu passe de "regarder des barres descendre" à "gérer une ligne de défense vivante" — comparable à Arknights, Kingdom Rush, ou Plants vs Zombies.

## Ce qu'on conserve tel quel

- Classes (warrior/archer/mage/healer) et leurs rôles
- Grades + fusion
- Équipement + sets de biome
- Économie (or, gems, prestige)
- Biomes + boss (les boss marchent plus lentement mais sont plus dangereux)
- UI cockpit + inventaire + télémétrie
- Ultimes automatiques

## Ce qui change

- `CombatSystem` passe de 100% timer à timer + update loop
- Les positions des fighters ne sont plus fixes — elles bougent chaque frame
- Les monstres ne sont plus tous en vie au début — ils arrivent en flux
- Le targeting est basé sur la **distance réelle** plutôt qu'une position fixe
