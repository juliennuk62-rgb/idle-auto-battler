// logger.js — wrapper de logs avec flag DEBUG.
//
// Permet de désactiver les logs verbose en production sans refactorer
// tous les console.log du projet. Utilise window.__DEBUG pour un override
// à chaud via la console.
//
// Usage :
//   import { log, warn, error } from '../utils/logger.js';
//   log('[MonModule]', 'message');  // affiché seulement si DEBUG=true
//   error('[MonModule]', 'erreur'); // toujours affiché

// Par défaut DEBUG=true (utile en dev).
// Pour la prod : dans la console navigateur → `window.__DEBUG = false`
const DEFAULT_DEBUG = true;

function isDebug() {
  if (typeof window !== 'undefined' && window.__DEBUG !== undefined) return !!window.__DEBUG;
  return DEFAULT_DEBUG;
}

/** Log verbeux (désactivable en prod). */
export function log(...args) {
  if (isDebug()) console.log(...args);
}

/** Info (désactivable en prod). */
export function info(...args) {
  if (isDebug()) console.info(...args);
}

/** Warning — toujours affiché (même en prod) pour ne pas masquer les signaux. */
export function warn(...args) {
  console.warn(...args);
}

/** Error — toujours affiché (critique). */
export function error(...args) {
  console.error(...args);
}

/** Debug check utile pour wrapper des blocs de code debug. */
export const DEBUG = isDebug;
