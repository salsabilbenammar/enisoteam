-- Règles d'explication du système de mérites (pas de calcul de points)
USE `eniso_team`;

ALTER TABLE `site_settings`
  ADD COLUMN `merit_rules` TEXT NULL
  AFTER `board_title`;

UPDATE `site_settings`
SET `merit_rules` = 'Comment sont calculés les mérites ?

Les mérites valorisent l''engagement des membres au sein de l''ENISo Team. Ils sont attribués selon les critères suivants :

• Participation active aux réunions et ateliers du club
• Contribution aux projets (robotique, électronique, programmation, mécanique)
• Implication dans l''organisation des événements (notamment l''ESC)
• Aide à la formation et à l''accompagnement des nouveaux membres
• Prospection et partenariats au service du club
• Respect des engagements pris envers l''équipe

Les mérites sont décidés par le bureau (RH) en fonction de la qualité et de la régularité de l''implication — il ne s''agit pas d''un score automatique.'
WHERE `id` = 1 AND (`merit_rules` IS NULL OR `merit_rules` = '');
