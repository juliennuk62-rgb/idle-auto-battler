// item-icons.js — icônes SVG pixel art pour les 18 templates d'items.
// Chaque icône est un SVG 16×16 minimaliste qui évoque le template.
// La couleur est dynamique via `currentColor` (on set CSS color selon rareté).

// ══════════════════════════════════════════════════════════════════════════
// ICÔNES PAR TEMPLATE (items.js ITEM_TEMPLATES)
// ══════════════════════════════════════════════════════════════════════════

export const TEMPLATE_ICONS = {
  // ── Forêt : épée de bois, plastron de chêne, amulette verte ──
  forest_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="2" width="2" height="8" fill="currentColor"/>
    <rect x="6" y="1" width="4" height="1" fill="currentColor"/>
    <rect x="5" y="10" width="6" height="1" fill="#8b6f47"/>
    <rect x="7" y="11" width="2" height="4" fill="#8b6f47"/>
  </svg>`,
  forest_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4 L8 2 L12 4 L12 11 L8 14 L4 11 Z" fill="currentColor"/>
    <path d="M7 6 L9 6 L9 10 L7 10 Z" fill="none" stroke="#2d3a1f" stroke-width="0.5"/>
  </svg>`,
  forest_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="6" r="2" fill="currentColor"/>
    <circle cx="8" cy="6" r="1" fill="#3a5f2d"/>
    <path d="M7 4 L6 1 L10 1 L9 4" fill="none" stroke="currentColor" stroke-width="1"/>
  </svg>`,

  // ── Grottes : masse de pierre, bouclier cristal, anneau troglodyte ──
  caves_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="2" width="4" height="5" fill="currentColor"/>
    <rect x="5" y="3" width="1" height="3" fill="currentColor"/>
    <rect x="10" y="3" width="1" height="3" fill="currentColor"/>
    <rect x="7" y="7" width="2" height="8" fill="#5a5a5a"/>
  </svg>`,
  caves_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3 L8 1 L13 3 L13 12 L8 15 L3 12 Z" fill="currentColor"/>
    <path d="M8 4 L10 8 L8 12 L6 8 Z" fill="#a8e0ff" opacity="0.7"/>
  </svg>`,
  caves_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
  </svg>`,

  // ── Ruines : khépesh maudit, armure du sphinx, scarabée d'or ──
  ruins_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1 Q14 4 11 7 L7 11 L7 14 L5 12 L5 11 L9 7 Q6 4 10 1 Z" fill="currentColor"/>
  </svg>`,
  ruins_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3 L8 1 L12 3 L13 10 L8 14 L3 10 Z" fill="currentColor"/>
    <path d="M6 5 L8 4 L10 5 L10 8 L8 10 L6 8 Z" fill="#fbbf24"/>
  </svg>`,
  ruins_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="8" cy="8" rx="4" ry="5" fill="currentColor"/>
    <path d="M8 3 L8 13 M5 6 L11 6 M5 10 L11 10" stroke="#8b6f47" stroke-width="0.5" fill="none"/>
  </svg>`,

  // ── Enfer : lame infernale, cape de cendres, orbe démoniaque ──
  hell_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1 L9 9 L11 8 L8 15 L5 8 L7 9 Z" fill="currentColor"/>
    <circle cx="8" cy="11" r="1" fill="#ffcc00"/>
  </svg>`,
  hell_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4 L8 1 L14 4 L13 13 L8 15 L3 13 Z" fill="currentColor"/>
    <path d="M6 6 L8 4 L10 6 L10 10 L8 12 L6 10 Z" fill="#4a1a0a"/>
    <circle cx="8" cy="8" r="1.5" fill="#ff4400"/>
  </svg>`,
  hell_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5" fill="currentColor"/>
    <circle cx="8" cy="8" r="3" fill="#2a0a0a"/>
    <circle cx="8" cy="8" r="1.5" fill="#ff4400"/>
  </svg>`,

  // ── Neige : hache de givre, robe de glace, pendentif arctique ──
  snow_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 5 L8 2 L13 5 L13 8 L10 8 L10 6 L6 6 L6 8 L3 8 Z" fill="currentColor"/>
    <rect x="7" y="8" width="2" height="7" fill="#6a4a2a"/>
  </svg>`,
  snow_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3 L8 1 L12 3 L12 13 L8 15 L4 13 Z" fill="currentColor"/>
    <path d="M8 4 L6 7 L8 7 L6 10 L8 10 L6 13" stroke="#ffffff" stroke-width="0.8" fill="none"/>
  </svg>`,
  snow_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3 L9 7 L13 7 L10 10 L11 14 L8 11 L5 14 L6 10 L3 7 L7 7 Z" fill="currentColor"/>
  </svg>`,

  // ── Temple : épée sacrée, égide céleste, relique ancienne ──
  temple_sword: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="1" width="2" height="10" fill="currentColor"/>
    <rect x="4" y="10" width="8" height="1" fill="#ffd700"/>
    <rect x="5" y="11" width="6" height="1" fill="#ffd700"/>
    <rect x="7" y="12" width="2" height="3" fill="#8b6f47"/>
    <circle cx="8" cy="2" r="1" fill="#ffd700"/>
  </svg>`,
  temple_armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3 L8 1 L13 3 L13 10 L8 15 L3 10 Z" fill="currentColor"/>
    <path d="M7 4 L9 4 L9 7 L11 7 L11 9 L9 9 L9 12 L7 12 L7 9 L5 9 L5 7 L7 7 Z" fill="#ffd700"/>
  </svg>`,
  temple_access: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5" fill="currentColor"/>
    <circle cx="8" cy="8" r="3" fill="#ffd700"/>
    <circle cx="8" cy="8" r="1" fill="#ffffff"/>
    <path d="M8 2 L8 4 M8 12 L8 14 M2 8 L4 8 M12 8 L14 8" stroke="#ffd700" stroke-width="1"/>
  </svg>`,
};

// ══════════════════════════════════════════════════════════════════════════
// ICÔNES DÉFAUT PAR TYPE (fallback si template inconnu, ex: items uniques)
// ══════════════════════════════════════════════════════════════════════════

const DEFAULT_ICONS = {
  weapon: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="2" width="2" height="9" fill="currentColor"/>
    <rect x="5" y="10" width="6" height="1" fill="currentColor"/>
    <rect x="7" y="11" width="2" height="4" fill="#8b6f47"/>
  </svg>`,
  armor: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3 L8 1 L12 3 L12 12 L8 15 L4 12 Z" fill="currentColor"/>
  </svg>`,
  accessory: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
  </svg>`,
};

// ══════════════════════════════════════════════════════════════════════════
// API PUBLIQUE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Retourne le HTML d'une icône d'item (SVG inline) avec coloration rareté.
 * @param {Object} item — un item de l'inventaire avec {templateId, type, rarity, rarityColor}
 * @returns {string} HTML string prêt à insérer
 */
export function renderItemIcon(item) {
  if (!item) return '';
  const svg = TEMPLATE_ICONS[item.templateId] || DEFAULT_ICONS[item.type] || DEFAULT_ICONS.weapon;
  const rarityClass = `item-svg-rarity-${item.rarity || 'common'}`;
  return `<span class="item-svg ${rarityClass}" style="color:${item.rarityColor || '#9ca3af'}">${svg}</span>`;
}

/**
 * Version simple : juste le SVG sans wrapper (pour composer ailleurs).
 */
export function getItemSvg(item) {
  if (!item) return '';
  return TEMPLATE_ICONS[item.templateId] || DEFAULT_ICONS[item.type] || DEFAULT_ICONS.weapon;
}
