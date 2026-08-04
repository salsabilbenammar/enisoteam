USE `eniso_team`;

ALTER TABLE `trainings`
  ADD COLUMN `payante` TINYINT(1) NOT NULL DEFAULT 0 AFTER `inscription_ouverte`,
  ADD COLUMN `prix` VARCHAR(50) DEFAULT NULL AFTER `payante`;

ALTER TABLE `training_registrations`
  ADD COLUMN `accepte_paiement` TINYINT(1) NOT NULL DEFAULT 0 AFTER `motivation`;
