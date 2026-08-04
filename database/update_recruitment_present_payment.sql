USE `eniso_team`;

-- Prefer VARCHAR over ENUM (stable on XAMPP/MariaDB)
ALTER TABLE `recruitment_candidates`
  MODIFY COLUMN `statut` VARCHAR(50) NOT NULL DEFAULT 'en_attente';

-- Mail templates (safe if already exist: ignore errors)
ALTER TABLE `recruitment_settings`
  ADD COLUMN `mail_confirmation_sujet` VARCHAR(255) NOT NULL DEFAULT 'Confirmation de candidature';
ALTER TABLE `recruitment_settings`
  ADD COLUMN `mail_confirmation_corps` TEXT NULL;
ALTER TABLE `recruitment_settings`
  ADD COLUMN `mail_reussite_sujet` VARCHAR(255) NOT NULL DEFAULT 'Félicitations — entretien réussi';
ALTER TABLE `recruitment_settings`
  ADD COLUMN `mail_reussite_corps` TEXT NULL;

UPDATE `recruitment_settings`
SET `mail_reussite_sujet` = COALESCE(NULLIF(TRIM(`mail_reussite_sujet`), ''), 'Félicitations — entretien réussi'),
    `mail_reussite_corps` = CASE
      WHEN `mail_reussite_corps` IS NULL OR TRIM(`mail_reussite_corps`) = '' THEN
        'Bonjour [Nom],

Félicitations ! Vous avez réussi votre entretien d''intégration à l''ENISO Team.

Pour finaliser votre adhésion, merci de régler les frais auprès du trésorier dans le délai indiqué :

Montant : [Montant]
Délai : [Delai]
Trésorier : [Tresorier]
Contact : [Contact]

[Infos]

Merci.

— ENISO Team'
      ELSE `mail_reussite_corps`
    END
WHERE `id` = 1;
