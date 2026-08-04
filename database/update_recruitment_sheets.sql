USE `eniso_team`;

ALTER TABLE `recruitment_candidates`
  ADD COLUMN `sheets_exported_at` DATETIME DEFAULT NULL AFTER `booked_at`;
