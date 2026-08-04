USE `eniso_team`;

ALTER TABLE `trainings`
  ADD COLUMN `champs_personnalises` JSON DEFAULT NULL AFTER `prix`;

ALTER TABLE `training_registrations`
  ADD COLUMN `reponses_personnalisees` JSON DEFAULT NULL AFTER `accepte_paiement`;
