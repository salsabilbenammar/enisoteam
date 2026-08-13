-- Projets archivés (année précédente) : pas de parcours d'étapes, affichage vitrine
-- node database/migrate_project_archive.js

ALTER TABLE `project_catalog`
  ADD COLUMN `archive_year` SMALLINT UNSIGNED NULL DEFAULT NULL AFTER `gallery`;
