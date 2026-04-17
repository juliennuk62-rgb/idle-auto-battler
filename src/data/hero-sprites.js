// hero-sprites.js — 22 SVG pixel art uniques, 1 par héros.
// Générés dynamiquement en data URIs et enregistrés comme textures Phaser.
//
// Chaque SVG est 64×64, style pixel art (shape-rendering: crispEdges),
// silhouette humanoïde de base avec détails uniques par héros (arme, aura,
// couleurs de rareté).
//
// Usage :
//   import { registerHeroTextures, getHeroSpriteKey } from './hero-sprites.js';
//   // Dans CombatScene.preload() :
//   registerHeroTextures(this); // enregistre les 22 textures via this.load.image()
//   // Dans la création des Fighters :
//   spriteKey: getHeroSpriteKey(heroId) || 'warrior'

// ─── Palette de base (réutilisée par tous) ─────────────────────────────
const SKIN = '#fdbcb4';
const SKIN_DARK = '#e09b90';
const HAIR_BROWN = '#5c3317';
const HAIR_BLACK = '#1a1a1a';
const HAIR_WHITE = '#f0f0f0';
const HAIR_BLOND = '#f0c674';
const STEEL = '#8b95a5';
const STEEL_DARK = '#5a6573';
const GOLD = '#fbbf24';
const GOLD_DARK = '#b88820';
const IRIDESCENT = '#ff6b9d';
const IRIDESCENT_LIGHT = '#ffb4d1';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Wrap les éléments pixel art dans un SVG 64×64 avec rendu pixel.
 * @param {string} inner - contenu SVG (rects, paths, etc.)
 * @param {string} [glow] - couleur d'aura optionnelle (rareté UR/MYTHIC)
 */
function wrap(inner, glow) {
  const filter = glow
    ? `<filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feFlood flood-color="${glow}" flood-opacity="0.6"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    : '';
  const filterAttr = glow ? 'filter="url(#glow)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges">${filter ? `<defs>${filter}</defs>` : ''}<g ${filterAttr}>${inner}</g></svg>`;
}

// Base humanoïde commune : tête + corps + bras + jambes.
function humanoid(opts) {
  const {
    skin = SKIN,
    hair = HAIR_BROWN,
    helmet = null, // si fourni, remplace les cheveux
    armor = STEEL,
    armorDark = STEEL_DARK,
    legs = '#3a3f4b',
    boots = '#1a1a1a',
    belt = null,
  } = opts;

  return `
    ${/* Cheveux/Casque (derrière la tête) */''}
    ${helmet
      ? `<rect x="22" y="8" width="20" height="10" fill="${helmet}"/>
         <rect x="20" y="10" width="24" height="6" fill="${helmet}"/>`
      : `<rect x="22" y="6" width="20" height="8" fill="${hair}"/>
         <rect x="20" y="8" width="4" height="4" fill="${hair}"/>
         <rect x="40" y="8" width="4" height="4" fill="${hair}"/>`
    }
    ${/* Visage */''}
    <rect x="24" y="14" width="16" height="12" fill="${skin}"/>
    <rect x="27" y="18" width="2" height="2" fill="${HAIR_BLACK}"/>
    <rect x="35" y="18" width="2" height="2" fill="${HAIR_BLACK}"/>
    <rect x="30" y="22" width="4" height="1" fill="${SKIN_DARK}"/>
    ${/* Cou */''}
    <rect x="29" y="26" width="6" height="2" fill="${skin}"/>
    ${/* Corps (armure) */''}
    <rect x="22" y="28" width="20" height="16" fill="${armor}"/>
    <rect x="22" y="28" width="20" height="2" fill="${armorDark}"/>
    <rect x="22" y="42" width="20" height="2" fill="${armorDark}"/>
    ${/* Bras */''}
    <rect x="16" y="28" width="6" height="16" fill="${armor}"/>
    <rect x="42" y="28" width="6" height="16" fill="${armor}"/>
    <rect x="17" y="42" width="4" height="3" fill="${skin}"/>
    <rect x="43" y="42" width="4" height="3" fill="${skin}"/>
    ${/* Ceinture */''}
    ${belt ? `<rect x="22" y="42" width="20" height="2" fill="${belt}"/>` : ''}
    ${/* Jambes */''}
    <rect x="24" y="44" width="7" height="14" fill="${legs}"/>
    <rect x="33" y="44" width="7" height="14" fill="${legs}"/>
    ${/* Bottes */''}
    <rect x="23" y="56" width="9" height="4" fill="${boots}"/>
    <rect x="32" y="56" width="9" height="4" fill="${boots}"/>
  `;
}

// ─── WARRIORS ─────────────────────────────────────────────────────────

