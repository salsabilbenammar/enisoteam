-- Mode FIFO par paiement (formations payantes)
-- node database/migrate_training_fifo_paiement.js

ALTER TABLE `trainings`
  ADD COLUMN `fifo_paiement` TINYINT(1) NOT NULL DEFAULT 0 AFTER `prix`;

ALTER TABLE `training_registrations`
  ADD COLUMN `paiement_valide_at` DATETIME NULL DEFAULT NULL AFTER `paiement_valide`;
