-- Module Finance / types de cotisation

CREATE TABLE IF NOT EXISTS `finance_cotisation_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `montant_defaut` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `actif` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_finance_cotisation_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `finance_cotisation_types` (`code`, `label`, `montant_defaut`, `actif`, `sort_order`) VALUES
  ('recrutement', 'Cotisation recrutement', 30, 1, 1),
  ('formation', 'Cotisation formation payante', 0, 1, 2),
  ('deplacement', 'Cotisation car / déplacement', 0, 1, 3),
  ('pull', 'Cotisation pull de club', 0, 1, 4),
  ('robot', 'Cotisation robot', 0, 1, 5),
  ('evenement', 'Cotisation événement', 0, 1, 6)
ON DUPLICATE KEY UPDATE label = VALUES(label);

ALTER TABLE `member_payments`
  ADD COLUMN `cotisation_type` VARCHAR(40) NOT NULL DEFAULT 'recrutement' AFTER `annee_cotisation`,
  ADD INDEX `idx_member_payments_type` (`cotisation_type`);
