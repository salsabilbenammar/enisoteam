-- Médias du slider d'accueil (photos + vidéos)
USE `eniso_team`;

ALTER TABLE `gallery`
  ADD COLUMN `media_type` ENUM('image', 'video') NOT NULL DEFAULT 'image' AFTER `image`;
