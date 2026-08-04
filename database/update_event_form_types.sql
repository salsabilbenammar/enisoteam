USE `eniso_team`;

ALTER TABLE `events`
  ADD COLUMN `formulaire_type` VARCHAR(40) NOT NULL DEFAULT 'individuel' AFTER `inscription_ouverte`,
  ADD COLUMN `accompagnants_min` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `formulaire_type`,
  ADD COLUMN `accompagnants_max` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `accompagnants_min`,
  ADD COLUMN `champs_personnalises` JSON DEFAULT NULL AFTER `accompagnants_max`;

ALTER TABLE `event_registrations`
  ADD COLUMN `accompagnants` JSON DEFAULT NULL AFTER `motivation`,
  ADD COLUMN `reponses_personnalisees` JSON DEFAULT NULL AFTER `accompagnants`;
