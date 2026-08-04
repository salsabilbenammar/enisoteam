USE `eniso_team`;

ALTER TABLE `recruitment_settings`
  ADD COLUMN `candidature_ouverte` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `infos_entretien`;
