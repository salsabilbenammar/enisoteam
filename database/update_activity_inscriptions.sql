USE `eniso_team`;

ALTER TABLE `events`
  ADD COLUMN `inscription_ouverte` TINYINT(1) NOT NULL DEFAULT 0 AFTER `statut`;

ALTER TABLE `trainings`
  ADD COLUMN `inscription_ouverte` TINYINT(1) NOT NULL DEFAULT 0 AFTER `lien`,
  ADD COLUMN `payante` TINYINT(1) NOT NULL DEFAULT 0 AFTER `inscription_ouverte`,
  ADD COLUMN `prix` VARCHAR(50) DEFAULT NULL AFTER `payante`;

CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`       INT UNSIGNED NOT NULL,
  `prenom`         VARCHAR(100) NOT NULL,
  `nom`            VARCHAR(100) NOT NULL,
  `email`          VARCHAR(150) NOT NULL,
  `telephone`      VARCHAR(50)  NOT NULL,
  `facebook_link`  VARCHAR(500) DEFAULT NULL,
  `filiere`        VARCHAR(100) DEFAULT NULL,
  `annee`          VARCHAR(50)  DEFAULT NULL,
  `motivation`     TEXT         DEFAULT NULL,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_reg_event` (`event_id`),
  KEY `idx_event_reg_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `training_registrations` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `training_id`       INT UNSIGNED NOT NULL,
  `prenom`            VARCHAR(100) NOT NULL,
  `nom`               VARCHAR(100) NOT NULL,
  `email`             VARCHAR(150) NOT NULL,
  `telephone`         VARCHAR(50)  NOT NULL,
  `facebook_link`     VARCHAR(500) DEFAULT NULL,
  `filiere`           VARCHAR(100) DEFAULT NULL,
  `annee`             VARCHAR(50)  DEFAULT NULL,
  `motivation`        TEXT         DEFAULT NULL,
  `accepte_paiement`  TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training_reg_training` (`training_id`),
  KEY `idx_training_reg_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
