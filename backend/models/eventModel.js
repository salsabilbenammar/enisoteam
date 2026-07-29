const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM events ORDER BY date DESC');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const { titre, description, date, lieu, image, statut } = data;
  const [result] = await pool.execute(
    `INSERT INTO events (titre, description, date, lieu, image, statut)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [titre, description, date, lieu || null, image || null, statut || 'a_venir']
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const image = data.image !== undefined ? data.image : existing.image;
  await pool.execute(
    `UPDATE events
     SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?
     WHERE id = ?`,
    [
      data.titre,
      data.description,
      data.date,
      data.lieu || null,
      image,
      data.statut || 'a_venir',
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