// garde_royal (R) — casque rond, bouclier bleu, épée courte
const garde_royal = wrap(`
  ${humanoid({ armor: '#4a6fa5', armorDark: '#2d4366', helmet: '#8b95a5', legs: '#2d3748', boots: '#1a202c' })}
  ${/* Bouclier bleu */''}
  <rect x="8" y="30" width="10" height="14" fill="#3b82f6"/>
  <rect x="9" y="29" width="8" height="1" fill="#60a5fa"/>
  <rect x="11" y="34" width="4" height="6" fill="#fbbf24"/>
  ${/* Épée courte */''}
  <rect x="50" y="26" width="2" height="14" fill="#e5e7eb"/>
  <rect x="48" y="38" width="6" height="2" fill="#b88820"/>
`);

// centurion (R) — casque à plumet rouge, glaive, armure romaine
const centurion = wrap(`
  ${humanoid({ armor: '#8b6f47', armorDark: '#5a4a30', helmet: '#d4a556', legs: '#6b4226', boots: '#3d2817' })}
  ${/* Plumet rouge */''}
  <rect x="28" y="4" width="8" height="6" fill="#dc2626"/>
  <rect x="30" y="2" width="4" height="2" fill="#ef4444"/>
  ${/* Glaive */''}
  <rect x="50" y="22" width="2" height="18" fill="#d1d5db"/>
  <rect x="49" y="40" width="4" height="2" fill="#8b6f47"/>
  ${/* Jupe romaine */''}
  <rect x="22" y="44" width="20" height="4" fill="#8b6f47"/>
  <rect x="23" y="44" width="2" height="4" fill="#5a4a30"/>
  <rect x="27" y="44" width="2" height="4" fill="#5a4a30"/>
  <rect x="31" y="44" width="2" height="4" fill="#5a4a30"/>
  <rect x="35" y="44" width="2" height="4" fill="#5a4a30"/>
  <rect x="39" y="44" width="2" height="4" fill="#5a4a30"/>
`);

// chevalier_noir (SR) — armure noire, épée longue noire, cape violette
const chevalier_noir = wrap(`
  ${/* Cape violette */''}
  <rect x="14" y="26" width="36" height="30" fill="#6b21a8"/>
  <rect x="14" y="26" width="2" height="30" fill="#4c1d95"/>
  <rect x="48" y="26" width="2" height="30" fill="#4c1d95"/>
  ${humanoid({ armor: '#1f2937', armorDark: '#0f172a', helmet: '#0f172a', legs: '#0f172a', boots: '#000000' })}
  ${/* Visière baissée */''}
  <rect x="24" y="14" width="16" height="10" fill="#1f2937"/>
  <rect x="26" y="18" width="2" height="2" fill="#ef4444"/>
  <rect x="36" y="18" width="2" height="2" fill="#ef4444"/>
  ${/* Épée longue noire */''}
  <rect x="50" y="16" width="2" height="24" fill="#374151"/>
  <rect x="49" y="15" width="4" height="2" fill="#4b5563"/>
  <rect x="48" y="40" width="6" height="2" fill="#6b21a8"/>
`, '#6b21a8');

// paladin_celeste (SSR) — armure dorée, marteau blanc lumineux
const paladin_celeste = wrap(`
  ${humanoid({ armor: '#fbbf24', armorDark: '#b88820', helmet: '#fde68a', hair: HAIR_BLOND, legs: '#d4a556', boots: '#92400e' })}
  ${/* Auréole */''}
  <rect x="22" y="2" width="20" height="2" fill="#fef3c7"/>
  <rect x="20" y="4" width="2" height="2" fill="#fef3c7"/>
  <rect x="42" y="4" width="2" height="2" fill="#fef3c7"/>
  ${/* Croix sur torse */''}
  <rect x="30" y="30" width="4" height="10" fill="#ffffff"/>
  <rect x="26" y="34" width="12" height="2" fill="#ffffff"/>
  ${/* Marteau */''}
  <rect x="50" y="16" width="2" height="24" fill="#ffffff"/>
  <rect x="46" y="14" width="10" height="8" fill="#f3f4f6"/>
  <rect x="46" y="14" width="10" height="2" fill="#fef3c7"/>
`, '#fbbf24');

// dieu_guerre (UR) — armure rouge, grande épée à 2 mains, aura rouge
const dieu_guerre = wrap(`
  ${humanoid({ armor: '#dc2626', armorDark: '#7f1d1d', helmet: '#b91c1c', hair: HAIR_BLACK, legs: '#7f1d1d', boots: '#000000' })}
  ${/* Cornes de démon guerrier */''}
  <rect x="20" y="4" width="2" height="4" fill="#000000"/>
  <rect x="42" y="4" width="2" height="4" fill="#000000"/>
  <rect x="18" y="6" width="2" height="2" fill="#000000"/>
  <rect x="44" y="6" width="2" height="2" fill="#000000"/>
  ${/* Yeux rouges */''}
  <rect x="27" y="18" width="2" height="2" fill="#ef4444"/>
  <rect x="35" y="18" width="2" height="2" fill="#ef4444"/>
  ${/* Grande épée à 2 mains */''}
  <rect x="49" y="8" width="4" height="30" fill="#e5e7eb"/>
  <rect x="46" y="36" width="10" height="3" fill="#fbbf24"/>
  <rect x="50" y="39" width="2" height="8" fill="#7f1d1d"/>
  ${/* Aura */''}
  <rect x="12" y="4" width="1" height="1" fill="#ef4444"/>
  <rect x="52" y="6" width="1" height="1" fill="#ef4444"/>
  <rect x="6" y="30" width="1" height="1" fill="#ef4444"/>
`, '#ef4444');

