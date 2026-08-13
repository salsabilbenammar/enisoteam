-- Publication auto des groupes à 100%
-- node database/migrate_project_publish.js

ALTER TABLE `project_assignments`
  ADD COLUMN `published_at` TIMESTAMP NULL DEFAULT NULL AFTER `progress`;
