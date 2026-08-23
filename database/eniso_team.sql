-- ============================================================
-- ENISO Team — Script de création de la base de données
-- Club Robotique Universitaire
-- Compatible MySQL 5.7+ / MariaDB 10.4+ (XAMPP / phpMyAdmin)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- Création de la base de données
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `eniso_team`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `eniso_team`;

-- ------------------------------------------------------------
-- Suppression des tables existantes (ordre inverse des FK)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `applications`;
DROP TABLE IF EXISTS `recruitment_offers`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `trainings`;
DROP TABLE IF EXISTS `board_members`;
DROP TABLE IF EXISTS `gallery`;
DROP TABLE IF EXISTS `club_info`;
DROP TABLE IF EXISTS `site_settings`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `admins`;

-- ------------------------------------------------------------
-- Table : admins
-- Comptes administrateurs du bureau (authentification JWT)
-- ------------------------------------------------------------
CREATE TABLE `admins` (
  `id`            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `nom`           VARCHAR(100)      NOT NULL,
  `email`         VARCHAR(150)      NOT NULL,
  `password_hash` VARCHAR(255)      NOT NULL,
  `role`          ENUM('admin', 'secretaire', 'rh', 'projets', 'tresorier', 'logistique', 'evenementiel', 'media', 'prospection') NOT NULL DEFAULT 'admin',
  `created_at`    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  /* email non unique : même adresse, mots de passe différents par poste */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : members
-- Membres inscrits du club (accès Formations + Coin RH)
-- ------------------------------------------------------------
CREATE TABLE `members` (
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

-- ------------------------------------------------------------
-- Table : site_settings
-- Contact + liens réseaux sociaux (footer)
-- ------------------------------------------------------------
CREATE TABLE `site_settings` (
  `id`            INT UNSIGNED  NOT NULL DEFAULT 1,
  `contact_label` VARCHAR(200)  NOT NULL DEFAULT 'Ressources humaines et formations',
  `contact_phone` VARCHAR(50)   NOT NULL DEFAULT '96295048',
  `instagram_url` VARCHAR(500)  DEFAULT NULL,
  `facebook_url`  VARCHAR(500)  DEFAULT NULL,
  `linkedin_url`  VARCHAR(500)  DEFAULT NULL,
  `board_title`   VARCHAR(200)  NOT NULL DEFAULT 'Bureau Exécutif 2026/2027',
  `merit_rules`   TEXT          DEFAULT NULL,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : club_info
-- Sections modifiables de la page « À propos » du club
-- ------------------------------------------------------------
CREATE TABLE `club_info` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `titre`      VARCHAR(200)  NOT NULL,
  `contenu`    TEXT          NOT NULL,
  `image`      VARCHAR(255)  DEFAULT NULL,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : board_members
-- Membres du bureau exécutif du club
-- ------------------------------------------------------------
CREATE TABLE `board_members` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`             VARCHAR(100)  NOT NULL,
  `poste`           VARCHAR(100)  NOT NULL,
  `photo`           VARCHAR(255)  DEFAULT NULL,
  `description`     TEXT          DEFAULT NULL,
  `email`           VARCHAR(150)  DEFAULT NULL,
  `telephone`       VARCHAR(50)   DEFAULT NULL,
  `facebook`        VARCHAR(500)  DEFAULT NULL,
  `ordre_affichage` INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_board_ordre` (`ordre_affichage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : gallery
-- Photos du club (compétitions, ateliers, vie associative)
-- ------------------------------------------------------------
CREATE TABLE `gallery` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `titre`           VARCHAR(200)  NOT NULL,
  `description`     TEXT          DEFAULT NULL,
  `image`           VARCHAR(255)  NOT NULL,
  `media_type`      ENUM('image', 'video') NOT NULL DEFAULT 'image',
  `ordre_affichage` INT           NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gallery_ordre` (`ordre_affichage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : trainings
-- Formations proposées par le club
-- ------------------------------------------------------------
CREATE TABLE `trainings` (
  `id`                   INT UNSIGNED                              NOT NULL AUTO_INCREMENT,
  `titre`                VARCHAR(200)                              NOT NULL,
  `description`          TEXT                                      NOT NULL,
  `date`                 DATE                                      NOT NULL,
  `formateur`            VARCHAR(100)                              DEFAULT NULL,
  `niveau`               ENUM('debutant', 'intermediaire', 'avance') NOT NULL DEFAULT 'debutant',
  `lien`                 VARCHAR(500)                              DEFAULT NULL,
  `image`                VARCHAR(255)                              DEFAULT NULL,
  `inscription_ouverte`  TINYINT(1)                                NOT NULL DEFAULT 0,
  `payante`              TINYINT(1)                                NOT NULL DEFAULT 0,
  `prix`                 VARCHAR(50)                               DEFAULT NULL,
  `fifo_paiement`        TINYINT(1)                                NOT NULL DEFAULT 0,
  `created_at`           TIMESTAMP                                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_trainings_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : events
-- Événements et compétitions du club
-- ------------------------------------------------------------
CREATE TABLE `events` (
  `id`          INT UNSIGNED                    NOT NULL AUTO_INCREMENT,
  `audience`    ENUM('public', 'membres')       NOT NULL DEFAULT 'public',
  `titre`       VARCHAR(200)                    NOT NULL,
  `description` TEXT                            NOT NULL,
  `date`        DATETIME                        NOT NULL,
  `lieu`        VARCHAR(200)                    DEFAULT NULL,
  `image`       VARCHAR(255)                    DEFAULT NULL,
  `statut`      ENUM('a_venir', 'passe')        NOT NULL DEFAULT 'a_venir',
  `created_at`  TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_date` (`date`),
  KEY `idx_events_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : prospection_realizations
-- Réalisations / partenariats prospection
-- ------------------------------------------------------------
CREATE TABLE `prospection_realizations` (
  `id`               INT UNSIGNED              NOT NULL AUTO_INCREMENT,
  `audience`         ENUM('public', 'membres') NOT NULL DEFAULT 'public',
  `titre`            VARCHAR(200)              NOT NULL,
  `description`      TEXT                      NULL,
  `annee`            SMALLINT UNSIGNED         NULL,
  `image`            VARCHAR(255)              NULL,
  `ordre_affichage`  INT                       NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP                 NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prospection_ordre` (`ordre_affichage`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : announcements
-- Annonces générales du club
-- ------------------------------------------------------------
CREATE TABLE `announcements` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `titre`             VARCHAR(200)  NOT NULL,
  `contenu`           TEXT          NOT NULL,
  `image`             VARCHAR(255)  DEFAULT NULL,
  `lien_formulaire`   VARCHAR(500)  DEFAULT NULL,
  `date_publication`  DATE          NOT NULL,
  `salle`             VARCHAR(200)  DEFAULT NULL,
  `heure`             VARCHAR(20)   DEFAULT NULL,
  `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_date` (`date_publication` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : recruitment_offers
-- Offres de recrutement publiées par le club
-- ------------------------------------------------------------
CREATE TABLE `recruitment_offers` (
  `id`          INT UNSIGNED              NOT NULL AUTO_INCREMENT,
  `titre`       VARCHAR(200)              NOT NULL,
  `description` TEXT                      NOT NULL,
  `date_limite` DATE                      DEFAULT NULL,
  `statut`      ENUM('ouverte', 'fermee') NOT NULL DEFAULT 'ouverte',
  PRIMARY KEY (`id`),
  KEY `idx_offers_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : applications
-- Candidatures reçues via le formulaire public
-- ------------------------------------------------------------
CREATE TABLE `applications` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `offer_id`        INT UNSIGNED  DEFAULT NULL,
  `nom`             VARCHAR(100)  NOT NULL,
  `email`           VARCHAR(150)  NOT NULL,
  `filiere`         VARCHAR(100)  DEFAULT NULL,
  `motivation`      TEXT          NOT NULL,
  `cv_path`         VARCHAR(255)  NOT NULL,
  `date_soumission` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_applications_offer` (`offer_id`),
  KEY `idx_applications_date` (`date_soumission` DESC),
  CONSTRAINT `fk_applications_offer`
    FOREIGN KEY (`offer_id`)
    REFERENCES `recruitment_offers` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table : merit_entries
-- Points de mérite attribués aux membres (Coin RH)
-- ------------------------------------------------------------
CREATE TABLE `merit_entries` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `member_id`  INT UNSIGNED  NOT NULL,
  `points`     INT           NOT NULL DEFAULT 1,
  `motif`      VARCHAR(500)  NOT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_merit_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Formulaires anonymes Coin RH
-- ------------------------------------------------------------
CREATE TABLE `rh_reports` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `sujet`      VARCHAR(200)  NOT NULL,
  `message`    TEXT          NOT NULL,
  `statut`     ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rh_suggestions` (
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

CREATE TABLE `rh_training_requests` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `theme`      VARCHAR(200)  NOT NULL,
  `message`    TEXT          NOT NULL,
  `niveau`     VARCHAR(50)   DEFAULT NULL,
  `statut`     ENUM('nouveau','en_cours','traite') NOT NULL DEFAULT 'nouveau',
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DONNÉES DE TEST (SEED)
-- ============================================================

-- ------------------------------------------------------------
-- Admin par défaut
-- Email    : eniso.teamm@gmail.com
-- Mot de passe : Bexenisoteam
-- (hash bcrypt, cost factor 10)
-- ------------------------------------------------------------
INSERT INTO `admins` (`nom`, `email`, `password_hash`) VALUES
(
  'Administrateur ENISO Team',
  'eniso.teamm@gmail.com',
  '$2b$10$Z3Eq5phjPUatoWQPKHjqX.JzXiIc7dNSYOehnQouSsig0WOAIZf0a'
);

-- ------------------------------------------------------------
-- Membre de test
-- Email    : membre@eniso-team.tn
-- Mot de passe : membre123
-- ------------------------------------------------------------
INSERT INTO `members` (`nom`, `email`, `password_hash`, `filiere`, `actif`) VALUES
(
  'Membre ENISO Team',
  'membre@eniso-team.tn',
  '$2b$10$TnZ0vt3qwhGziqBfKvmixukyGB7IlMdTrsGCZ6ZTaHKkar8EX.ftG',
  'Génie Informatique',
  1
);

-- ------------------------------------------------------------
-- Contact + réseaux sociaux (footer)
-- ------------------------------------------------------------
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
);

-- ------------------------------------------------------------
-- Informations du club (page À propos)
-- ------------------------------------------------------------
INSERT INTO `club_info` (`titre`, `contenu`, `image`) VALUES
(
  'Notre Histoire',
  'Fondée en 2014, l''ENISo Team est née de la passion d''un groupe d''étudiants pour la robotique et l''envie d''apprendre en équipe. Depuis, le club n''a cessé de grandir, rassemblant aujourd''hui plus de 160 adhérents autour d''un même objectif : explorer ensemble les domaines de l''électronique, de la programmation et de la mécanique. Sous l''encadrement de M. Ghiss Moncef, et grâce à l''engagement de générations successives de bureaux, l''ENISo Team s''est structurée avec des pôles complémentaires (présidence, trésorerie, projets, prospection, événementiel, média, RH et qualité) pour devenir un club robotique reconnu, capable de porter des projets ambitieux comme l''ESC.',
  NULL
),
(
  'Notre Mission',
  'Notre mission est d''apprendre en équipe tout ce qui touche à l''électronique, la programmation et la mécanique, afin de concevoir et fabriquer des robots. Nous voulons aussi transmettre ce savoir-faire aux jeunes générations, en les accompagnant dans leur découverte de la robotique. Pour y parvenir, chaque membre du bureau joue un rôle clé : coordonner les projets, gérer les ressources, former les nouveaux membres, développer nos partenariats et faire rayonner le club, dans le but constant de progresser collectivement et de repousser nos limites.',
  NULL
),
(
  'Nos Axes',
  '[{"titre":"Formation","description":"Nous accompagnons chaque nouveau membre dès son intégration et l''aidons à développer ses compétences tout au long de son parcours au sein du club. À travers des formations de court et long terme dans différents thèmes techniques, nous cherchons continuellement des formateurs internes ou externes capables de transmettre leur savoir-faire à nos adhérents."},{"titre":"Projet","description":"Nos équipes travaillent sur des projets concrets, de l''étude de faisabilité jusqu''à la réalisation. Chaque projet est encadré et coordonné pour garantir son bon avancement dans les délais fixés, avec les ressources humaines et matérielles nécessaires à sa réussite."},{"titre":"Prospection","description":"Nous développons et entretenons des relations solides avec nos partenaires externes et les entreprises. Cet axe vise à faire rayonner le club au-delà de ses murs, à décrocher des opportunités de collaboration et à donner à nos projets les moyens de se concrétiser."},{"titre":"Événementiel","description":"Nous organisons et supervisons l''ensemble des événements du club, en particulier notre événement phare, l''ESC. De la coordination des sous-comités à la gestion administrative, cet axe rassemble nos membres autour de moments forts qui font vivre l''ENISo Team."}]',
  NULL
);

-- ------------------------------------------------------------
-- Membres du bureau
-- ------------------------------------------------------------
INSERT INTO `board_members` (`nom`, `poste`, `photo`, `description`, `email`, `telephone`, `facebook`, `ordre_affichage`) VALUES
(
  'Med Achref Chaouch',
  'Président',
  NULL,
  'Représente le club, définit la vision stratégique, coordonne le bureau et assure le lien avec l''administration et les partenaires.',
  NULL,
  NULL,
  NULL,
  1
),
(
  'Salsabil Ben Ammar',
  'Responsable Ressources Humaines et Formations',
  NULL,
  'Gère le recrutement et l''intégration des membres, organise les ateliers techniques, planifie les formations et assure le transfert de compétences au sein du club.',
  NULL,
  NULL,
  NULL,
  2
),
(
  'Maryam Loghmari',
  'Secrétaire Générale',
  NULL,
  'Rédige les comptes rendus, gère la correspondance officielle et assure le suivi administratif du club.',
  NULL,
  NULL,
  NULL,
  3
),
(
  'Mariem Moussi',
  'Trésorière',
  NULL,
  'Supervise le budget, les dépenses, les recettes et la transparence financière du club.',
  NULL,
  NULL,
  NULL,
  4
),
(
  'Amina Kouki',
  'Responsable Prospection',
  NULL,
  'Développe les partenariats, recherche des sponsors et entretient les relations avec les entreprises.',
  NULL,
  NULL,
  NULL,
  5
),
(
  'Med Ahmed Souid',
  'Responsable Logistique',
  NULL,
  'Gère le matériel, les locaux, les réservations et l''organisation pratique des activités du club.',
  NULL,
  NULL,
  NULL,
  6
),
(
  'Dhouha Kmala',
  'Responsable Projet',
  NULL,
  'Pilote les projets robotiques, répartit les tâches techniques et assure l''avancement des réalisations.',
  NULL,
  NULL,
  NULL,
  7
),
(
  'À pourvoir',
  'Responsable Événement',
  NULL,
  'Planifie et coordonne les compétitions, hackathons, journées portes ouvertes et événements du club.',
  NULL,
  NULL,
  NULL,
  8
),
(
  'Ghada Abdelwahed',
  'Responsable Média',
  NULL,
  'Gère la communication digitale, les réseaux sociaux, le contenu visuel et la visibilité du club.',
  NULL,
  NULL,
  NULL,
  9
),
(
  'Bilel Hlaoui',
  'Responsable Qualité',
  NULL,
  'Assure le suivi qualité des projets et des processus du club, définit les standards et veille à l''amélioration continue.',
  NULL,
  NULL,
  NULL,
  10
);

-- ------------------------------------------------------------
-- Formations
-- ------------------------------------------------------------
INSERT INTO `trainings` (`titre`, `description`, `date`, `formateur`, `niveau`, `lien`) VALUES
(
  'Initiation à Arduino',
  'Découverte des microcontrôleurs Arduino : GPIO, capteurs, actionneurs et premier programme embarqué. Atelier pratique avec montage sur breadboard.',
  '2026-02-15',
  'Ines Gharbi',
  'debutant',
  'https://docs.arduino.cc/'
),
(
  'ROS 2 — Robot Operating System',
  'Introduction au framework ROS 2 : nœuds, topics, services et simulation avec Gazebo. Prérequis : bases en Python et Linux.',
  '2026-03-01',
  'Ahmed Ben Salah',
  'intermediaire',
  'https://docs.ros.org/en/humble/'
),
(
  'Conception Mécanique avec SolidWorks',
  'Modélisation 3D de pièces robotiques, assemblages et plans techniques pour l''impression 3D et l''usinage CNC.',
  '2026-03-20',
  'Mohamed Trabelsi',
  'intermediaire',
  NULL
),
(
  'Vision par Ordinateur avec OpenCV',
  'Traitement d''images, détection d''objets et suivi de cible pour robots autonomes. Projet final : robot suiveur de ligne avec caméra.',
  '2026-04-10',
  'Sarra Khelifi',
  'avance',
  'https://opencv.org/'
);

-- ------------------------------------------------------------
-- Événements
-- ------------------------------------------------------------
INSERT INTO `events` (`titre`, `description`, `date`, `lieu`, `image`, `statut`) VALUES
(
  'Hackathon Robotique ENISO 2026',
  '48 heures de création intensive : concevez et programmez un robot capable de résoudre un défi imposé. Ouvert à tous les étudiants de l''ENISO. Prix à gagner !',
  '2026-04-25 09:00:00',
  'Campus ENISO, Sousse',
  NULL,
  'a_venir'
),
(
  'Compétition Nationale RoboTunisia',
  'ENISO Team représente l''école à la compétition nationale de robotique. Catégories : sumo robot, suiveur de ligne et labyrinthe.',
  '2026-05-15 08:00:00',
  'Palais des Congrès, Tunis',
  NULL,
  'a_venir'
),
(
  'Journée Portes Ouvertes ENISO',
  'Démonstration de nos robots et présentation du club aux futurs étudiants. Stand interactif avec mini-ateliers.',
  '2026-03-08 10:00:00',
  'Hall principal, ENISO',
  NULL,
  'a_venir'
),
(
  'RoboCup Junior 2025',
  'Participation réussie à la compétition RoboCup Junior avec une 2ème place en catégorie Rescue Line.',
  '2025-06-20 09:00:00',
  'Centre International des Technologies, Tunis',
  NULL,
  'passe'
);

-- ------------------------------------------------------------
-- Annonces
-- ------------------------------------------------------------
INSERT INTO `announcements` (`titre`, `contenu`, `image`, `date_publication`) VALUES
(
  'Réunion de lancement — Saison 2025/2026',
  'La première réunion générale du club aura lieu le samedi 15 février à 14h00 dans la salle B12. Tous les membres actuels et les nouveaux intéressés sont les bienvenus. Ordre du jour : planning des formations, préparation RoboTunisia et répartition des rôles.',
  NULL,
  '2026-02-01'
),
(
  'Nouveau matériel disponible au labo',
  'Grâce à notre partenariat avec STMicroelectronics, le club dispose désormais de 10 kits STM32 Nucleo et de capteurs LiDAR pour les projets avancés. Contactez le responsable technique pour emprunter du matériel.',
  NULL,
  '2026-01-20'
),
(
  'Inscriptions ouvertes — Hackathon 2026',
  'Les inscriptions pour le Hackathon Robotique ENISO 2026 sont ouvertes ! Formez votre équipe de 3 à 5 personnes et inscrivez-vous avant le 15 avril. Places limitées à 20 équipes.',
  NULL,
  '2026-01-10'
);

-- ------------------------------------------------------------
-- Offres de recrutement
-- ------------------------------------------------------------
INSERT INTO `recruitment_offers` (`titre`, `description`, `date_limite`, `statut`) VALUES
(
  'Membre Technique — Équipe Robot Mobile',
  'Nous recherchons des étudiants motivés pour rejoindre l''équipe robot mobile. Compétences recherchées : programmation C/C++, ROS, électronique. Disponibilité : 6h/seminimum au labo.',
  '2026-03-31',
  'ouverte'
),
(
  'Designer Graphique / Community Manager',
  'Création de visuels pour nos réseaux sociaux, affiches d''événements et documentation du club. Maîtrise de Figma ou Canva appréciée.',
  '2026-02-28',
  'ouverte'
),
(
  'Responsable Sponsoring',
  'Poste pourvu pour la saison 2025/2026. Merci à tous les candidats !',
  '2025-11-30',
  'fermee'
);

-- ------------------------------------------------------------
-- Candidatures de test
-- ------------------------------------------------------------
INSERT INTO `applications` (`offer_id`, `nom`, `email`, `filiere`, `motivation`, `cv_path`) VALUES
(
  1,
  'Karim Bouazizi',
  'karim.bouazizi@etudiant.eniso.tn',
  'Génie Mécatronique',
  'Passionné de robotique depuis le lycée, j''ai réalisé plusieurs projets Arduino et je souhaite contribuer à l''équipe robot mobile du club. Je suis disponible les mercredis et samedis.',
  'uploads/cv/karim_bouazizi_cv.pdf'
),
(
  2,
  'Nour Haddad',
  'nour.haddad@etudiant.eniso.tn',
  'Génie Informatique',
  'Étudiante en design UI/UX avec une expérience en gestion de pages Instagram pour des associations étudiantes. Je serais ravie de valoriser l''image du club sur les réseaux sociaux.',
  'uploads/cv/nour_haddad_cv.pdf'
),
(
  NULL,
  'Rami Ferchichi',
  'rami.ferchichi@etudiant.eniso.tn',
  'Génie Électrique',
  'Je souhaite rejoindre ENISO Team sans poste spécifique. Je suis motivé pour apprendre et contribuer à tous les projets du club.',
  'uploads/cv/rami_ferchichi_cv.pdf'
);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
