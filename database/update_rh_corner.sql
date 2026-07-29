-- Coin RH : mérites + formulaires anonymes
USE `eniso_team`;

CREATE TABLE IF NOT EXISTS `members` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`           VARCHAR(100)  NOT NULL,
  `email`         VARCHAR(150)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `filiere`       VARCHAR(100)  DEFAULT NULL,
  `actif`         TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_members_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `merit_entries` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `member_id`  INT UNSIGNED  NOT NULL,
  `points`     INT           NOT NULL DEFAULT 1,
  `motif`      VARCHAR(500)  NOT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_merit_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rh_reports` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `sujet`      VARCHAR(200)  NOT NULL,
  `message`    TEXT          NOT NULL,
  `statut`     ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rh_suggestions` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `titre`         VARCHAR(200)  NOT NULL,
  `message`       TEXT          NOT NULL,
  `member_id`     INT UNSIGNED  DEFAULT NULL,
  `member_nom`    VARCHAR(100)  DEFAULT NULL,
  `member_email`  VARCHAR(150)  DEFAULT NULL,
  `statut`        ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rh_training_requests` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `theme`      VARCHAR(200)  NOT NULL,
  `message`    TEXT          NOT NULL,
  `niveau`     VARCHAR(50)   DEFAULT NULL,
  `statut`     ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
