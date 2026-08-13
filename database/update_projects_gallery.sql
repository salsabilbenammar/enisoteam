-- Galerie d'images supplémentaires pour les projets (JSON array de chemins)
-- node database/migrate_project_gallery.js

ALTER TABLE `project_catalog`
  ADD COLUMN `gallery` TEXT NULL DEFAULT NULL AFTER `image`;