// titan_originel (MYTHIC) — géant brun, poings nus énormes, aura iridescente
const titan_originel = wrap(`
  ${/* Corps massif */''}
  <rect x="20" y="28" width="24" height="20" fill="#8b6f47"/>
  <rect x="20" y="28" width="24" height="2" fill="#5a4a30"/>
  <rect x="20" y="46" width="24" height="2" fill="#5a4a30"/>
  ${/* Tête */''}
  <rect x="24" y="8" width="16" height="16" fill="#c19a6b"/>
  <rect x="22" y="10" width="2" height="10" fill="#c19a6b"/>
  <rect x="40" y="10" width="2" height="10" fill="#c19a6b"/>
  ${/* Cheveux sauvages */''}
  <rect x="22" y="4" width="20" height="6" fill="#5a4a30"/>
  <rect x="20" y="6" width="4" height="4" fill="#5a4a30"/>
  <rect x="40" y="6" width="4" height="4" fill="#5a4a30"/>
  ${/* Yeux iridescents */''}
  <rect x="27" y="16" width="3" height="2" fill="${IRIDESCENT}"/>
  <rect x="34" y="16" width="3" height="2" fill="${IRIDESCENT}"/>
  ${/* Barbe */''}
  <rect x="26" y="22" width="12" height="4" fill="#5a4a30"/>
  ${/* Poings énormes */''}
  <rect x="10" y="32" width="10" height="12" fill="#c19a6b"/>
  <rect x="44" y="32" width="10" height="12" fill="#c19a6b"/>
  <rect x="10" y="32" width="10" height="2" fill="#8b6f47"/>
  <rect x="44" y="32" width="10" height="2" fill="#8b6f47"/>
  ${/* Jambes */''}
  <rect x="23" y="48" width="8" height="14" fill="#5a4a30"/>
  <rect x="33" y="48" width="8" height="14" fill="#5a4a30"/>
  ${/* Aura iridescente */''}
  <rect x="4" y="20" width="2" height="2" fill="${IRIDESCENT}"/>
  <rect x="58" y="20" width="2" height="2" fill="${IRIDESCENT}"/>
  <rect x="2" y="40" width="2" height="2" fill="${IRIDESCENT_LIGHT}"/>
  <rect x="60" y="40" width="2" height="2" fill="${IRIDESCENT_LIGHT}"/>
`, IRIDESCENT);

// ─── ARCHERS ──────────────────────────────────────────────────────────

// chasseur (R) — tunique verte, arc court, carquois
const chasseur = wrap(`
  ${humanoid({ armor: '#166534', armorDark: '#14532d', hair: HAIR_BROWN, legs: '#422006', boots: '#1c1917' })}
  ${/* Arc court */''}
  <rect x="50" y="22" width="2" height="20" fill="#78350f"/>
  <rect x="48" y="22" width="2" height="2" fill="#78350f"/>
  <rect x="48" y="40" width="2" height="2" fill="#78350f"/>
  <rect x="49" y="32" width="1" height="1" fill="#d4a556"/>
  ${/* Corde */''}
  <rect x="52" y="24" width="1" height="16" fill="#e5e7eb"/>
  ${/* Carquois (épaule) */''}
  <rect x="44" y="24" width="4" height="10" fill="#78350f"/>
  <rect x="45" y="22" width="1" height="4" fill="#e5e7eb"/>
  <rect x="47" y="22" width="1" height="4" fill="#e5e7eb"/>
`);

// eclaireur (R) — capuche grise, arc court, œil vif
const eclaireur = wrap(`
  ${humanoid({ armor: '#4b5563', armorDark: '#1f2937', hair: HAIR_BLACK, legs: '#1f2937', boots: '#000000' })}
  ${/* Capuche grise */''}
  <rect x="20" y="6" width="24" height="10" fill="#6b7280"/>
  <rect x="22" y="4" width="20" height="2" fill="#6b7280"/>
  <rect x="18" y="10" width="2" height="8" fill="#6b7280"/>
  <rect x="44" y="10" width="2" height="8" fill="#6b7280"/>
  ${/* Yeux perçants (vert vif) */''}
  <rect x="27" y="18" width="2" height="2" fill="#22c55e"/>
  <rect x="35" y="18" width="2" height="2" fill="#22c55e"/>
  ${/* Arc court */''}
  <rect x="50" y="24" width="2" height="18" fill="#5a4a30"/>
  <rect x="52" y="26" width="1" height="14" fill="#e5e7eb"/>
`);

