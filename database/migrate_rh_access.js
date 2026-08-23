/**
 * Étend le rôle ENUM + crée le compte RHF sans écraser l’admin complet.
 * Pour (re)créer admin + RHF ensemble : node database/seed_bureau_accounts.js
 */
const bcrypt = require('../backend/node_modules/bcrypt');
const pool = require('../backend/config/db');

const RH_EMAIL = 'eniso.teamm@gmail.com';
const RH_PASSWORD = 'rhfenisoteam';
const RH_NOM = 'Responsable RH';

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('admins', 'role'))) {
    await pool.execute(
      `ALTER TABLE admins
       ADD COLUMN role ENUM('admin', 'secretaire', 'rh') NOT NULL DEFAULT 'admin'
       AFTER password_hash`
    );
    console.log('Added admins.role with rh');
  } else {
    await pool.execute(
      `ALTER TABLE admins
       MODIFY COLUMN role ENUM('admin', 'secretaire', 'rh') NOT NULL DEFAULT 'admin'`
    );
    console.log('Updated admins.role ENUM to include rh');
  }

  const password_hash = await bcrypt.hash(RH_PASSWORD, 10);
  const [existing] = await pool.execute('SELECT id, role FROM admins WHERE email = ?', [
    RH_EMAIL,
  ]);

  if (existing.length) {
    // Ne pas rétrograder un admin complet : seulement mettre à jour si déjà rh / nouveau
    if (existing[0].role === 'admin') {
      console.log(
        `Skip ${RH_EMAIL} : compte admin complet existant. Utilisez un autre email pour le RHF,`
      );
      console.log('ou exécutez database/seed_bureau_accounts.js pour séparer les comptes.');
    } else {
      await pool.execute(
        `UPDATE admins SET nom = ?, password_hash = ?, role = 'rh' WHERE email = ?`,
        [RH_NOM, password_hash, RH_EMAIL]
      );
      console.log('Updated RH account:', RH_EMAIL);
    }
  } else {
    await pool.execute(
      `INSERT INTO admins (nom, email, password_hash, role) VALUES (?, ?, ?, 'rh')`,
      [RH_NOM, RH_EMAIL, password_hash]
    );
    console.log('Created RH account:', RH_EMAIL);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
