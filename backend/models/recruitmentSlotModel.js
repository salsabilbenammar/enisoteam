const pool = require('../config/db');
const { normalizeStream } = require('../utils/recruitmentStreams');

async function getAll(stream = '') {
  const where = stream ? 'WHERE s.stream = ?' : '';
  const params = stream ? [normalizeStream(stream)] : [];
  const [rows] = await pool.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM recruitment_candidates c WHERE c.interview_slot_id = s.id) AS reserved
     FROM recruitment_slots s
     ${where}
     ORDER BY s.date_slot ASC, s.heure_slot ASC`,
    params
  );
  return rows.map(enrich);
}

function toDayKey(value) {
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value || '').slice(0, 10);
}

function toTimeKey(value) {
  const raw = String(value || '00:00:00');
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function todayKeyLocal() {
  return toDayKey(new Date());
}

function nowTimeKeyLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Créneau encore réservable : places libres + date/heure non passées. */
function isBookable(slot, today = todayKeyLocal(), nowTime = nowTimeKeyLocal()) {
  if (!slot || Number(slot.places_restantes) <= 0) return false;
  const day = toDayKey(slot.date_slot);
  if (!day || day < today) return false;
  if (day === today && toTimeKey(slot.heure_slot) <= nowTime) return false;
  return true;
}

async function getAvailable(stream = '') {
  const all = await getAll(stream);
  const today = todayKeyLocal();
  const nowTime = nowTimeKeyLocal();
  return all.filter((s) => isBookable(s, today, nowTime));
}

async function getById(id) {
  const [rows] = await pool.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM recruitment_candidates c WHERE c.interview_slot_id = s.id) AS reserved
     FROM recruitment_slots s
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] ? enrich(rows[0]) : null;
}

function enrich(row) {
  const reserved = Number(row.reserved || 0);
  const max = Number(row.max_places || 0);
  return {
    ...row,
    reserved,
    places_restantes: Math.max(0, max - reserved),
    disponible: reserved < max,
  };
}

async function create({ date_slot, heure_slot, max_places, lieu, stream }) {
  const [result] = await pool.execute(
    `INSERT INTO recruitment_slots (date_slot, heure_slot, max_places, lieu, stream)
     VALUES (?, ?, ?, ?, ?)`,
    [date_slot, heure_slot, max_places, lieu || null, normalizeStream(stream)]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  await pool.execute(
    `UPDATE recruitment_slots
     SET date_slot = ?, heure_slot = ?, max_places = ?, lieu = ?
     WHERE id = ?`,
    [
      data.date_slot ?? existing.date_slot,
      data.heure_slot ?? existing.heure_slot,
      data.max_places ?? existing.max_places,
      data.lieu !== undefined ? data.lieu : existing.lieu,
      id,
    ]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute(`DELETE FROM recruitment_slots WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function getSchedule(stream = '') {
  const where = stream ? 'WHERE s.stream = ?' : '';
  const params = stream ? [normalizeStream(stream)] : [];
  const [rows] = await pool.execute(
    `SELECT s.id AS slot_id, s.date_slot, s.heure_slot, s.max_places, s.lieu, s.stream,
            c.id AS candidate_id, c.nom, c.prenom, c.email, c.telephone, c.statut, c.stream AS candidate_stream
     FROM recruitment_slots s
     LEFT JOIN recruitment_candidates c ON c.interview_slot_id = s.id
     ${where}
     ORDER BY s.date_slot ASC, s.heure_slot ASC, c.nom ASC, c.prenom ASC`,
    params
  );

  const map = new Map();
  for (const row of rows) {
    const key = `${row.date_slot}|${row.heure_slot}|${row.slot_id}`;
    if (!map.has(key)) {
      map.set(key, {
        slot_id: row.slot_id,
        date_slot: row.date_slot,
        heure_slot: row.heure_slot,
        max_places: row.max_places,
        lieu: row.lieu,
        stream: row.stream || 'general',
        candidates: [],
      });
    }
    if (row.candidate_id) {
      map.get(key).candidates.push({
        id: row.candidate_id,
        nom: row.nom,
        prenom: row.prenom,
        email: row.email,
        telephone: row.telephone,
        statut: row.statut,
        stream: row.candidate_stream || 'general',
      });
    }
  }
  return [...map.values()];
}

module.exports = {
  getAll,
  getAvailable,
  getById,
  create,
  update,
  remove,
  getSchedule,
  isBookable,
  toDayKey,
  toTimeKey,
};