// ranger_elite (SR) — tenue marron, arc long, carquois rempli
const ranger_elite = wrap(`
  ${humanoid({ armor: '#78350f', armorDark: '#451a03', hair: '#d4a556', legs: '#422006', boots: '#1c1917' })}
  ${/* Capuche verte forêt */''}
  <rect x="22" y="6" width="20" height="4" fill="#166534"/>
  <rect x="20" y="8" width="24" height="4" fill="#166534"/>
  ${/* Arc long */''}
  <rect x="50" y="14" width="2" height="32" fill="#5a4a30"/>
  <rect x="48" y="14" width="2" height="2" fill="#5a4a30"/>
  <rect x="48" y="44" width="2" height="2" fill="#5a4a30"/>
  <rect x="52" y="16" width="1" height="28" fill="#e5e7eb"/>
  ${/* Carquois rempli */''}
  <rect x="12" y="20" width="4" height="14" fill="#5a4a30"/>
  <rect x="13" y="18" width="1" height="4" fill="#ef4444"/>
  <rect x="14" y="18" width="1" height="4" fill="#f59e0b"/>
  <rect x="15" y="18" width="1" height="4" fill="#22c55e"/>
`, '#a855f7');

// tireur_elite (SSR) — armure or, arbalète, lunette
const tireur_elite = wrap(`
  ${humanoid({ armor: '#b88820', armorDark: '#78350f', helmet: '#fbbf24', legs: '#5a4a30', boots: '#1c1917' })}
  ${/* Lunette/monocle */''}
  <rect x="34" y="16" width="6" height="6" fill="#1f2937"/>
  <rect x="35" y="17" width="4" height="4" fill="#60a5fa"/>
  ${/* Arbalète */''}
  <rect x="46" y="30" width="14" height="3" fill="#5a4a30"/>
  <rect x="48" y="28" width="2" height="2" fill="#5a4a30"/>
  <rect x="56" y="28" width="2" height="2" fill="#5a4a30"/>
  <rect x="50" y="33" width="10" height="2" fill="#78350f"/>
  <rect x="53" y="33" width="2" height="6" fill="#5a4a30"/>
  ${/* Corde */''}
  <rect x="48" y="32" width="12" height="1" fill="#e5e7eb"/>
`, '#fbbf24');

// artemis (UR) — robe blanche lunaire, arc ornemental, croissant de lune
const artemis = wrap(`
  ${/* Cheveux longs argentés */''}
  <rect x="20" y="4" width="24" height="14" fill="#e5e7eb"/>
  <rect x="18" y="10" width="2" height="16" fill="#e5e7eb"/>
  <rect x="44" y="10" width="2" height="16" fill="#e5e7eb"/>
  ${/* Visage */''}
  <rect x="24" y="14" width="16" height="12" fill="${SKIN}"/>
  ${/* Yeux argentés */''}
  <rect x="27" y="18" width="2" height="2" fill="#94a3b8"/>
  <rect x="35" y="18" width="2" height="2" fill="#94a3b8"/>
  ${/* Robe blanche */''}
  <rect x="22" y="26" width="20" height="20" fill="#f3f4f6"/>
  <rect x="22" y="26" width="20" height="2" fill="#cbd5e1"/>
  <rect x="22" y="44" width="20" height="2" fill="#cbd5e1"/>
  ${/* Croissant de lune sur front */''}
  <rect x="30" y="12" width="4" height="1" fill="#fbbf24"/>
  <rect x="28" y="13" width="2" height="1" fill="#fbbf24"/>
  <rect x="34" y="13" width="2" height="1" fill="#fbbf24"/>
  ${/* Bras */''}
  <rect x="16" y="28" width="6" height="14" fill="#f3f4f6"/>
  <rect x="42" y="28" width="6" height="14" fill="#f3f4f6"/>
  <rect x="17" y="40" width="4" height="3" fill="${SKIN}"/>
  ${/* Arc ornemental argenté */''}
  <rect x="50" y="12" width="3" height="36" fill="#cbd5e1"/>
  <rect x="48" y="12" width="2" height="3" fill="#fbbf24"/>
  <rect x="48" y="45" width="2" height="3" fill="#fbbf24"/>
  <rect x="53" y="16" width="1" height="28" fill="#fbbf24"/>
  ${/* Jambes */''}
  <rect x="26" y="46" width="5" height="14" fill="#f3f4f6"/>
  <rect x="33" y="46" width="5" height="14" fill="#f3f4f6"/>
  <rect x="25" y="58" width="7" height="3" fill="#cbd5e1"/>
  <rect x="32" y="58" width="7" height="3" fill="#cbd5e1"/>
`, '#cbd5e1');

// ─── MAGES ────────────────────────────────────────────────────────────

