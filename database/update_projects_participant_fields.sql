-- Téléphone + filière sur participants (formulaire projets)
-- node database/migrate_project_participant_fields.js

ALTER TABLE `project_form_participants`
  ADD COLUMN `telephone` VARCHAR(40) DEFAULT NULL AFTER `email`,
  ADD COLUMN `filiere` VARCHAR(120) DEFAULT NULL AFTER `telephone`;

ALTER TABLE `project_assignment_members`
  ADD COLUMN `telephone` VARCHAR(40) DEFAULT NULL AFTER `email`,
  ADD COLUMN `filiere` VARCHAR(120) DEFAULT NULL AFTER `telephone`;
