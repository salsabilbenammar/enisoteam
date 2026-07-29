const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM trainings ORDER BY date DESC');
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM trainings WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const { titre, description, date, formateur, niveau, lien } = data;
  const [result] = await pool.execute(
    `INSERT INTO trainings (titre, description, date, formateur, niveau, lien)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [titre, description, date, formateur || null, niveau || 'debutant', lien || null]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  await pool.execute(
    `UPDATE trainings
     SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?
     WHERE id = ?`,
    [
      data.titre,
      data.description,
      data.date,
      data.formateur || null,
      data.niveau || 'debutant',
      data.lien || null,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM trainings WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
