const pool = require('../config/db');

function normalize(row) {
  if (!row) return null;
  return {
    ...row,
    audience: row.audience === 'membres' ? 'membres' : 'public',
  };
}

async function getAll() {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM prospection_realizations
       ORDER BY ordre_affichage ASC, annee DESC, id DESC`
    );
    return rows.map(normalize);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await pool.execute(
      `SELECT * FROM prospection_realizations
       ORDER BY ordre_affichage ASC, annee DESC, id DESC`
    );
    return rows.map((r) => normalize({ ...r, audience: 'public' }));
  }
}

async function countVisible(includeMembers) {
  try {
    if (includeMembers) {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) AS total FROM prospection_realizations'
      );
      return Number(rows[0]?.total || 0);
    }
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM prospection_realizations
       WHERE audience = 'public' OR audience IS NULL`
    );
    return Number(rows[0]?.total || 0);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM prospection_realizations'
    );
    return Number(rows[0]?.total || 0);
  }
}

async function count() {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM prospection_realizations'
  );
  return Number(rows[0]?.total || 0);
}

async function getById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM prospection_realizations WHERE id = ?',
    [id]
  );
  return normalize(rows[0] || null);
}

async function create(data) {
  const { titre, description, annee, image, ordre_affichage, audience } = data;
  const aud = audience === 'membres' ? 'membres' : 'public';
  try {
    const [result] = await pool.execute(
      `INSERT INTO prospection_realizations
        (titre, description, annee, image, ordre_affichage, audience)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        titre,
        description || null,
        annee != null && annee !== '' ? Number(annee) : null,
        image || null,
        ordre_affichage ?? 0,
        aud,
      ]
    );
    return getById(result.insertId);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [result] = await pool.execute(
      `INSERT INTO prospection_realizations
        (titre, description, annee, image, ordre_affichage)
       VALUES (?, ?, ?, ?, ?)`,
      [
        titre,
        description || null,
        annee != null && annee !== '' ? Number(annee) : null,
        image || null,
        ordre_affichage ?? 0,
      ]
    );
    return getById(result.insertId);
  }
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const image = data.image !== undefined ? data.image : existing.image;
  const aud =
    data.audience !== undefined
      ? data.audience === 'membres'
        ? 'membres'
        : 'public'
      : existing.audience === 'membres'
        ? 'membres'
        : 'public';
  try {
    await pool.execute(
      `UPDATE prospection_realizations
       SET titre = ?, description = ?, annee = ?, image = ?, ordre_affichage = ?, audience = ?
       WHERE id = ?`,
      [
        data.titre,
        data.description ?? null,
        data.annee != null && data.annee !== '' ? Number(data.annee) : null,
        image,
        data.ordre_affichage ?? 0,
        aud,
        id,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    await pool.execute(
      `UPDATE prospection_realizations
       SET titre = ?, description = ?, annee = ?, image = ?, ordre_affichage = ?
       WHERE id = ?`,
      [
        data.titre,
        data.description ?? null,
        data.annee != null && data.annee !== '' ? Number(data.annee) : null,
        image,
        data.ordre_affichage ?? 0,
        id,
      ]
    );
  }
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute(
    'DELETE FROM prospection_realizations WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = { getAll, count, countVisible, getById, create, update, remove };
