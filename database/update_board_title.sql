-- Contact + réseaux + titre bureau — exécuter dans phpMyAdmin
USE `eniso_team`;

CREATE TABLE IF NOT EXISTS `site_settings` (
  `id`              INT UNSIGNED  NOT NULL DEFAULT 1,
  `contact_label`   VARCHAR(200)  NOT NULL DEFAULT 'Ressources humaines et formations',
  `contact_phone`   VARCHAR(50)   NOT NULL DEFAULT '96295048',
  `instagram_url`   VARCHAR(500)  DEFAULT 'https://www.instagram.com/enisoteam/',
  `facebook_url`    VARCHAR(500)  DEFAULT 'https://www.facebook.com/search/top?q=eniso%20team',
  `linkedin_url`    VARCHAR(500)  DEFAULT 'https://www.linkedin.com/company/enisoteam/',
  `board_title`     VARCHAR(200)  NOT NULL DEFAULT 'Bureau Exécutif 2026/2027',
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ajoute board_title si la table existait déjà sans cette colonne
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'eniso_team'
    AND TABLE_NAME = 'site_settings'
    AND COLUMN_NAME = 'board_title'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `site_settings` ADD COLUMN `board_title` VARCHAR(200) NOT NULL DEFAULT ''Bureau Exécutif 2026/2027'' AFTER `linkedin_url`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO `site_settings` (
  `id`, `contact_label`, `contact_phone`, `instagram_url`, `facebook_url`, `linkedin_url`, `board_title`
) VALUES (
  1,
  'Ressources humaines et formations',
  '96295048',
  'https://www.instagram.com/enisoteam/',
  'https://www.facebook.com/search/top?q=eniso%20team',
  'https://www.linkedin.com/company/enisoteam/',
  'Bureau Exécutif 2026/2027'
)
ON DUPLICATE KEY UPDATE
  `board_title` = IF(`board_title` IS NULL OR `board_title` = '', 'Bureau Exécutif 2026/2027', `board_title`);
