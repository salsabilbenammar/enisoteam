const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email]);
  return rows[0] || null;
}

/** Plusieurs comptes bureau peuvent partager le même email (différence = mot de passe). */
async function findAllByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email]);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nom, email, role, created_at FROM admins WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findAllByEmail, findById };