// apprenti_mystique (R) — robe grise, petit bâton
const apprenti_mystique = wrap(`
  ${humanoid({ armor: '#6b7280', armorDark: '#374151', hair: HAIR_BROWN, legs: '#4b5563', boots: '#1f2937' })}
  ${/* Chapeau pointu gris */''}
  <rect x="26" y="2" width="12" height="2" fill="#4b5563"/>
  <rect x="24" y="4" width="16" height="2" fill="#4b5563"/>
  <rect x="22" y="6" width="20" height="2" fill="#4b5563"/>
  <rect x="20" y="8" width="24" height="2" fill="#4b5563"/>
  ${/* Petit bâton simple */''}
  <rect x="50" y="22" width="2" height="20" fill="#78350f"/>
  <rect x="49" y="20" width="4" height="4" fill="#9ca3af"/>
`);

// pyromancien (R) — robe rouge, flammes en main
const pyromancien = wrap(`
  ${humanoid({ armor: '#dc2626', armorDark: '#7f1d1d', hair: HAIR_BLACK, legs: '#7f1d1d', boots: '#000000' })}
  ${/* Capuche rouge */''}
  <rect x="22" y="4" width="20" height="10" fill="#b91c1c"/>
  <rect x="20" y="6" width="2" height="8" fill="#b91c1c"/>
  <rect x="42" y="6" width="2" height="8" fill="#b91c1c"/>
  ${/* Flamme en main droite */''}
  <rect x="50" y="30" width="4" height="2" fill="#ef4444"/>
  <rect x="49" y="28" width="6" height="2" fill="#f97316"/>
  <rect x="50" y="26" width="4" height="2" fill="#fbbf24"/>
  <rect x="51" y="24" width="2" height="2" fill="#fef3c7"/>
  ${/* Bâton à flamme */''}
  <rect x="14" y="18" width="2" height="26" fill="#78350f"/>
  <rect x="12" y="14" width="6" height="4" fill="#ef4444"/>
  <rect x="13" y="10" width="4" height="4" fill="#f97316"/>
`, '#f97316');

// archimage (SR) — robe bleue, bâton orné, étoile
const archimage = wrap(`
  ${humanoid({ armor: '#1e40af', armorDark: '#1e3a8a', hair: HAIR_WHITE, legs: '#1e3a8a', boots: '#0f172a' })}
  ${/* Chapeau pointu bleu */''}
  <rect x="28" y="0" width="8" height="2" fill="#1e40af"/>
  <rect x="26" y="2" width="12" height="2" fill="#1e40af"/>
  <rect x="24" y="4" width="16" height="2" fill="#1e40af"/>
  <rect x="22" y="6" width="20" height="4" fill="#1e40af"/>
  ${/* Étoile sur chapeau */''}
  <rect x="31" y="4" width="2" height="2" fill="#fbbf24"/>
  ${/* Bâton orné */''}
  <rect x="50" y="20" width="2" height="24" fill="#5a4a30"/>
  <rect x="48" y="14" width="6" height="6" fill="#1e40af"/>
  <rect x="50" y="12" width="2" height="2" fill="#fbbf24"/>
  <rect x="49" y="16" width="4" height="2" fill="#60a5fa"/>
`, '#60a5fa');

// seigneur_elements (SSR) — robe bicolore rouge/bleu, orbe
const seigneur_elements = wrap(`
  ${/* Robe bicolore */''}
  <rect x="22" y="28" width="10" height="18" fill="#dc2626"/>
  <rect x="32" y="28" width="10" height="18" fill="#1e40af"/>
  <rect x="22" y="28" width="10" height="2" fill="#7f1d1d"/>
  <rect x="32" y="28" width="10" height="2" fill="#1e3a8a"/>
  ${/* Tête + cheveux gris */''}
  <rect x="22" y="6" width="20" height="8" fill="#9ca3af"/>
  <rect x="24" y="14" width="16" height="12" fill="${SKIN}"/>
  <rect x="27" y="18" width="2" height="2" fill="#60a5fa"/>
  <rect x="35" y="18" width="2" height="2" fill="#ef4444"/>
  ${/* Bras bicolores */''}
  <rect x="16" y="28" width="6" height="14" fill="#dc2626"/>
  <rect x="42" y="28" width="6" height="14" fill="#1e40af"/>
  ${/* Jambes bicolores */''}
  <rect x="24" y="46" width="7" height="14" fill="#7f1d1d"/>
  <rect x="33" y="46" width="7" height="14" fill="#1e3a8a"/>
  <rect x="23" y="58" width="9" height="3" fill="#000000"/>
  <rect x="32" y="58" width="9" height="3" fill="#000000"/>
  ${/* Orbe flottant */''}
  <rect x="50" y="22" width="6" height="6" fill="#a855f7"/>
  <rect x="51" y="21" width="4" height="1" fill="#d8b4fe"/>
  <rect x="51" y="28" width="4" height="1" fill="#6b21a8"/>
`, '#a855f7');

