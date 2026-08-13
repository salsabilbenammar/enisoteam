/** Réalisations archivées — saison universitaire. */
export const LAST_MANDATE_PROJECT_LEAD = 'Achref Bouzidi';

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
