const crypto = require('crypto');
const pool = require('../config/db');

function cleanOptional(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function getAll() {
  const [rows] = await pool.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM attendance_entries e WHERE e.session_id = s.id) AS entries_count
     FROM attendance_sessions s
     ORDER BY s.created_at DESC, s.id DESC`
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM attendance_entries e WHERE e.session_id = s.id) AS entries_count
     FROM attendance_sessions s
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getByToken(token) {
  const [rows] = await pool.execute(
    'SELECT * FROM attendance_sessions WHERE public_token = ?',
    [token]
  );
  return rows[0] || null;
}

async function create(data) {
  const token = makeToken();
  const [result] = await pool.execute(
    `INSERT INTO attendance_sessions
       (type, titre, date_seance, heure, lieu, ouverte, public_token)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      data.type || 'reunion',
      data.titre,
      data.date_seance || null,
      cleanOptional(data.heure),
      cleanOptional(data.lieu),
      token,
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  await pool.execute(
    `UPDATE attendance_sessions
     SET type = ?, titre = ?, date_seance = ?, heure = ?, lieu = ?, ouverte = ?
     WHERE id = ?`,
    [
      data.type ?? existing.type,
      data.titre ?? existing.titre,
      data.date_seance !== undefined ? data.date_seance || null : existing.date_seance,
      data.heure !== undefined ? cleanOptional(data.heure) : existing.heure,
      data.lieu !== undefined ? cleanOptional(data.lieu) : existing.lieu,
      data.ouverte !== undefined ? (data.ouverte ? 1 : 0) : existing.ouverte,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM attendance_sessions WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listEntries(sessionId) {
  const [rows] = await pool.execute(
    `SELECT * FROM attendance_entries
     WHERE session_id = ?
     ORDER BY created_at ASC, id ASC`,
    [sessionId]
  );
  return rows;
}

async function addEntry(sessionId, { prenom, nom, member_id = null }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO attendance_entries (session_id, prenom, nom, member_id)
       VALUES (?, ?, ?, ?)`,
      [sessionId, prenom, nom, member_id || null]
    );
    const [rows] = await pool.execute('SELECT * FROM attendance_entries WHERE id = ?', [
      result.insertId,
    ]);
    return rows[0] || null;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [result] = await pool.execute(
      `INSERT INTO attendance_entries (session_id, prenom, nom)
       VALUES (?, ?, ?)`,
      [sessionId, prenom, nom]
    );
    const [rows] = await pool.execute('SELECT * FROM attendance_entries WHERE id = ?', [
      result.insertId,
    ]);
    return rows[0] || null;
  }
}

async function setEntryMember(entryId, memberId) {
  await pool.execute('UPDATE attendance_entries SET member_id = ? WHERE id = ?', [
    memberId,
    entryId,
  ]);
}

async function removeEntry(entryId, sessionId = null) {
  if (sessionId != null) {
    const [result] = await pool.execute(
      'DELETE FROM attendance_entries WHERE id = ? AND session_id = ?',
      [entryId, sessionId]
    );
    return result.affectedRows > 0;
  }
  const [result] = await pool.execute('DELETE FROM attendance_entries WHERE id = ?', [entryId]);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  getById,
  getByToken,
  create,
  update,
  remove,
  listEntries,
  addEntry,
  setEntryMember,
  removeEntry,
};
