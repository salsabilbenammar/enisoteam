-- Paiement validé pour les inscriptions aux formations payantes
-- node database/migrate_training_paiement_valide.js

ALTER TABLE `training_registrations`
  ADD COLUMN `paiement_valide` TINYINT(1) NOT NULL DEFAULT 0 AFTER `accepte_paiement`;
