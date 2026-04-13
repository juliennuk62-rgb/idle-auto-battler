// Formatters numériques et temporels réutilisés dans toute l'UI.
// Testable en isolation, zéro dépendance.

/**
 * Convertit un nombre en notation compacte lisible :
 *   < 1 000         → entier
 *   < 10 000        → "4.2K"
 *   < 1 000 000     → "42K"
 *   < 10 000 000    → "4.2M"
 *   < 1 000 000 000 → "42M"
 *   < 10^10         → "4.2B"
 *   < 10^12         → "42B"
 *   < 10^15         → "4.2T"
 *   au-delà         → notation scientifique (1.2e18)
 */
export function formatNumber(n) {
  if (!Number.isFinite(n)) return '?';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 1000) return sign + Math.floor(abs);
  if (abs < 10_000) return sign + (abs / 1000).toFixed(1) + 'K';
  if (abs < 1_000_000) return sign + Math.floor(abs / 1000) + 'K';
  if (abs < 10_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs < 1_000_000_000) return sign + Math.floor(abs / 1_000_000) + 'M';
  if (abs < 10_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  if (abs < 1_000_000_000_000) return sign + Math.floor(abs / 1_000_000_000) + 'B';
  if (abs < 1e15) return sign + (abs / 1e12).toFixed(1) + 'T';
  return sign + n.toExponential(2);
}

/**
 * Durée en millisecondes → "1h 23m 47s" / "23m 47s" / "47s".
 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Timestamp HH:MM pour les entrées de timeline.
 */
export function formatTime(date = new Date()) {
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}
