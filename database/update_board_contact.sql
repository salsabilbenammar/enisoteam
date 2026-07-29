-- Ajoute téléphone + Facebook aux membres du bureau
-- Exécuter une seule fois dans phpMyAdmin
USE `eniso_team`;

ALTER TABLE `board_members`
  ADD COLUMN `telephone` VARCHAR(50)  DEFAULT NULL AFTER `email`,
  ADD COLUMN `facebook`  VARCHAR(500) DEFAULT NULL AFTER `telephone`;
