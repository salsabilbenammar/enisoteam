-- Photos membres + superviseurs multi (JSON TEXT)
-- node database/migrate_project_photos_supervisors.js

ALTER TABLE `project_form_participants`
  ADD COLUMN `photo` VARCHAR(255) DEFAULT NULL AFTER `filiere`;

ALTER TABLE `project_assignment_members`
  ADD COLUMN `photo` VARCHAR(255) DEFAULT NULL AFTER `filiere`;

ALTER TABLE `project_assignments`
  MODIFY COLUMN `supervisors` TEXT NOT NULL;
