/**
 * Réinitialise le mot de passe admin par défaut.
 * Usage: node database/reset_admin_password.js [nouveau_mot_de_passe]
 */
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

const ADMIN_EMAIL = 'eniso.teamm@gmail.com';
const DEFAULT_PASSWORD = 'Bexenisoteam';

(async () => {
  const password = process.argv[2] || DEFAULT_PASSWORD;
  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `UPDATE admins SET password_hash = ? WHERE email = ?`,
    [hash, ADMIN_EMAIL]
  );
  if (!result.affectedRows) {
    await pool.query(
      `INSERT INTO admins (nom, email, password_hash) VALUES (?, ?, ?)`,
      ['Administrateur ENISO Team', ADMIN_EMAIL, hash]
    );
    console.log(`Admin créé : ${ADMIN_EMAIL}`);
  } else {
    console.log(`Mot de passe admin mis à jour : ${ADMIN_EMAIL}`);
  }
  console.log(`Mot de passe : ${password}`);
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
