USE `eniso_team`;

UPDATE `admins`
SET
  `email` = 'eniso.teamm@gmail.com',
  `password_hash` = '$2b$10$Z3Eq5phjPUatoWQPKHjqX.JzXiIc7dNSYOehnQouSsig0WOAIZf0a'
WHERE `id` = 1;

-- Si aucun admin n'existe encore :
INSERT INTO `admins` (`nom`, `email`, `password_hash`)
SELECT 'Administrateur ENISO Team', 'eniso.teamm@gmail.com', '$2b$10$Z3Eq5phjPUatoWQPKHjqX.JzXiIc7dNSYOehnQouSsig0WOAIZf0a'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `admins` LIMIT 1);
