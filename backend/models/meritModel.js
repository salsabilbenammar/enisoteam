const pool = require('../config/db');

async function getLeaderboard() {
  const [rows] = await pool.execute(
    `SELECT m.id, m.nom, m.filiere,
            COALESCE(SUM(e.points), 0) AS total_points,
            COUNT(e.id) AS nb_entrees
     FROM members m
     LEFT JOIN merit_entries e ON e.member_id = m.id
     WHERE m.actif = 1
     GROUP BY m.id, m.nom, m.filiere
     HAVING total_points <> 0
     ORDER BY total_points DESC, m.nom ASC`
  );
  return rows;
}

async function getScores() {
  const [rows] = await pool.execute(
    `SELECT m.id, m.nom, m.email, m.filiere,
            COALESCE(SUM(e.points), 0) AS total_points,
            COUNT(e.id) AS nb_entrees
     FROM members m
     LEFT JOIN merit_entries e ON e.member_id = m.id
     WHERE m.actif = 1
     GROUP BY m.id, m.nom, m.email, m.filiere
     ORDER BY total_points DESC, m.nom ASC`
  );
  return rows;
}

async function getByMember(memberId) {
  const [rows] = await pool.execute(
    `SELECT id, points, motif, action_code, source_type, source_id, created_at
     FROM merit_entries
     WHERE member_id = ?
     ORDER BY created_at DESC`,
    [memberId]
  );
  const total = rows.reduce((sum, r) => sum + Number(r.points || 0), 0);
  return { total_points: total, entries: rows };
}

async function getAll() {
  const [rows] = await pool.execute(
    `SELECT e.id, e.member_id, e.points, e.motif, e.action_code, e.source_type, e.source_id,
            e.created_at, m.nom AS member_nom, m.email AS member_email
     FROM merit_entries e
     LEFT JOIN members m ON m.id = e.member_id
     ORDER BY e.created_at DESC`
  );
  return rows;
}

async function findBySource(memberId, actionCode, sourceType, sourceId) {
  const [rows] = await pool.execute(
    `SELECT id, member_id, points, motif, action_code, source_type, source_id, created_at
     FROM merit_entries
     WHERE member_id = ? AND action_code = ? AND source_type = ? AND source_id = ?
     LIMIT 1`,
    [memberId, actionCode, sourceType, sourceId]
  );
  return rows[0] || null;
}

async function create({ member_id, points, motif, action_code = null, source_type = 'manual', source_id = null }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO merit_entries (member_id, points, motif, action_code, source_type, source_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member_id, points, motif, action_code, source_type || 'manual', source_id]
    );
    const [rows] = await pool.execute(
      `SELECT e.id, e.member_id, e.points, e.motif, e.action_code, e.source_type, e.source_id,
              e.created_at, m.nom AS member_nom
       FROM merit_entries e
       JOIN members m ON m.id = e.member_id
       WHERE e.id = ?`,
      [result.insertId]
    );
    return rows[0];
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [result] = await pool.execute(
      `INSERT INTO merit_entries (member_id, points, motif) VALUES (?, ?, ?)`,
      [member_id, points, motif]
    );
    const [rows] = await pool.execute(
      `SELECT e.id, e.member_id, e.points, e.motif, e.created_at, m.nom AS member_nom
       FROM merit_entries e
       JOIN members m ON m.id = e.member_id
       WHERE e.id = ?`,
      [result.insertId]
    );
    return rows[0];
  }
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM merit_entries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getLeaderboard,
  getScores,
  getByMember,
  getAll,
  findBySource,
  create,
  remove,
};
