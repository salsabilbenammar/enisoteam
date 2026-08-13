-- Avancement groupe (0–100), départ à 0
-- node database/migrate_project_progress.js

ALTER TABLE `project_assignments`
  ADD COLUMN `progress` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `label`;
