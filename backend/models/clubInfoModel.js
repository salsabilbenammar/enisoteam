const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM club_info ORDER BY id ASC');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM club_info WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ titre, contenu, image }) {
  const [result] = await pool.execute(
    'INSERT INTO club_info (titre, contenu, image) VALUES (?, ?, ?)',
    [titre, contenu, image || null]
  );
  return getById(result.insertId);
}

async function update(id, { titre, contenu, image }) {
  const existing = await getById(id);
  if (!existing) return null;
  const img = image !== undefined ? image : existing.image;
  await pool.execute(
    'UPDATE club_info SET titre = ?, contenu = ?, image = ? WHERE id = ?',
    [titre, contenu, img, id]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM club_info WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