// merlin (UR) — longue barbe blanche, bâton magique, chapeau pointu
const merlin = wrap(`
  ${/* Chapeau pointu bleu étoilé */''}
  <rect x="30" y="0" width="4" height="2" fill="#1e3a8a"/>
  <rect x="28" y="2" width="8" height="2" fill="#1e3a8a"/>
  <rect x="26" y="4" width="12" height="2" fill="#1e3a8a"/>
  <rect x="24" y="6" width="16" height="2" fill="#1e3a8a"/>
  <rect x="22" y="8" width="20" height="4" fill="#1e3a8a"/>
  <rect x="30" y="6" width="2" height="2" fill="#fbbf24"/>
  <rect x="34" y="4" width="2" height="2" fill="#fbbf24"/>
  ${/* Visage */''}
  <rect x="24" y="14" width="16" height="10" fill="${SKIN}"/>
  <rect x="27" y="16" width="2" height="2" fill="#60a5fa"/>
  <rect x="35" y="16" width="2" height="2" fill="#60a5fa"/>
  ${/* Barbe blanche très longue */''}
  <rect x="24" y="22" width="16" height="2" fill="#f3f4f6"/>
  <rect x="22" y="24" width="20" height="12" fill="#f3f4f6"/>
  <rect x="26" y="36" width="12" height="6" fill="#f3f4f6"/>
  <rect x="28" y="42" width="8" height="4" fill="#f3f4f6"/>
  ${/* Robe bleue longue */''}
  <rect x="18" y="28" width="28" height="24" fill="#1e3a8a"/>
  <rect x="16" y="40" width="32" height="14" fill="#1e3a8a"/>
  <rect x="18" y="28" width="28" height="2" fill="#1e40af"/>
  ${/* Bâton magique avec orbe bleu */''}
  <rect x="50" y="18" width="2" height="30" fill="#5a4a30"/>
  <rect x="47" y="14" width="8" height="6" fill="#60a5fa"/>
  <rect x="49" y="12" width="4" height="2" fill="#bfdbfe"/>
  <rect x="48" y="16" width="1" height="2" fill="#93c5fd"/>
  <rect x="54" y="16" width="1" height="2" fill="#93c5fd"/>
  ${/* Étoiles d'aura */''}
  <rect x="10" y="18" width="2" height="2" fill="#fbbf24"/>
  <rect x="56" y="30" width="2" height="2" fill="#fbbf24"/>
  <rect x="8" y="44" width="2" height="2" fill="#fbbf24"/>
`, '#60a5fa');

// chrono_mage (MYTHIC) — robe noire/argentée, sablier, horloge
const chrono_mage = wrap(`
  ${/* Robe noire avec motifs argentés */''}
  <rect x="18" y="26" width="28" height="28" fill="#0f172a"/>
  <rect x="16" y="42" width="32" height="14" fill="#0f172a"/>
  <rect x="18" y="26" width="28" height="1" fill="${IRIDESCENT}"/>
  <rect x="22" y="32" width="2" height="2" fill="${IRIDESCENT}"/>
  <rect x="40" y="32" width="2" height="2" fill="${IRIDESCENT}"/>
  <rect x="30" y="36" width="4" height="4" fill="${IRIDESCENT}"/>
  ${/* Capuche */''}
  <rect x="20" y="4" width="24" height="6" fill="#0f172a"/>
  <rect x="18" y="8" width="28" height="4" fill="#0f172a"/>
  ${/* Visage dans l'ombre */''}
  <rect x="24" y="12" width="16" height="12" fill="#5a6573"/>
  <rect x="27" y="16" width="2" height="2" fill="${IRIDESCENT}"/>
  <rect x="35" y="16" width="2" height="2" fill="${IRIDESCENT}"/>
  ${/* Sablier en main */''}
  <rect x="48" y="24" width="8" height="2" fill="${IRIDESCENT}"/>
  <rect x="48" y="36" width="8" height="2" fill="${IRIDESCENT}"/>
  <rect x="49" y="26" width="6" height="2" fill="#f3f4f6"/>
  <rect x="50" y="28" width="4" height="2" fill="#f3f4f6"/>
  <rect x="51" y="30" width="2" height="2" fill="#f3f4f6"/>
  <rect x="50" y="34" width="4" height="2" fill="${IRIDESCENT_LIGHT}"/>
  <rect x="51" y="32" width="2" height="2" fill="${IRIDESCENT_LIGHT}"/>
  ${/* Horloges flottantes */''}
  <rect x="6" y="18" width="4" height="4" fill="${IRIDESCENT_LIGHT}"/>
  <rect x="7" y="19" width="2" height="2" fill="#0f172a"/>
  <rect x="56" y="10" width="4" height="4" fill="${IRIDESCENT_LIGHT}"/>
  <rect x="57" y="11" width="2" height="2" fill="#0f172a"/>
  <rect x="4" y="42" width="4" height="4" fill="${IRIDESCENT_LIGHT}"/>
`, IRIDESCENT);

// ─── HEALERS ──────────────────────────────────────────────────────────

