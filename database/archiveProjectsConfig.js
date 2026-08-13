/** Projets archivés — config showroom (seeds, ordre). */
module.exports = {
  /** Fin de mandat précédent (seeds historiques). */
  ARCHIVE_YEAR: 2026,
  /** Responsable Projet bureau — saison 2025/2026. */
  PROJECT_LEAD: 'Achref Bouzidi',
  /**
   * Responsable Projet du bureau par année de fin de saison.
   * 2026 → 2025/2026 · 2027 → 2026/2027 (Dhouha Kmala)
   */
  PROJECT_LEAD_BY_END_YEAR: {
    2026: 'Achref Bouzidi',
    2027: 'Dhouha Kmala',
  },
  PUBLISHED_AT: '2026-05-20 12:00:00',
  /** Ordre d’affichage dans le showroom (les autres suivent par titre). */
  SHOWCASE_ORDER: [
    'Drone',
    'Cube Led',
    'Fire Fighter',
    'Green House',
    'Robot contrôlé par gestes',
    'Smart House',
    'Solar Tracking System',
    'Sumo Robot',
  ],
};
