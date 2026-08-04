-- Module recrutement complet
USE `eniso_team`;

CREATE TABLE IF NOT EXISTS `recruitment_candidates` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom`              VARCHAR(100) NOT NULL,
  `prenom`           VARCHAR(100) NOT NULL,
  `email`            VARCHAR(150) NOT NULL,
  `telephone`        VARCHAR(50)  NOT NULL,
  `filiere`          VARCHAR(100) DEFAULT NULL,
  `annee`            VARCHAR(50)  DEFAULT NULL,
  `motivation`       TEXT         NOT NULL,
  `competences`      TEXT         DEFAULT NULL,
  `disponibilites`   TEXT         DEFAULT NULL,
  `message`          TEXT         DEFAULT NULL,
  `statut`           VARCHAR(50)  NOT NULL DEFAULT 'en_attente',
  `booking_token`    VARCHAR(64)  DEFAULT NULL,
  `interview_slot_id` INT UNSIGNED DEFAULT NULL,
  `booked_at`        DATETIME     DEFAULT NULL,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recruitment_booking_token` (`booking_token`),
  KEY `idx_recruitment_statut` (`statut`),
  KEY `idx_recruitment_email` (`email`),
  KEY `idx_recruitment_created` (`created_at`),
  KEY `idx_recruitment_slot` (`interview_slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recruitment_status_history` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `candidate_id` INT UNSIGNED NOT NULL,
  `old_statut`   VARCHAR(50)  DEFAULT NULL,
  `new_statut`   VARCHAR(50)  NOT NULL,
  `note`         VARCHAR(255) DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hist_candidate` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recruitment_slots` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date_slot`   DATE         NOT NULL,
  `heure_slot`  TIME         NOT NULL,
  `max_places`  INT UNSIGNED NOT NULL DEFAULT 10,
  `lieu`        VARCHAR(255) DEFAULT 'ENISO — Salle à confirmer',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slot_datetime` (`date_slot`, `heure_slot`),
  KEY `idx_slot_date` (`date_slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recruitment_email_queue` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `candidate_id` INT UNSIGNED DEFAULT NULL,
  `email_to`     VARCHAR(150) NOT NULL,
  `type`         VARCHAR(50)  NOT NULL,
  `subject`      VARCHAR(255) NOT NULL,
  `body`         TEXT         NOT NULL,
  `scheduled_at` DATETIME     NOT NULL,
  `sent_at`      DATETIME     DEFAULT NULL,
  `statut`       ENUM('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
  `error`        TEXT         DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_queue_pending` (`statut`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recruitment_settings` (
  `id`                 INT UNSIGNED NOT NULL DEFAULT 1,
  `montant_paiement`   VARCHAR(50)  NOT NULL DEFAULT '30 DT',
  `delai_paiement`     VARCHAR(100) NOT NULL DEFAULT '7 jours',
  `tresorier_nom`      VARCHAR(100) NOT NULL DEFAULT 'Trésorier ENISO Team',
  `tresorier_contact`  VARCHAR(200) NOT NULL DEFAULT '',
  `infos_paiement`     TEXT         DEFAULT NULL,
  `lieu_defaut`        VARCHAR(255) NOT NULL DEFAULT 'ENISO — Salle à confirmer',
  `infos_entretien`    TEXT         DEFAULT NULL,
  `updated_at`         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `recruitment_settings` (
  `id`, `montant_paiement`, `delai_paiement`, `tresorier_nom`, `tresorier_contact`,
  `infos_paiement`, `lieu_defaut`, `infos_entretien`
) VALUES (
  1,
  '30 DT',
  '7 jours',
  'Trésorier ENISO Team',
  '',
  'Paiement en espèces ou virement. Conservez votre preuve de paiement.',
  'ENISO — Salle à confirmer',
  'Merci d''arriver 10 minutes avant l''heure prévue. Apportez votre carte d''étudiant.'
)
ON DUPLICATE KEY UPDATE `id` = `id`;
