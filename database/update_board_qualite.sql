USE `eniso_team`;

INSERT INTO `board_members` (`nom`, `poste`, `photo`, `description`, `email`, `telephone`, `facebook`, `ordre_affichage`)
SELECT
  'Bilel Hlaoui',
  'Responsable Qualité',
  NULL,
  'Assure le suivi qualité des projets et des processus du club, définit les standards et veille à l''amélioration continue.',
  NULL,
  NULL,
  NULL,
  10
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `board_members` WHERE `poste` = 'Responsable Qualité' LIMIT 1
);
