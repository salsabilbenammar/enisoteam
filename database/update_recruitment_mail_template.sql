USE `eniso_team`;

-- Sujet / corps du premier mail (placeholders: [Nom], [Lien])
ALTER TABLE `recruitment_settings`
  ADD COLUMN `mail_confirmation_sujet` VARCHAR(255) NOT NULL DEFAULT 'Confirmation de candidature' AFTER `infos_entretien`,
  ADD COLUMN `mail_confirmation_corps` TEXT NULL AFTER `mail_confirmation_sujet`;

UPDATE `recruitment_settings`
SET `mail_confirmation_sujet` = COALESCE(NULLIF(TRIM(`mail_confirmation_sujet`), ''), 'Confirmation de candidature'),
    `mail_confirmation_corps` = CASE
      WHEN `mail_confirmation_corps` IS NULL OR TRIM(`mail_confirmation_corps`) = '' THEN
        'Bonjour [Nom],

Nous avons bien reçu votre candidature.

Votre dossier est enregistré. Merci de choisir dès maintenant l''un des créneaux d''entretien disponibles via ce lien sécurisé :

[Lien]

Une fois votre créneau confirmé, vous recevrez un email de confirmation avec la date, l''heure et le lieu.

Merci.

— ENISO Team'
      ELSE `mail_confirmation_corps`
    END
WHERE `id` = 1;
