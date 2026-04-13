// Biomes du jeu — changent toutes les 10 vagues. Cycle de 6 biomes
// (60 vagues pour faire le tour complet), puis on boucle.
//
// Chaque biome définit :
// - id       : slug interne
// - name     : affiché sur le bandeau
// - bgTint   : couleur de multiplication appliquée sur le fond via setTint.
//              Le fond JPG d'origine est multiplié par cette couleur, donc
//              des valeurs proches de blanc (0xffffff) conservent l'image
//              quasi-inchangée, et des couleurs plus saturées donnent
//              l'ambiance du biome.
// - accent   : couleur accent utilisée pour la bordure/texte du bandeau
//              d'annonce "NOUVEAU BIOME".
//
// La liste est ordonnée : wave 1-10 = forest, 11-20 = caves, etc.

export const BIOMES = [
  { id: 'forest', name: 'FORÊT',     bgKey: 'bg_forest', bgTint: 0x9fd89f, accent: 0x88cc88 },
  { id: 'caves',  name: 'GROTTES',   bgKey: 'bg_caves',  bgTint: 0x8899bb, accent: 0x99aacc },
  { id: 'ruins',  name: 'RUINES',    bgKey: 'bg_ruins',  bgTint: 0xd8bb77, accent: 0xeecc66 },
  { id: 'hell',   name: 'ENFER',     bgKey: 'bg_hell',   bgTint: 0xff7755, accent: 0xff6644 },
  { id: 'snow',   name: 'NEIGE',     bgKey: 'bg_snow',   bgTint: 0xccddff, accent: 0xffffff },
  { id: 'temple', name: 'TEMPLE',    bgKey: 'bg_temple', bgTint: 0xbb88ee, accent: 0xcc88ff },
];

/**
 * Retourne le biome pour une vague donnée.
 * Wave 1-10 → BIOMES[0], 11-20 → BIOMES[1], ... cycle modulo 6 au-delà.
 */
export function biomeForWave(wave) {
  const idx = Math.floor(Math.max(0, wave - 1) / 10) % BIOMES.length;
  return BIOMES[idx];
}
