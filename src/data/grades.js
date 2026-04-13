// Chaînes de grades par classe. Chaque classe possède 8 grades qui
// s'enchaînent via fusion : 3 unités d'un grade fusionnent en 1 unité
// du grade supérieur (cost constant défini dans balance.fusion_cost).
//
// Les noms sont purement décoratifs — la mécanique se base sur l'index
// numérique du grade (1..8). L'index 0 n'est jamais utilisé.

export const GRADES = {
  warrior: [
    null, // index 0 inutilisé
    'Recrue',
    'Soldat',
    'Guerrier',
    'Vétéran',
    'Chevalier',
    'Champion',
    'Héros',
    'Légende',
  ],
  archer: [
    null,
    'Tireur',
    'Arbalétrier',
    'Archer',
    'Archer d\'élite',
    'Maître-archer',
    'Sentinelle',
    'Œil de lynx',
    'Éclat ancestral',
  ],
  mage: [
    null,
    'Apprenti',
    'Adepte',
    'Mage',
    'Enchanteur',
    'Sorcier',
    'Archimage',
    'Thaumaturge',
    'Éternel',
  ],
  healer: [
    null,
    'Acolyte',
    'Clerc',
    'Prêtre',
    'Évêque',
    'Archevêque',
    'Cardinal',
    'Prophète',
    'Divin',
  ],
};

// Tints progressifs par grade — appliqués au sprite pour visualiser
// instantanément la "rareté". Grade 1 = neutre, puis dégradé doré → violet → cyan.
// Ces tints sont multiplicatifs sur le sprite, donc des valeurs proches de
// blanc laissent le sprite quasi-inchangé ; plus on s'éloigne du blanc,
// plus le changement est visible.
export const GRADE_TINTS = [
  0xffffff, // index 0 (inutilisé)
  0xffffff, // grade 1 — pas de tint
  0xffe58a, // grade 2 — or pâle
  0xfbbf24, // grade 3 — or
  0xfb923c, // grade 4 — orange
  0xf87171, // grade 5 — rouge
  0xc084fc, // grade 6 — violet
  0x60a5fa, // grade 7 — bleu
  0x5eead4, // grade 8 — cyan légendaire
];

// Échelle de repos par grade — plus on monte, plus l'unité est grosse
// visuellement. Multiplicatif sur spriteScale.
export const GRADE_SCALES = [
  1.0, // index 0
  1.0, // grade 1
  1.08,
  1.15,
  1.22,
  1.28,
  1.34,
  1.40,
  1.48,
];

// Nombre max de grades par classe. Un fighter de grade 8 ne peut plus
// fusionner (aucune cible au-dessus).
export const MAX_GRADE = 8;

/**
 * Nom du grade pour une classe donnée, ou null si out-of-bounds.
 */
export function gradeName(className, grade) {
  const chain = GRADES[className];
  if (!chain) return null;
  return chain[grade] ?? null;
}

/**
 * Tint de sprite pour un grade donné.
 */
export function gradeTint(grade) {
  return GRADE_TINTS[grade] ?? 0xffffff;
}

/**
 * Scale de repos pour un grade donné.
 */
export function gradeScale(grade) {
  return GRADE_SCALES[grade] ?? 1.0;
}
