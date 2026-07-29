const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM board_members ORDER BY ordre_affichage ASC, id ASC'
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM board_members WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const { nom, poste, photo, description, email, telephone, facebook, ordre_affichage } = data;
  const [result] = await pool.execute(
    `INSERT INTO board_members
      (nom, poste, photo, description, email, telephone, facebook, ordre_affichage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nom,
      poste,
      photo || null,
      description || null,
      email || null,
      telephone || null,
      facebook || null,
      ordre_affichage ?? 0,
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const photo = data.photo !== undefined ? data.photo : existing.photo;
  await pool.execute(
    `UPDATE board_members
     SET nom = ?, poste = ?, photo = ?, description = ?, email = ?,
         telephone = ?, facebook = ?, ordre_affichage = ?
     WHERE id = ?`,
    [
      data.nom,
      data.poste,
      photo,
      data.description ?? null,
      data.email ?? null,
      data.telephone ?? null,
      data.facebook ?? null,
      data.ordre_affichage ?? 0,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM board_members WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