// acolyte_sacre (R) — robe blanche, croix dorée
const acolyte_sacre = wrap(`
  ${humanoid({ armor: '#f3f4f6', armorDark: '#cbd5e1', hair: HAIR_BLOND, legs: '#e5e7eb', boots: '#9ca3af' })}
  ${/* Capuche */''}
  <rect x="22" y="6" width="20" height="4" fill="#e5e7eb"/>
  <rect x="20" y="8" width="24" height="4" fill="#e5e7eb"/>
  ${/* Croix dorée sur poitrine */''}
  <rect x="30" y="30" width="4" height="10" fill="#fbbf24"/>
  <rect x="26" y="34" width="12" height="2" fill="#fbbf24"/>
`);

// druide (R) — robe verte feuille, bâton en bois
const druide = wrap(`
  ${humanoid({ armor: '#166534', armorDark: '#14532d', hair: HAIR_BROWN, legs: '#422006', boots: '#1c1917' })}
  ${/* Couronne de feuilles */''}
  <rect x="22" y="6" width="2" height="2" fill="#22c55e"/>
  <rect x="26" y="4" width="2" height="2" fill="#22c55e"/>
  <rect x="30" y="4" width="4" height="2" fill="#22c55e"/>
  <rect x="36" y="4" width="2" height="2" fill="#22c55e"/>
  <rect x="40" y="6" width="2" height="2" fill="#22c55e"/>
  <rect x="24" y="6" width="16" height="2" fill="#14532d"/>
  ${/* Bâton en bois noueux */''}
  <rect x="50" y="16" width="2" height="30" fill="#5a4a30"/>
  <rect x="49" y="14" width="4" height="2" fill="#78350f"/>
  <rect x="50" y="12" width="2" height="2" fill="#22c55e"/>
  <rect x="48" y="10" width="2" height="2" fill="#22c55e"/>
  <rect x="52" y="10" width="2" height="2" fill="#22c55e"/>
  <rect x="51" y="24" width="3" height="1" fill="#78350f"/>
  <rect x="48" y="32" width="3" height="1" fill="#78350f"/>
`);

// pretresse (SR) — robe blanche pure, halo doré
const pretresse = wrap(`
  ${/* Cheveux longs dorés */''}
  <rect x="20" y="4" width="24" height="12" fill="#f0c674"/>
  <rect x="18" y="8" width="2" height="18" fill="#f0c674"/>
  <rect x="44" y="8" width="2" height="18" fill="#f0c674"/>
  ${/* Halo doré */''}
  <rect x="22" y="1" width="20" height="1" fill="#fbbf24"/>
  <rect x="20" y="2" width="2" height="1" fill="#fbbf24"/>
  <rect x="42" y="2" width="2" height="1" fill="#fbbf24"/>
  ${/* Visage */''}
  <rect x="24" y="14" width="16" height="12" fill="${SKIN}"/>
  <rect x="27" y="18" width="2" height="2" fill="#60a5fa"/>
  <rect x="35" y="18" width="2" height="2" fill="#60a5fa"/>
  ${/* Robe blanche immaculée */''}
  <rect x="20" y="26" width="24" height="28" fill="#ffffff"/>
  <rect x="18" y="40" width="28" height="14" fill="#ffffff"/>
  <rect x="20" y="26" width="24" height="2" fill="#fef3c7"/>
  ${/* Bras */''}
  <rect x="14" y="28" width="6" height="14" fill="#ffffff"/>
  <rect x="44" y="28" width="6" height="14" fill="#ffffff"/>
  ${/* Croix dorée sur robe */''}
  <rect x="30" y="32" width="4" height="10" fill="#fbbf24"/>
  <rect x="26" y="36" width="12" height="2" fill="#fbbf24"/>
  ${/* Jambes cachées par robe longue */''}
  <rect x="26" y="54" width="5" height="6" fill="${SKIN}"/>
  <rect x="33" y="54" width="5" height="6" fill="${SKIN}"/>
`, '#fbbf24');

