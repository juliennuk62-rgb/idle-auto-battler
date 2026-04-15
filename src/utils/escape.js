// escape.js — helpers de protection XSS pour les données utilisateur.
//
// Le jeu affiche principalement des données internes (noms de héros, items
// hardcodés). Les seules données "utilisateur" sont le displayName Google +
// les photoURL Google. Ces helpers les neutralisent.

/**
 * Échappe les caractères HTML dangereux dans une chaîne.
 * À utiliser pour toute valeur affichée via innerHTML/template literals.
 */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Valide qu'une URL est safe pour un attribut src d'image.
 * Refuse javascript:, data: (sauf image), file:, etc.
 * Accepte uniquement https:// et // (protocol-relative).
 */
export function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Accepte les data URIs d'images uniquement (pas de SVG qui peut contenir JS)
  if (/^data:image\/(png|jpeg|jpg|gif|webp);/i.test(trimmed)) return trimmed;
  // Accepte https:// et //
  if (/^https:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) return trimmed;
  // Accepte les chemins relatifs simples (assets du jeu)
  if (/^[a-zA-Z0-9_\-./]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(trimmed)) return trimmed;
  return '';
}
