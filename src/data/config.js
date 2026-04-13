// Configuration technique du jeu (≠ game balance).
// Flags runtime, limites de buffer, clés de stockage, etc.
// Tout ce qui n'est pas du balancing gameplay mais qui contrôle le comportement
// technique du code vit ici.

export const CONFIG = {
  // Télémétrie — collecte d'événements de combat pour équilibrage et stats.
  // Quand false, toutes les méthodes de TelemetrySystem deviennent des no-op
  // (zéro impact sur les perfs du combat).
  telemetry_enabled: true,

  // Nombre max de combats conservés dans le buffer circulaire mémoire.
  // Au-delà, les plus anciens sont écrasés. Les agrégats restent cumulés.
  telemetry_buffer_size: 100,

  // Clé localStorage pour persister les agrégats de télémétrie.
  // Volontairement séparée de la clé de sauvegarde principale pour ne pas
  // polluer le save game en cas de corruption/migration.
  telemetry_storage_key: 'telemetry_aggregates',
};
