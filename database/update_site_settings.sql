-- Contact + réseaux sociaux (footer) — exécuter dans phpMyAdmin
USE `eniso_team`;

CREATE TABLE IF NOT EXISTS `site_settings` (
  `id`              INT UNSIGNED  NOT NULL DEFAULT 1,
  `contact_label`   VARCHAR(200)  NOT NULL DEFAULT 'Ressources humaines et formations',
  `contact_phone`   VARCHAR(50)   NOT NULL DEFAULT '96295048',
  `instagram_url`   VARCHAR(500)  DEFAULT 'https://www.instagram.com/enisoteam/',
  `facebook_url`    VARCHAR(500)  DEFAULT 'https://www.facebook.com/search/top?q=eniso%20team',
  `linkedin_url`    VARCHAR(500)  DEFAULT 'https://www.linkedin.com/company/enisoteam/',
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `site_settings` (
  `id`, `contact_label`, `contact_phone`, `instagram_url`, `facebook_url`, `linkedin_url`
) VALUES (
  1,
  'Ressources humaines et formations',
  '96295048',
  'https://www.instagram.com/enisoteam/',
  'https://www.facebook.com/search/top?q=eniso%20team',
  'https://www.linkedin.com/company/enisoteam/'
)
ON DUPLICATE KEY UPDATE `id` = `id`;
