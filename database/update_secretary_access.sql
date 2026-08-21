-- Accès complet pour la Secrétaire Générale
-- Exécuter une seule fois, ou utiliser migrate_secretary_access.js

ALTER TABLE `admins`
  ADD COLUMN `role` ENUM('admin', 'secretaire') NOT NULL DEFAULT 'admin'
  AFTER `password_hash`;

-- Exemple après création du compte :
-- UPDATE admins SET role = 'secretaire' WHERE email = 'email.de.la.secretaire@eniso.rnu.tn';