// ange_gardien (SSR) — ailes blanches, robe dorée, aura
const ange_gardien = wrap(`
  ${/* Ailes blanches */''}
  <rect x="4" y="22" width="14" height="4" fill="#f3f4f6"/>
  <rect x="2" y="26" width="16" height="4" fill="#f3f4f6"/>
  <rect x="4" y="30" width="14" height="4" fill="#f3f4f6"/>
  <rect x="6" y="34" width="10" height="2" fill="#e5e7eb"/>
  <rect x="46" y="22" width="14" height="4" fill="#f3f4f6"/>
  <rect x="46" y="26" width="16" height="4" fill="#f3f4f6"/>
  <rect x="46" y="30" width="14" height="4" fill="#f3f4f6"/>
  <rect x="48" y="34" width="10" height="2" fill="#e5e7eb"/>
  ${/* Cheveux dorés */''}
  <rect x="22" y="4" width="20" height="10" fill="#fbbf24"/>
  ${/* Auréole lumineuse */''}
  <rect x="20" y="2" width="24" height="1" fill="#fef3c7"/>
  <rect x="18" y="3" width="2" height="2" fill="#fef3c7"/>
  <rect x="44" y="3" width="2" height="2" fill="#fef3c7"/>
  ${/* Visage */''}
  <rect x="24" y="14" width="16" height="12" fill="${SKIN}"/>
  <rect x="27" y="18" width="2" height="2" fill="#60a5fa"/>
  <rect x="35" y="18" width="2" height="2" fill="#60a5fa"/>
  ${/* Robe dorée */''}
  <rect x="22" y="26" width="20" height="26" fill="#fbbf24"/>
  <rect x="20" y="44" width="24" height="10" fill="#fbbf24"/>
  <rect x="22" y="26" width="20" height="2" fill="#d4a556"/>
  <rect x="30" y="32" width="4" height="12" fill="#ffffff"/>
  <rect x="26" y="36" width="12" height="2" fill="#ffffff"/>
  ${/* Jambes */''}
  <rect x="26" y="54" width="5" height="6" fill="${SKIN}"/>
  <rect x="33" y="54" width="5" height="6" fill="${SKIN}"/>
`, '#fbbf24');

// deesse_vie (UR) — robe fleurie, couronne de fleurs, aura verte
const deesse_vie = wrap(`
  ${/* Cheveux verts longs */''}
  <rect x="20" y="4" width="24" height="14" fill="#22c55e"/>
  <rect x="18" y="10" width="2" height="20" fill="#22c55e"/>
  <rect x="44" y="10" width="2" height="20" fill="#22c55e"/>
  ${/* Couronne de fleurs */''}
  <rect x="22" y="2" width="4" height="2" fill="#f472b6"/>
  <rect x="28" y="2" width="4" height="2" fill="#fbbf24"/>
  <rect x="34" y="2" width="4" height="2" fill="#f472b6"/>
  <rect x="40" y="2" width="4" height="2" fill="#fbbf24"/>
  ${/* Visage */''}
  <rect x="24" y="14" width="16" height="12" fill="${SKIN}"/>
  <rect x="27" y="18" width="2" height="2" fill="#22c55e"/>
  <rect x="35" y="18" width="2" height="2" fill="#22c55e"/>
  ${/* Robe fleurie verte */''}
  <rect x="20" y="26" width="24" height="26" fill="#166534"/>
  <rect x="18" y="44" width="28" height="10" fill="#166534"/>
  ${/* Fleurs sur robe */''}
  <rect x="24" y="32" width="2" height="2" fill="#f472b6"/>
  <rect x="36" y="34" width="2" height="2" fill="#fbbf24"/>
  <rect x="28" y="40" width="2" height="2" fill="#f472b6"/>
  <rect x="38" y="42" width="2" height="2" fill="#fbbf24"/>
  <rect x="22" y="46" width="2" height="2" fill="#f472b6"/>
  ${/* Bras */''}
  <rect x="14" y="28" width="6" height="14" fill="#166534"/>
  <rect x="44" y="28" width="6" height="14" fill="#166534"/>
  ${/* Jambes */''}
  <rect x="26" y="54" width="5" height="6" fill="${SKIN}"/>
  <rect x="33" y="54" width="5" height="6" fill="${SKIN}"/>
  ${/* Particules vertes d'aura */''}
  <rect x="8" y="16" width="2" height="2" fill="#22c55e"/>
  <rect x="54" y="20" width="2" height="2" fill="#22c55e"/>
  <rect x="6" y="38" width="2" height="2" fill="#22c55e"/>
  <rect x="56" y="44" width="2" height="2" fill="#22c55e"/>
`, '#22c55e');

// ─── Mapping ID → SVG ─────────────────────────────────────────────────

const SPRITES = {
  // Warriors
  garde_royal, centurion, chevalier_noir, paladin_celeste, dieu_guerre, titan_originel,
  // Archers
  chasseur, eclaireur, ranger_elite, tireur_elite, artemis,
  // Mages
  apprenti_mystique, pyromancien, archimage, seigneur_elements, merlin, chrono_mage,
  // Healers
  acolyte_sacre, druide, pretresse, ange_gardien, deesse_vie,
};

/**
 * Clé texture Phaser pour un héros. Retourne null si heroId inconnu.
 */
export function getHeroSpriteKey(heroId) {
  if (!heroId || !SPRITES[heroId]) return null;
  return `hero_${heroId}`;
}

/**
 * Enregistre les 22 textures de héros dans le scene Phaser via data URIs.
 * À appeler dans scene.preload().
 */
export function registerHeroTextures(scene) {
  for (const [heroId, svg] of Object.entries(SPRITES)) {
    const key = `hero_${heroId}`;
    if (scene.textures.exists(key)) continue;
    const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    scene.load.image(key, dataUri);
  }
}

/**
 * Pour le Codex — retourne le SVG brut pour affichage en DOM.
 */
export function getHeroSVG(heroId) {
  return SPRITES[heroId] || null;
}
