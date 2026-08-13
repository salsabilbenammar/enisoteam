-- Nombre maximal de places pour une formation
-- node database/migrate_training_max_places.js

ALTER TABLE `trainings`
  ADD COLUMN `max_places` INT UNSIGNED NULL DEFAULT NULL AFTER `prix`;
