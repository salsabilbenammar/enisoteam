USE `eniso_team`;

ALTER TABLE `recruitment_settings`
  ADD COLUMN `lien_messenger` VARCHAR(500) NOT NULL DEFAULT '' AFTER `infos_entretien`,
  ADD COLUMN `lien_facebook` VARCHAR(500) NOT NULL DEFAULT '' AFTER `lien_messenger`,
  ADD COLUMN `mail_paiement_sujet` VARCHAR(255) NOT NULL DEFAULT 'Paiement confirmé' AFTER `mail_reussite_corps`,
  ADD COLUMN `mail_paiement_corps` TEXT NULL AFTER `mail_paiement_sujet`;

UPDATE `recruitment_settings`
SET `mail_paiement_corps` = CASE
  WHEN `mail_paiement_corps` IS NULL OR TRIM(`mail_paiement_corps`) = '' THEN
    'Bonjour [Nom],

Nous confirmons la réception de votre paiement. Bienvenue dans l''ENISO Team !

Rejoignez dès maintenant nos espaces communautaires :

Messenger : [Messenger]
Facebook : [Facebook]

À très bientôt,

— ENISO Team'
  ELSE `mail_paiement_corps`
END
WHERE `id` = 1;
