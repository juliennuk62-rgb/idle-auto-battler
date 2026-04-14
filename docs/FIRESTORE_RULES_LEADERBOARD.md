# Règles Firestore — Leaderboard Hebdomadaire

## À coller dans la console Firebase

**Avant de tester le leaderboard**, il faut ajouter les règles ci-dessous dans la console Firebase :

1. Aller dans **Firebase Console** → ton projet → **Firestore Database** → onglet **Rules**
2. Ajouter la section `match /leaderboards/...` à l'intérieur du bloc `match /databases/{database}/documents { ... }`
3. Cliquer sur **Publier**

## Règles minimales

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Règles existantes pour /saves/{uid}
    match /saves/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // ── NOUVEAU : Leaderboard hebdomadaire ──
    match /leaderboards/{weekId} {
      // Le doc racine de chaque semaine peut être lu par tout utilisateur connecté
      allow read: if request.auth != null;
      // Pas d'écriture directe sur le doc racine (on n'écrit que dans les sous-collections)
      allow write: if false;

      // Chaque catégorie contient les scores de chaque joueur
      match /{category}/{userId} {
        // Tout utilisateur connecté peut lire les classements (global)
        allow read: if request.auth != null;
        // Seul le propriétaire du score peut l'écrire (on ne peut pas tricher sur un autre joueur)
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Catégories supportées (liste autorisée)

Pour l'instant 6 catégories :

- `kills`
- `boss_kills`
- `total_gold`
- `max_wave`
- `max_damage`
- `deaths`

Si tu veux être strict, tu peux remplacer `{category}` par une vérification explicite :

```javascript
match /leaderboards/{weekId}/{category}/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.auth.uid == userId
    && category in ['kills', 'boss_kills', 'total_gold', 'max_wave', 'max_damage', 'deaths']
    && request.resource.data.score is number
    && request.resource.data.score >= 0;
}
```

## Validation rapide

Une fois les règles publiées :

1. Ouvre le jeu, fais un combat complet
2. Attends ~60s (flush auto) OU ferme l'onglet pour déclencher le flush sur pagehide
3. Dans Firebase Console → Firestore Database → onglet **Data**, tu devrais voir apparaître :

```
leaderboards/
  2026-W16/
    kills/
      <ton_uid>/ → { score: X, displayName: "Ton nom", updatedAt: ... }
    total_gold/
      <ton_uid>/ → { score: Y, ... }
```

Si les docs n'apparaissent pas → vérifier la console navigateur : un message `[Leaderboard] flush failed (rules manquantes ?)` indique que les règles n'ont pas été publiées correctement.

## Coût Firestore

Pour 5-10 amis et 6 catégories, on est TRÈS loin du free tier :

- Écritures : 1 batch de ~6 ops × une fois/60s → 360 ops/heure/joueur → ~3600/jour pour 10 joueurs
- Free tier : 20 000 writes/jour
- Lectures (ouverture du classement) : ~60 ops par ouverture
- Free tier : 50 000 reads/jour

**Conclusion** : aucun risque de facturation tant qu'on reste à <20 joueurs et <50 consultations/jour.

## Rétention

Les anciennes semaines restent stockées indéfiniment (utile pour un futur Hall of Fame). Si tu veux purger après N semaines, il faudra écrire une petite Cloud Function ou supprimer manuellement les docs `leaderboards/2026-WXX` périodiquement.
