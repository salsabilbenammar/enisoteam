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

INSERT INTO `members` (`nom`, `email`, `password_hash`, `filiere`, `actif`)
SELECT 'Membre ENISO Team', 'membre@eniso-team.tn', '$2b$10$TnZ0vt3qwhGziqBfKvmixukyGB7IlMdTrsGCZ6ZTaHKkar8EX.ftG', 'Génie Informatique', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `members` WHERE `email` = 'membre@eniso-team.tn');
