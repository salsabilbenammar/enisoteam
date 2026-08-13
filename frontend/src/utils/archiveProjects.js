/** Réalisations — saison universitaire + responsable projet (poste bureau). */

import { BOARD_MEMBER_NAMES } from '../data/boardRoles';

/** Fin de mandat précédent (showroom historique). */
export const LAST_MANDATE_END_YEAR = 2026;
export const LAST_MANDATE_PROJECT_LEAD = 'Achref Bouzidi';

/**
 * Responsable Projet du bureau par année de fin de saison.
 * archive_year en base = année de fin (ex. 2026 → saison 2025/2026).
 */
export const PROJECT_LEAD_BY_END_YEAR = {
  2026: 'Achref Bouzidi', // saison 2025/2026
  2027: BOARD_MEMBER_NAMES.projet || 'Dhouha Kmala', // saison 2026/2027 (bureau actuel)
};

/** Année de fin stockée en base → libellé « 2026/2027 ». */
export function formatArchiveSeason(endYear) {
  const n = endYear != null && endYear !== '' ? Number(endYear) : null;
  if (!n || Number.isNaN(n) || n < 2) return null;
  return `${n - 1}/${n}`;
}

/** Saison en cours à partir d’août (ex. août 2026 → fin 2027). */
export function archiveEndYearFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 8 ? y + 1 : y;
}

export function currentArchiveEndYear(date = new Date()) {
  return archiveEndYearFromDate(date);
}

export function currentArchiveSeasonLabel(date = new Date()) {
  return formatArchiveSeason(currentArchiveEndYear(date));
}

/** Responsable projet du bureau pour une année de fin de saison. */
export function projectLeadForEndYear(endYear) {
  const n = endYear != null && endYear !== '' ? Number(endYear) : null;
  if (n && !Number.isNaN(n) && PROJECT_LEAD_BY_END_YEAR[n]) {
    return PROJECT_LEAD_BY_END_YEAR[n];
  }
  // Saison courante / futures → responsable bureau actuel
  return BOARD_MEMBER_NAMES.projet || 'Dhouha Kmala';
}

export function currentProjectLead(date = new Date()) {
  return projectLeadForEndYear(currentArchiveEndYear(date));
}

/**
 * Nom à afficher : valeur stockée si renseignée, sinon bureau de la saison.
 * @param {{ project_lead?: string|null, archive_year?: number|null, season_year?: number|null }} item
 */
export function resolveProjectLead(item) {
  const stored = item?.project_lead ? String(item.project_lead).trim() : '';
  if (stored) return stored;
  const endYear =
    item?.archive_year ??
    item?.season_year ??
    (item?.published_at ? archiveEndYearFromDate(item.published_at) : null) ??
    currentArchiveEndYear();
  return projectLeadForEndYear(endYear);
}

/** Libellé saison pour une attribution ou réalisation. */
export function seasonLabelForItem(item) {
  if (item?.archive_season_label) return item.archive_season_label;
  if (item?.season_label) return item.season_label;
  const endYear =
    item?.archive_year ??
    item?.season_year ??
    (item?.published_at ? archiveEndYearFromDate(item.published_at) : null);
  return formatArchiveSeason(endYear);
}

export function seasonEndYearForItem(item) {
  if (item?.archive_year != null) return Number(item.archive_year);
  if (item?.season_year != null) return Number(item.season_year);
  if (item?.published_at) return archiveEndYearFromDate(item.published_at);
  return null;
}
