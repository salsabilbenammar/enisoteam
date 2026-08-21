-- Module Car & déplacement (Secrétaire générale)
-- node database/migrate_deplacements.js

CREATE TABLE IF NOT EXISTS `deplacements` (
  `id`                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titre`                VARCHAR(200) NOT NULL,
  `description`          TEXT         NOT NULL,
  `destination`          VARCHAR(200) DEFAULT NULL,
  `competition`          VARCHAR(200) DEFAULT NULL,
  `date_competition`     DATE         DEFAULT NULL,
  `prix`                 VARCHAR(50)  DEFAULT NULL,
  `payant`               TINYINT(1)   NOT NULL DEFAULT 0,
  `inscription_ouverte`  TINYINT(1)   NOT NULL DEFAULT 0,
  `places_max`           INT UNSIGNED DEFAULT NULL,
  `champs_personnalises` JSON         DEFAULT NULL,
  `champs_competiteur`   JSON         DEFAULT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deplacements_open` (`inscription_ouverte`),
  KEY `idx_deplacements_date` (`date_competition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `deplacement_registrations` (
  `id`                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `deplacement_id`          INT UNSIGNED NOT NULL,
  `member_id`               INT UNSIGNED DEFAULT NULL,
  `prenom`                  VARCHAR(100) NOT NULL,
  `nom`                     VARCHAR(100) NOT NULL,
  `email`                   VARCHAR(150) NOT NULL,
  `telephone`               VARCHAR(50)  NOT NULL,
  `filiere`                 VARCHAR(100) DEFAULT NULL,
  `annee`                   VARCHAR(50)  DEFAULT NULL,
  `role_candidat`           ENUM('spectateur', 'competiteur') NOT NULL DEFAULT 'spectateur',
  `motivation`              TEXT         DEFAULT NULL,
  `accepte_paiement`        TINYINT(1)   NOT NULL DEFAULT 0,
  `paiement_valide`         TINYINT(1)   NOT NULL DEFAULT 0,
  `paiement_valide_at`      DATETIME     DEFAULT NULL,
  `reponses_personnalisees` JSON         DEFAULT NULL,
  `created_at`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dep_reg_dep` (`deplacement_id`),
  KEY `idx_dep_reg_email` (`email`),
  KEY `idx_dep_reg_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
