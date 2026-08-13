-- Étapes de projet + validation par groupe
-- node database/migrate_project_steps.js

CREATE TABLE IF NOT EXISTS `project_steps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `titre` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `ordre` INT UNSIGNED NOT NULL DEFAULT 0,
  `requires_document` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_project_ordre` (`project_id`, `ordre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_assignment_step_status` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `assignment_id` INT UNSIGNED NOT NULL,
  `step_id` INT UNSIGNED NOT NULL,
  `status` ENUM('submitted', 'validated') NOT NULL,
  `submitted_by_member_id` INT UNSIGNED DEFAULT NULL,
  `document_path` VARCHAR(255) DEFAULT NULL,
  `document_name` VARCHAR(255) DEFAULT NULL,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `validated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pass_assignment_step` (`assignment_id`, `step_id`),
  KEY `idx_pass_step` (`step_id`),
  KEY `idx_pass_assignment` (`assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
