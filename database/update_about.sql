USE `eniso_team`;

SET NAMES utf8mb4;

UPDATE `club_info`
SET
  `titre` = 'Notre Histoire',
  `contenu` = 'Fondée en 2014, l''ENISo Team est née de la passion d''un groupe d''étudiants pour la robotique et l''envie d''apprendre en équipe. Depuis, le club n''a cessé de grandir, rassemblant aujourd''hui plus de 160 adhérents autour d''un même objectif : explorer ensemble les domaines de l''électronique, de la programmation et de la mécanique. Sous l''encadrement de M. Ghiss Moncef, et grâce à l''engagement de générations successives de bureaux, l''ENISo Team s''est structurée avec des pôles complémentaires (présidence, trésorerie, projets, prospection, événementiel, média, RH et qualité) pour devenir un club robotique reconnu, capable de porter des projets ambitieux comme l''ESC.'
WHERE `id` = 1;

UPDATE `club_info`
SET
  `titre` = 'Notre Mission',
  `contenu` = 'Notre mission est d''apprendre en équipe tout ce qui touche à l''électronique, la programmation et la mécanique, afin de concevoir et fabriquer des robots. Nous voulons aussi transmettre ce savoir-faire aux jeunes générations, en les accompagnant dans leur découverte de la robotique. Pour y parvenir, chaque membre du bureau joue un rôle clé : coordonner les projets, gérer les ressources, former les nouveaux membres, développer nos partenariats et faire rayonner le club, dans le but constant de progresser collectivement et de repousser nos limites.'
WHERE `id` = 2;

UPDATE `club_info`
SET
  `titre` = 'Nos Valeurs',
  `contenu` = 'Travail d''équipe — comme le rappelle notre devise « Achieving Success Through Teamwork », nous croyons que la réussite se construit ensemble.\nApprentissage continu — chaque membre est encouragé à développer ses compétences, avec le soutien de formations internes et externes.\nInclusion — chaque adhérent doit trouver sa place au sein du club, quel que soit son niveau ou son parcours.\nRigueur et qualité — nous veillons à maintenir des standards élevés dans tout ce que nous entreprenons, projets comme événements.\nTransmission — nous tenons à accompagner les jeunes générations et à partager notre passion pour la robotique.\nEngagement — chaque membre du bureau met son énergie au service du club, dans un esprit de responsabilité et de dévouement.'
WHERE `id` = 3;

DELETE FROM `club_info` WHERE `titre` LIKE '%Réseaux%' OR `titre` LIKE '%Reseaux%' OR id = 4;
