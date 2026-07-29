-- Galerie photos du club
USE `eniso_team`;

CREATE TABLE IF NOT EXISTS `gallery` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `titre`           VARCHAR(200)  NOT NULL,
  `description`     TEXT          DEFAULT NULL,
  `image`           VARCHAR(255)  NOT NULL,
  `ordre_affichage` INT           NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gallery_ordre` (`ordre_affichage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
