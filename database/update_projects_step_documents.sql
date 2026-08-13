-- Document requis par étape + fichier soumis par le groupe
-- node database/migrate_project_step_documents.js

ALTER TABLE `project_steps`
  ADD COLUMN `requires_document` TINYINT(1) NOT NULL DEFAULT 0 AFTER `ordre`;

ALTER TABLE `project_assignment_step_status`
  ADD COLUMN `document_path` VARCHAR(255) DEFAULT NULL AFTER `submitted_by_member_id`,
  ADD COLUMN `document_name` VARCHAR(255) DEFAULT NULL AFTER `document_path`;
