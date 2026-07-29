USE `eniso_team`;

ALTER TABLE `announcements`
  ADD COLUMN `lien_formulaire` VARCHAR(500) DEFAULT NULL AFTER `image`;
