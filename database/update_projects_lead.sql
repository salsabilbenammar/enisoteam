-- Chef de projet (mandat) pour les réalisations archivées
-- node database/migrate_project_lead.js

ALTER TABLE `project_catalog`
  ADD COLUMN `project_lead` VARCHAR(120) NULL DEFAULT NULL AFTER `archive_year`;
