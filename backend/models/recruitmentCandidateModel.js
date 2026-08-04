const pool = require('../config/db');
const { STATUSES } = require('../services/recruitmentMailTemplates');

async function createHistory(candidateId, oldStatut, newStatut, note = null) {
  await pool.execute(
    `INSERT INTO recruitment_status_history (candidate_id, old_statut, new_statut, note)
     VALUES (?, ?, ?, ?)`,
    [candidateId, oldStatut || null, newStatut, note]
  );
}

async function create(data) {
  const [result] = await pool.execute(
    `INSERT INTO recruitment_candidates
      (nom, prenom, email, telephone, facebook_link, filiere, annee, adresse, photo_path,
       motivation, motivation_robotics, domaine_interet, unique_about, piece_jointe_path,
       competences, disponibilites, message, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
    [
      data.nom,
      data.prenom,
      data.email,
      data.telephone,
      data.facebook_link || null,
      data.filiere || null,
      data.annee || null,
      data.adresse || null,
      data.photo_path || null,
      data.motivation,
      data.motivation_robotics || null,
      data.domaine_interet || null,
      data.unique_about || null,
      data.piece_jointe_path || null,
      data.competences || null,
      data.disponibilites || null,
      data.message || null,
    ]
  );
  await createHistory(result.insertId, null, 'en_attente', 'Candidature reçue');
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT c.*,
            s.date_slot, s.heure_slot, s.lieu AS slot_lieu, s.max_places
     FROM recruitment_candidates c
     LEFT JOIN recruitment_slots s ON s.id = c.interview_slot_id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByToken(token) {
  const normalized = String(token || '')
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/[),.]+$/g, '');
  if (!normalized) return null;

  const [rows] = await pool.execute(
    `SELECT c.*,
            s.date_slot, s.heure_slot, s.lieu AS slot_lieu
     FROM recruitment_candidates c
     LEFT JOIN recruitment_slots s ON s.id = c.interview_slot_id
     WHERE c.booking_token = ?`,
    [normalized]
  );
  return rows[0] || null;
}

async function list({
  search = '',
  statut = '',
  date_slot = '',
  heure_slot = '',
  page = 1,
  limit = 10,
} = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  const where = [];
  const params = [];

  if (search.trim()) {
    where.push(
      `(c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ? OR c.telephone LIKE ? OR c.motivation LIKE ?)`
    );
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q, q);
  }
  if (statut && STATUSES.includes(statut)) {
    where.push('c.statut = ?');
    params.push(statut);
  }
  if (date_slot && /^\d{4}-\d{2}-\d{2}$/.test(String(date_slot))) {
    where.push('s.date_slot = ?');
    params.push(date_slot);
  }
  if (heure_slot) {
    const h = String(heure_slot).slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(h)) {
      where.push('TIME_FORMAT(s.heure_slot, "%H:%i") = ?');
      params.push(h);
    }
  }

  const join =
    date_slot || heure_slot
      ? 'INNER JOIN recruitment_slots s ON s.id = c.interview_slot_id'
      : 'LEFT JOIN recruitment_slots s ON s.id = c.interview_slot_id';
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM recruitment_candidates c
     ${join}
     ${clause}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.execute(
    `SELECT c.*,
            s.date_slot, s.heure_slot, s.lieu AS slot_lieu
     FROM recruitment_candidates c
     ${join}
     ${clause}
     ORDER BY s.date_slot ASC, s.heure_slot ASC, c.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  return {
    items: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function updateStatus(ids, newStatut, note = null) {
  if (!STATUSES.includes(newStatut)) {
    const err = new Error('Statut invalide.');
    err.status = 400;
    throw err;
  }
  const uniqueIds = [...new Set(ids.map(Number).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const placeholders = uniqueIds.map(() => '?').join(',');
  const [current] = await pool.execute(
    `SELECT id, statut FROM recruitment_candidates WHERE id IN (${placeholders})`,
    uniqueIds
  );

  await pool.execute(
    `UPDATE recruitment_candidates SET statut = ? WHERE id IN (${placeholders})`,
    [newStatut, ...uniqueIds]
  );

  for (const row of current) {
    if (row.statut !== newStatut) {
      await createHistory(row.id, row.statut, newStatut, note);
    }
  }

  const [rows] = await pool.execute(
    `SELECT * FROM recruitment_candidates WHERE id IN (${placeholders})`,
    uniqueIds
  );
  return rows;
}

async function setBookingToken(id, token) {
  await pool.execute(`UPDATE recruitment_candidates SET booking_token = ? WHERE id = ?`, [
    token,
    id,
  ]);
  return findById(id);
}

async function bookSlot(candidateId, slotId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [cRows] = await conn.execute(
      `SELECT * FROM recruitment_candidates WHERE id = ? FOR UPDATE`,
      [candidateId]
    );
    const candidate = cRows[0];
    if (!candidate) {
      const err = new Error('Candidat introuvable.');
      err.status = 404;
      throw err;
    }
    if (candidate.interview_slot_id) {
      const err = new Error('Un créneau est déjà réservé.');
      err.status = 400;
      throw err;
    }
    if (!['en_attente', 'preselectionne'].includes(candidate.statut)) {
      const err = new Error('Ce candidat ne peut pas réserver un créneau.');
      err.status = 400;
      throw err;
    }

    const [sRows] = await conn.execute(
      `SELECT s.*,
              (SELECT COUNT(*) FROM recruitment_candidates c WHERE c.interview_slot_id = s.id) AS reserved
       FROM recruitment_slots s
       WHERE s.id = ?
       FOR UPDATE`,
      [slotId]
    );
    const slot = sRows[0];
    if (!slot) {
      const err = new Error('Créneau introuvable.');
      err.status = 404;
      throw err;
    }
    if (Number(slot.reserved) >= Number(slot.max_places)) {
      const err = new Error('Ce créneau est complet.');
      err.status = 409;
      throw err;
    }

    await conn.execute(
      `UPDATE recruitment_candidates
       SET interview_slot_id = ?, booked_at = NOW(), statut = 'entretien_confirme'
       WHERE id = ?`,
      [slotId, candidateId]
    );
    await conn.execute(
      `INSERT INTO recruitment_status_history (candidate_id, old_statut, new_statut, note)
       VALUES (?, ?, 'entretien_confirme', ?)`,
      [candidateId, candidate.statut, 'Créneau réservé']
    );

    await conn.commit();
    return findById(candidateId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getHistory(candidateId) {
  const [rows] = await pool.execute(
    `SELECT * FROM recruitment_status_history WHERE candidate_id = ? ORDER BY created_at DESC`,
    [candidateId]
  );
  return rows;
}

async function remove(id) {
  const [result] = await pool.execute(`DELETE FROM recruitment_candidates WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function getStats() {
  const [rows] = await pool.execute(
    `SELECT statut, COUNT(*) AS total
     FROM recruitment_candidates
     GROUP BY statut`
  );
  const byStatus = Object.fromEntries(rows.map((r) => [r.statut, Number(r.total)]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { total, byStatus };
}

async function markSheetsExported(id) {
  try {
    await pool.execute(
      `UPDATE recruitment_candidates SET sheets_exported_at = NOW() WHERE id = ?`,
      [id]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
  }
  return findById(id);
}

module.exports = {
  create,
  findById,
  findByToken,
  list,
  updateStatus,
  setBookingToken,
  bookSlot,
  getHistory,
  remove,
  createHistory,
  getStats,
  markSheetsExported,
};
