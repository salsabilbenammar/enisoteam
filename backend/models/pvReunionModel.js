const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM pv_reunions ORDER BY date_reunion DESC, id DESC'
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM pv_reunions WHERE id = ?', [id]);
  return rows[0] || null;
}

function cleanOptional(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO pv_reunions (titre, date_reunion, contenu, fichier)
     VALUES (?, ?, ?, ?)`,
    [
      data.titre,
      data.date_reunion,
      cleanOptional(data.contenu),
      data.fichier || null,
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const fichier = data.fichier !== undefined ? data.fichier : existing.fichier;
  await pool.execute(
    `UPDATE pv_reunions
     SET titre = ?, date_reunion = ?, contenu = ?, fichier = ?
     WHERE id = ?`,
    [
      data.titre,
      data.date_reunion,
      cleanOptional(data.contenu),
      fichier,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM pv_reunions WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
