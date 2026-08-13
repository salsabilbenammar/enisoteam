-- Passer les réalisations archivées de 2025 à 2026
-- node database/migrate_archive_year_2026.js

UPDATE project_catalog SET archive_year = 2026 WHERE archive_year = 2025;

UPDATE project_assignments
SET published_at = '2026-05-20 12:00:00'
WHERE progress >= 100
  AND published_at IS NOT NULL
  AND YEAR(published_at) = 2025;
