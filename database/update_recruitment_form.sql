USE `eniso_team`;

ALTER TABLE `recruitment_candidates`
  ADD COLUMN `facebook_link` VARCHAR(500) DEFAULT NULL AFTER `telephone`,
  ADD COLUMN `adresse` VARCHAR(255) DEFAULT NULL AFTER `annee`,
  ADD COLUMN `photo_path` VARCHAR(255) DEFAULT NULL AFTER `adresse`,
  ADD COLUMN `motivation_robotics` TEXT DEFAULT NULL AFTER `motivation`,
  ADD COLUMN `domaine_interet` VARCHAR(150) DEFAULT NULL AFTER `motivation_robotics`,
  ADD COLUMN `unique_about` TEXT DEFAULT NULL AFTER `domaine_interet`,
  ADD COLUMN `piece_jointe_path` VARCHAR(255) DEFAULT NULL AFTER `unique_about`;
