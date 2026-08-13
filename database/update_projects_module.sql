-- Module Gestion des Projets (attribution par groupes)
-- Exécuter dans phpMyAdmin ou : mysql -u root eniso_team < database/update_projects_module.sql

CREATE TABLE IF NOT EXISTS `project_catalog` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titre` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_form_settings` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `group_size` INT UNSIGNED NOT NULL DEFAULT 3,
  `choices_count` INT UNSIGNED NOT NULL DEFAULT 3,
  `form_open` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `project_form_settings` (`id`, `group_size`, `choices_count`, `form_open`)
VALUES (1, 3, 3, 0)
ON DUPLICATE KEY UPDATE `id` = `id`;

CREATE TABLE IF NOT EXISTS `project_form_submissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('group', 'solo') NOT NULL,
  `submitter_member_id` INT UNSIGNED NOT NULL,
  `group_label` VARCHAR(120) DEFAULT NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pfs_type_submitted` (`type`, `submitted_at`),
  KEY `idx_pfs_submitter` (`submitter_member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_form_participants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` INT UNSIGNED NOT NULL,
  `member_id` INT UNSIGNED DEFAULT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `telephone` VARCHAR(40) DEFAULT NULL,
  `filiere` VARCHAR(120) DEFAULT NULL,
  `photo` VARCHAR(255) DEFAULT NULL,
  `is_submitter` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_pfp_submission` (`submission_id`),
  KEY `idx_pfp_email` (`email`),
  CONSTRAINT `fk_pfp_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `project_form_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_form_choices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` INT UNSIGNED NOT NULL,
  `project_id` INT UNSIGNED NOT NULL,
  `preference_rank` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pfc_submission_rank` (`submission_id`, `preference_rank`),
  UNIQUE KEY `uq_pfc_submission_project` (`submission_id`, `project_id`),
  KEY `idx_pfc_project` (`project_id`),
  CONSTRAINT `fk_pfc_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `project_form_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pfc_project`
    FOREIGN KEY (`project_id`) REFERENCES `project_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `supervisors` TEXT NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `progress` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `source_submission_id` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pa_project` (`project_id`),
  UNIQUE KEY `uq_pa_source_submission` (`source_submission_id`),
  CONSTRAINT `fk_pa_project`
    FOREIGN KEY (`project_id`) REFERENCES `project_catalog` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_submission`
    FOREIGN KEY (`source_submission_id`) REFERENCES `project_form_submissions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_assignment_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `member_id` INT UNSIGNED DEFAULT NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `telephone` VARCHAR(40) DEFAULT NULL,
  `filiere` VARCHAR(120) DEFAULT NULL,
  `photo` VARCHAR(255) DEFAULT NULL,
  `from_submission_id` INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pam_assignment` (`assignment_id`),
  CONSTRAINT `fk_pam_assignment`
    FOREIGN KEY (`assignment_id`) REFERENCES `project_assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
