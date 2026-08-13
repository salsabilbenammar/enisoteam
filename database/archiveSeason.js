/**
 * Saison universitaire — archive_year en base = année de fin (ex. 2027 → « 2026/2027 »).
 * À partir d’août, la nouvelle saison démarre (ex. août 2026 → 2026/2027).
 */

function archiveEndYearFromDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 8 ? y + 1 : y;
}

function formatArchiveSeason(endYear) {
  const n = endYear != null && endYear !== '' ? Number(endYear) : null;
  if (!n || Number.isNaN(n) || n < 2) return null;
  return `${n - 1}/${n}`;
}

function currentArchiveEndYear(date = new Date()) {
  return archiveEndYearFromDate(date);
}

function currentArchiveSeasonLabel(date = new Date()) {
  return formatArchiveSeason(currentArchiveEndYear(date));
}

module.exports = {
  archiveEndYearFromDate,
  formatArchiveSeason,
  currentArchiveEndYear,
  currentArchiveSeasonLabel,
};
