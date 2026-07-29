const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM gallery ORDER BY ordre_affichage ASC, id DESC'
  );
  return rows.map(normalize);
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM gallery WHERE id = ?', [id]);
  return rows[0] ? normalize(rows[0]) : null;
}

function normalize(row) {
  return {
    ...row,
    media_type: row.media_type || 'image',
  };
}

async function create(data) {
  const { titre, description, image, media_type, ordre_affichage } = data;
  const [result] = await pool.execute(
    `INSERT INTO gallery (titre, description, image, media_type, ordre_affichage)
     VALUES (?, ?, ?, ?, ?)`,
    [
      titre,
      description || null,
      image,
      media_type === 'video' ? 'video' : 'image',
      ordre_affichage ?? 0,
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const image = data.image !== undefined ? data.image : existing.image;
  const media_type =
    data.media_type !== undefined
      ? data.media_type === 'video'
        ? 'video'
        : 'image'
      : existing.media_type || 'image';

  await pool.execute(
    `UPDATE gallery
     SET titre = ?, description = ?, image = ?, media_type = ?, ordre_affichage = ?
     WHERE id = ?`,
    [
      data.titre,
      data.description ?? null,
      image,
      media_type,
      data.ordre_affichage ?? 0,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM gallery WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
