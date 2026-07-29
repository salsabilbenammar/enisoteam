USE `eniso_team`;

DELETE FROM `board_members`;

INSERT INTO `board_members` (`nom`, `poste`, `photo`, `description`, `email`, `ordre_affichage`) VALUES
('Med Achref Chaouch', 'Président', NULL, 'Représente le club, définit la vision stratégique, coordonne le bureau et assure le lien avec l''administration et les partenaires.', NULL, 1),
('Salsabil Ben Ammar', 'Responsable Ressources Humaines et Formations', NULL, 'Gère le recrutement et l''intégration des membres, organise les ateliers techniques, planifie les formations et assure le transfert de compétences au sein du club.', NULL, 2),
('Maryam Loghmari', 'Secrétaire Générale', NULL, 'Rédige les comptes rendus, gère la correspondance officielle et assure le suivi administratif du club.', NULL, 3),
('Mariem Moussi', 'Trésorière', NULL, 'Supervise le budget, les dépenses, les recettes et la transparence financière du club.', NULL, 4),
('Amina Kouki', 'Responsable Prospection', NULL, 'Développe les partenariats, recherche des sponsors et entretient les relations avec les entreprises.', NULL, 5),
('Med Ahmed Souid', 'Responsable Logistique', NULL, 'Gère le matériel, les locaux, les réservations et l''organisation pratique des activités du club.', NULL, 6),
('Dhouha Kmala', 'Responsable Projet', NULL, 'Pilote les projets robotiques, répartit les tâches techniques et assure l''avancement des réalisations.', NULL, 7),
('À pourvoir', 'Responsable Événement', NULL, 'Planifie et coordonne les compétitions, hackathons, journées portes ouvertes et événements du club.', NULL, 8),
('Ghada Abdelwahed', 'Responsable Média', NULL, 'Gère la communication digitale, les réseaux sociaux, le contenu visuel et la visibilité du club.', NULL, 9);
