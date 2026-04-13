# Discord — Setup complet pour l'Alpha

Lien d'invitation : https://discord.gg/5wvhBZaC

---

## 1. Channels à créer

### Catégorie : 📢 INFORMATIONS
- `#annonces` — Annonces officielles (verrouillé, seuls les devs postent)
- `#changelog` — Mises à jour du jeu
- `#règles` — Règles du serveur

### Catégorie : 💬 COMMUNAUTÉ
- `#général` — Discussion libre
- `#screenshots` — Partagez vos meilleurs moments
- `#stratégie` — Tips, builds, guides de donjons

### Catégorie : 🐛 FEEDBACK
- `#bugs` — Rapports de bugs (avec template)
- `#suggestions` — Idées d'amélioration
- `#questions` — Questions sur le jeu

### Catégorie : 🎮 ALPHA
- `#accès-alpha` — Instructions pour accéder au jeu
- `#notes-de-patch` — Notes détaillées par version

---

## 2. Rôles à créer

| Rôle | Couleur | Permissions |
|------|---------|-------------|
| 🔧 Dev | #fbbf24 (doré) | Admin complet |
| 🧪 Alpha Tester | #a855f7 (violet) | Accès à tous les channels |
| 🆕 Nouveau | #888888 (gris) | Rôle par défaut, accès limité |

---

## 3. Message de bienvenue (#annonces)

```
🎮 **IDLE AUTO-BATTLER — Alpha v0.1**

Bienvenue sur le serveur officiel ! Vous faites partie des premiers testeurs de notre jeu.

**🕹 C'est quoi ?**
Un auto-battler idle avec :
• Combat temps réel sur la carte du monde (6 biomes)
• Donjons tour par tour stratégiques (style Dofus)
• Système de gacha (20 héros à collectionner)
• Équipement, talents, prestige, missions quotidiennes

**🔗 Comment jouer ?**
Rendez-vous dans #accès-alpha pour le lien du jeu.

**📋 Votre mission de testeur :**
1. Jouez le plus possible
2. Signalez les bugs dans #bugs (utilisez le template !)
3. Partagez vos idées dans #suggestions
4. Amusez-vous 🎉

**⚠️ C'est une ALPHA :**
• Des bugs sont attendus, c'est normal
• Vos sauvegardes peuvent être reset entre les versions
• Votre feedback est précieux et façonne le jeu

Merci de nous aider à construire ce jeu ! 🙏
```

---

## 4. Template rapport de bug (#bugs)

Poster ce message en tant que message épinglé :

```
📋 **TEMPLATE RAPPORT DE BUG**

Copiez-collez ce template pour signaler un bug :

**🐛 Titre du bug :**
(Description courte)

**📝 Description :**
(Qu'est-ce qui s'est passé ?)

**🔄 Comment reproduire :**
1. ...
2. ...
3. ...

**✅ Comportement attendu :**
(Qu'est-ce qui aurait dû se passer ?)

**❌ Comportement actuel :**
(Qu'est-ce qui s'est passé à la place ?)

**📱 Navigateur / OS :**
(Chrome, Firefox, Edge... / Windows, Mac, Mobile...)

**📸 Screenshot :**
(Si possible, ajoutez une capture d'écran)
```

---

## 5. Règles (#règles)

```
📜 **RÈGLES DU SERVEUR**

1. **Respect** — Soyez courtois envers tout le monde
2. **Pas de spam** — Évitez les messages répétitifs
3. **Bugs dans #bugs** — N'encombrez pas #général avec les rapports de bugs
4. **Pas de triche** — Ne partagez pas d'exploits publiquement (DM un dev)
5. **Feedback constructif** — "C'est nul" n'aide personne, expliquez pourquoi
6. **Confidentialité** — Ne partagez pas le lien d'accès alpha sans permission

Merci de respecter ces règles pour garder une bonne ambiance ! 💙
```

---

## 6. Message #accès-alpha

```
🔗 **ACCÈS AU JEU**

**Lien :** [À REMPLIR — URL du jeu hébergé]

**Prérequis :**
• Navigateur moderne (Chrome recommandé)
• Compte Google (pour la sauvegarde cloud)

**Premier lancement :**
1. Cliquez sur le lien ci-dessus
2. Connectez-vous avec Google
3. Le jeu se lance automatiquement

**Contrôles :**
• **Aventure** — Combat auto, cliquez sur les biomes de la carte
• **Donjons** — Combat tour par tour, cliquez pour déplacer et attaquer
• **Menu** — Invocation, Coffres, Missions, Collection, Talents, Inventaire

**Raccourcis :**
• F12 — Panel admin (debug)

Bon jeu ! 🎮
```

---

## 7. Premier changelog (#changelog)

```
📦 **v0.1.0 — Alpha initiale** (18 avril 2026)

**🗡 Aventure (auto-battler)**
• 6 biomes (Forêt → Temple) avec 10 vagues chacun
• 4 classes : Guerrier, Archer, Mage, Healer
• Système Tower Defense avec mouvement des unités
• Boss tous les 5 vagues
• Projectiles pour les unités à distance
• Ultimes automatiques

**⚔️ Donjons (NOUVEAU — tour par tour)**
• Combat stratégique sur grille 10×8
• Contrôle manuel complet (PA/PM, sorts, positionnement)
• IA ennemie basique
• Interface HD au-dessus du canvas pixel art

**🎰 Gacha & Rétention**
• 20 héros invocables (R, SR, SSR, UR) avec pity system
• Coffres d'items par biome (6 coffres)
• Login quotidien (cycle 30 jours)
• Missions journalières et hebdomadaires
• Collection / Pokédex avec milestones

**🎒 Progression**
• Équipement (armes, armures, accessoires) avec sets de biome
• Forge (fusion 3→1 rareté supérieure)
• Arbres de talents (4 classes)
• Système de prestige (fragments d'âme)
• Sauvegarde cloud (Firebase)

**🐛 Bugs connus**
• Certains sprites de monstres manquent (placeholder)
• Les passifs de héros ne sont pas tous actifs en combat
• Le donjon n'a qu'un seul scénario de test pour l'instant
```
