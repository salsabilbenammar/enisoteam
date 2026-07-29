const pool = require('../config/db');

const TABLES = {
  reports: 'rh_reports',
  suggestions: 'rh_suggestions',
  training_requests: 'rh_training_requests',
};

function assertTable(key) {
  const table = TABLES[key];
  if (!table) throw new Error('Type de formulaire invalide.');
  return table;
}

async function getAll(type) {
  const table = assertTable(type);
  const [rows] = await pool.execute(
    `SELECT * FROM ${table} ORDER BY created_at DESC`
  );
  return rows;
}

async function getById(type, id) {
  const table = assertTable(type);
  const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function createReport({ sujet, message }) {
  const [result] = await pool.execute(
    `INSERT INTO rh_reports (sujet, message) VALUES (?, ?)`,
    [sujet, message]
  );
  return getById('reports', result.insertId);
}

async function createSuggestion({ titre, message, member_id, member_nom, member_email }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO rh_suggestions (titre, message, member_id, member_nom, member_email)
       VALUES (?, ?, ?, ?, ?)`,
      [titre, message, member_id || null, member_nom || null, member_email || null]
    );
    return getById('suggestions', result.insertId);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const [result] = await pool.execute(
        `INSERT INTO rh_suggestions (titre, message) VALUES (?, ?)`,
        [titre, message]
      );
      return getById('suggestions', result.insertId);
    }
    throw err;
  }
}

async function createTrainingRequest({ theme, message, niveau }) {
  const [result] = await pool.execute(
    `INSERT INTO rh_training_requests (theme, message, niveau) VALUES (?, ?, ?)`,
    [theme, message, niveau || null]
  );
  return getById('training_requests', result.insertId);
}

async function updateStatus(type, id, statut) {
  const table = assertTable(type);
  const allowed = ['nouveau', 'en_cours', 'traite'];
  if (!allowed.includes(statut)) {
    const err = new Error('Statut invalide.');
    err.status = 400;
    throw err;
  }
  await pool.execute(`UPDATE ${table} SET statut = ? WHERE id = ?`, [statut, id]);
  return getById(type, id);
}

async function remove(type, id) {
  const table = assertTable(type);
  const [result] = await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  getById,
  createReport,
  createSuggestion,
  createTrainingRequest,
  updateStatus,
  remove,
};
