const pool = require('../config/db');

async function getAll() {
  const [rows] = await pool.execute(
    'SELECT * FROM announcements ORDER BY date_publication DESC, id DESC'
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
  return rows[0] || null;
}

function cleanOptional(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

async function create(data) {
  const { titre, contenu, image, lien_formulaire, date_publication, salle, heure } = data;
  const [result] = await pool.execute(
    `INSERT INTO announcements
      (titre, contenu, image, lien_formulaire, date_publication, salle, heure)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      titre,
      contenu,
      image || null,
      lien_formulaire || null,
      date_publication,
      cleanOptional(salle),
      cleanOptional(heure),
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const image = data.image !== undefined ? data.image : existing.image;
  await pool.execute(
    `UPDATE announcements
     SET titre = ?, contenu = ?, image = ?, lien_formulaire = ?, date_publication = ?,
         salle = ?, heure = ?
     WHERE id = ?`,
    [
      data.titre,
      data.contenu,
      image,
      data.lien_formulaire || null,
      data.date_publication,
      cleanOptional(data.salle),
      cleanOptional(data.heure),
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM announcements WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, remove };
