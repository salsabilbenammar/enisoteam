-- Photos pour le catalogue de projets
-- mysql -u root eniso_team < database/update_projects_images.sql

ALTER TABLE `project_catalog`
  ADD COLUMN `image` VARCHAR(255) DEFAULT NULL AFTER `description`;
