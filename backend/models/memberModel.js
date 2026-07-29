const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM members WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, nom, email, filiere, actif, created_at FROM members WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function getAll() {
  const [rows] = await pool.execute(
    'SELECT id, nom, email, filiere, actif, created_at FROM members ORDER BY created_at DESC'
  );
  return rows;
}

async function create({ nom, email, password_hash, filiere, actif }) {
  const [result] = await pool.execute(
    `INSERT INTO members (nom, email, password_hash, filiere, actif)
     VALUES (?, ?, ?, ?, ?)`,
    [nom, email, password_hash, filiere || null, actif === false || actif === 0 || actif === '0' ? 0 : 1]
  );
  return findById(result.insertId);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  const nom = data.nom ?? existing.nom;
  const email = data.email ?? existing.email;
  const filiere = data.filiere !== undefined ? data.filiere : existing.filiere;
  const actif =
    data.actif === undefined
      ? existing.actif
      : data.actif === false || data.actif === 0 || data.actif === '0'
        ? 0
        : 1;

  if (data.password_hash) {
    await pool.execute(
      `UPDATE members SET nom = ?, email = ?, filiere = ?, actif = ?, password_hash = ? WHERE id = ?`,
      [nom, email, filiere || null, actif, data.password_hash, id]
    );
  } else {
    await pool.execute(
      `UPDATE members SET nom = ?, email = ?, filiere = ?, actif = ? WHERE id = ?`,
      [nom, email, filiere || null, actif, id]
    );
  }
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM members WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findByEmail, findById, getAll, create, update, remove };
