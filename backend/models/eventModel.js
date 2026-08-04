const pool = require('../config/db');
const { normalizeEvent, normalizeCustomFields } = require('./activityRegistrationModel');

function serializeFormConfig(data) {
  const type =
    data.formulaire_type === 'avec_accompagnants' ? 'avec_accompagnants' : 'individuel';
  let min = Math.max(0, Number(data.accompagnants_min) || 0);
  let max = Math.max(0, Number(data.accompagnants_max) || 0);
  if (type !== 'avec_accompagnants') {
    min = 0;
    max = 0;
  } else if (max < min) {
    max = min;
  }
  const fields = normalizeCustomFields(data.champs_personnalises);
  return {
    formulaire_type: type,
    accompagnants_min: min,
    accompagnants_max: max,
    champs_personnalises: JSON.stringify(fields),
  };
}

async function getAll() {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) AS inscriptions_count
       FROM events e
       ORDER BY e.date DESC`
    );
    return rows.map(normalizeEvent);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') throw err;
    const [rows] = await pool.execute('SELECT * FROM events ORDER BY date DESC');
    return rows.map((r) => normalizeEvent({ ...r, inscription_ouverte: 0, inscriptions_count: 0 }));
  }
}

async function getById(id) {
  try {
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
    return normalizeEvent(rows[0] || null);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
    return normalizeEvent(rows[0] ? { ...rows[0], inscription_ouverte: 0 } : null);
  }
}

async function create(data) {
  const form = serializeFormConfig(data);
  try {
    const [result] = await pool.execute(
      `INSERT INTO events
        (titre, description, date, lieu, image, statut, inscription_ouverte,
         formulaire_type, accompagnants_min, accompagnants_max, champs_personnalises)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.titre,
        data.description,
        data.date,
        data.lieu || null,
        data.image || null,
        data.statut || 'a_venir',
        data.inscription_ouverte ? 1 : 0,
        form.formulaire_type,
        form.accompagnants_min,
        form.accompagnants_max,
        form.champs_personnalises,
      ]
    );
    return getById(result.insertId);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      const [result] = await pool.execute(
        `INSERT INTO events (titre, description, date, lieu, image, statut, inscription_ouverte)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.titre,
          data.description,
          data.date,
          data.lieu || null,
          data.image || null,
          data.statut || 'a_venir',
          data.inscription_ouverte ? 1 : 0,
        ]
      );
      return getById(result.insertId);
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
      const [result] = await pool.execute(
        `INSERT INTO events (titre, description, date, lieu, image, statut)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.titre,
          data.description,
          data.date,
          data.lieu || null,
          data.image || null,
          data.statut || 'a_venir',
        ]
      );
      return getById(result.insertId);
    }
  }
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const image = data.image !== undefined ? data.image : existing.image;
  const open =
    data.inscription_ouverte !== undefined
      ? data.inscription_ouverte
        ? 1
        : 0
      : existing.inscription_ouverte
        ? 1
        : 0;
  const form = serializeFormConfig({
    formulaire_type:
      data.formulaire_type !== undefined ? data.formulaire_type : existing.formulaire_type,
    accompagnants_min:
      data.accompagnants_min !== undefined
        ? data.accompagnants_min
        : existing.accompagnants_min,
    accompagnants_max:
      data.accompagnants_max !== undefined
        ? data.accompagnants_max
        : existing.accompagnants_max,
    champs_personnalises:
      data.champs_personnalises !== undefined
        ? data.champs_personnalises
        : existing.champs_personnalises,
  });

  try {
    await pool.execute(
      `UPDATE events
       SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?,
           inscription_ouverte = ?, formulaire_type = ?, accompagnants_min = ?,
           accompagnants_max = ?, champs_personnalises = ?
       WHERE id = ?`,
      [
        data.titre,
        data.description,
        data.date,
        data.lieu || null,
        image,
        data.statut || 'a_venir',
        open,
        form.formulaire_type,
        form.accompagnants_min,
        form.accompagnants_max,
        form.champs_personnalises,
        id,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      await pool.execute(
        `UPDATE events
         SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?,
             inscription_ouverte = ?
         WHERE id = ?`,
        [
          data.titre,
          data.description,
          data.date,
          data.lieu || null,
          image,
          data.statut || 'a_venir',
          open,
          id,
        ]
      );
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
      await pool.execute(
        `UPDATE events
         SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?
         WHERE id = ?`,
        [
          data.titre,
          data.description,
          data.date,
          data.lieu || null,
          image,
          data.statut || 'a_venir',
          id,
        ]
      );
    }
  }
  return getById(id);
}

async function setInscriptionOpen(id, open) {
  try {
    const [result] = await pool.execute(
      `UPDATE events SET inscription_ouverte = ? WHERE id = ?`,
      [open ? 1 : 0, id]
    );
    if (!result.affectedRows) return null;
    return getById(id);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const e = new Error(
        'Colonne inscription_ouverte absente. Exécutez database/update_activity_inscriptions.sql'
      );
      e.status = 503;
      throw e;
    }
    throw err;
  }
}

async function remove(id) {
  const [result] = await pool.execute(`DELETE FROM events WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = { getAll, getById, create, update, setInscriptionOpen, remove };
