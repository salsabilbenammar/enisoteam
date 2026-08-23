const pool = require('../config/db');
const {
  normalizeEvent,
  normalizeFormAudience,
  audienceAllowsGroup,
  serializeEventFields,
} = require('./activityRegistrationModel');

function serializeFormConfig(data) {
  const type = normalizeFormAudience(data.formulaire_type);
  let min = Math.max(0, Number(data.accompagnants_min) || 0);
  let max = Math.max(0, Number(data.accompagnants_max) || 0);
  if (!audienceAllowsGroup(type)) {
    min = 0;
    max = 0;
  } else if (max < min) {
    max = min;
  }
  return {
    formulaire_type: type,
    accompagnants_min: min,
    accompagnants_max: max,
    champs_personnalises: serializeEventFields(data),
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
  const payant = data.payant ? 1 : 0;
  const prix = payant && data.prix ? String(data.prix).trim() : null;
  const audience = data.audience === 'membres' ? 'membres' : 'public';
  try {
    const [result] = await pool.execute(
      `INSERT INTO events
        (titre, description, date, lieu, image, statut, inscription_ouverte, payant, prix,
         formulaire_type, accompagnants_min, accompagnants_max, champs_personnalises, audience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.titre,
        data.description,
        data.date,
        data.lieu || null,
        data.image || null,
        data.statut || 'a_venir',
        data.inscription_ouverte ? 1 : 0,
        payant,
        prix,
        form.formulaire_type,
        form.accompagnants_min,
        form.accompagnants_max,
        form.champs_personnalises,
        audience,
      ]
    );
    return getById(result.insertId);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      const [result] = await pool.execute(
        `INSERT INTO events
          (titre, description, date, lieu, image, statut, inscription_ouverte, payant, prix,
           formulaire_type, accompagnants_min, accompagnants_max, champs_personnalises)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.titre,
          data.description,
          data.date,
          data.lieu || null,
          data.image || null,
          data.statut || 'a_venir',
          data.inscription_ouverte ? 1 : 0,
          payant,
          prix,
          form.formulaire_type,
          form.accompagnants_min,
          form.accompagnants_max,
          form.champs_personnalises,
        ]
      );
      return getById(result.insertId);
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
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
      } catch (err3) {
        if (err3.code !== 'ER_BAD_FIELD_ERROR') throw err3;
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
  const payant =
    data.payant !== undefined ? (data.payant ? 1 : 0) : existing.payant ? 1 : 0;
  const prixRaw = data.prix !== undefined ? data.prix : existing.prix;
  const prix = payant && prixRaw ? String(prixRaw).trim() : null;
  const audience =
    data.audience !== undefined
      ? data.audience === 'membres'
        ? 'membres'
        : 'public'
      : existing.audience === 'membres'
        ? 'membres'
        : 'public';

  try {
    await pool.execute(
      `UPDATE events
       SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?,
           inscription_ouverte = ?, payant = ?, prix = ?,
           formulaire_type = ?, accompagnants_min = ?,
           accompagnants_max = ?, champs_personnalises = ?, audience = ?
       WHERE id = ?`,
      [
        data.titre,
        data.description,
        data.date,
        data.lieu || null,
        image,
        data.statut || 'a_venir',
        open,
        payant,
        prix,
        form.formulaire_type,
        form.accompagnants_min,
        form.accompagnants_max,
        form.champs_personnalises,
        audience,
        id,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      await pool.execute(
        `UPDATE events
         SET titre = ?, description = ?, date = ?, lieu = ?, image = ?, statut = ?,
             inscription_ouverte = ?, payant = ?, prix = ?,
             formulaire_type = ?, accompagnants_min = ?,
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
          payant,
          prix,
          form.formulaire_type,
          form.accompagnants_min,
          form.accompagnants_max,
          form.champs_personnalises,
          id,
        ]
      );
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
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
      } catch (err3) {
        if (err3.code !== 'ER_BAD_FIELD_ERROR') throw err3;
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

async function saveListeFinale(id, payload) {
  const personnes = Array.isArray(payload?.personnes) ? payload.personnes : [];
  const registrationIds = Array.isArray(payload?.registration_ids)
    ? payload.registration_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  const cleaned = personnes.map((row, index) => ({
    id: Number(row?.id) || registrationIds[index] || index + 1,
    fullName: String(row?.fullName || '').trim(),
    prenom: String(row?.prenom || '').trim(),
    nom: String(row?.nom || '').trim(),
    email: String(row?.email || '').trim(),
    telephone: String(row?.telephone || '').trim(),
    filiere: String(row?.filiere || '').trim(),
    type: String(row?.type || '').trim(),
    groupMembers: String(row?.groupMembers || '').trim(),
    groupSize: Number(row?.groupSize) || 1,
  }));
  const data = JSON.stringify({
    personnes: cleaned,
    registration_ids: registrationIds.length
      ? registrationIds
      : cleaned.map((p) => p.id).filter(Boolean),
  });
  try {
    const [result] = await pool.execute(
      `UPDATE events
       SET liste_finale = ?, liste_finale_at = NOW()
       WHERE id = ?`,
      [data, id]
    );
    if (!result.affectedRows) return null;
    return getById(id);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const e = new Error(
        'Colonne liste_finale absente. Exécutez database/migrate_event_liste_finale.js'
      );
      e.status = 503;
      throw e;
    }
    throw err;
  }
}

module.exports = { getAll, getById, create, update, setInscriptionOpen, remove, saveListeFinale };
