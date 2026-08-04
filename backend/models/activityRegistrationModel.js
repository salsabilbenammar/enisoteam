const pool = require('../config/db');

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeCustomFields(raw) {
  const list = parseJsonField(raw, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((f, i) => {
      if (!f || !f.label) return null;
      const type = [
        'text',
        'textarea',
        'number',
        'select',
        'checkbox',
        'multiselect',
        'date',
      ].includes(f.type)
        ? f.type
        : 'text';
      const id = String(f.id || `field_${i + 1}`).trim();
      const options = Array.isArray(f.options)
        ? f.options.map((o) => String(o).trim()).filter(Boolean)
        : String(f.options || '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean);
      return {
        id,
        label: String(f.label).trim(),
        type,
        required: !!f.required,
        options: type === 'select' || type === 'multiselect' ? options : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeEvent(row) {
  if (!row) return null;
  const type =
    row.formulaire_type === 'avec_accompagnants' ? 'avec_accompagnants' : 'individuel';
  const min = Math.max(0, Number(row.accompagnants_min) || 0);
  let max = Math.max(0, Number(row.accompagnants_max) || 0);
  if (type === 'avec_accompagnants' && max < min) max = min;
  return {
    ...row,
    inscription_ouverte:
      Number(row.inscription_ouverte) === 1 || row.inscription_ouverte === true,
    formulaire_type: type,
    accompagnants_min: type === 'avec_accompagnants' ? min : 0,
    accompagnants_max: type === 'avec_accompagnants' ? max : 0,
    champs_personnalises: normalizeCustomFields(row.champs_personnalises),
  };
}

function normalizeTraining(row) {
  if (!row) return null;
  return {
    ...row,
    inscription_ouverte:
      Number(row.inscription_ouverte) === 1 || row.inscription_ouverte === true,
    payante: Number(row.payante) === 1 || row.payante === true,
    prix: row.prix || null,
    champs_personnalises: normalizeCustomFields(row.champs_personnalises),
  };
}

function normalizeRegistration(row) {
  if (!row) return null;
  return {
    ...row,
    accompagnants: parseJsonField(row.accompagnants, []),
    reponses_personnalisees: parseJsonField(row.reponses_personnalisees, {}),
  };
}

async function createEventRegistration(eventId, data) {
  const accompagnantsJson =
    data.accompagnants && data.accompagnants.length
      ? JSON.stringify(data.accompagnants)
      : null;
  const reponsesJson =
    data.reponses_personnalisees && Object.keys(data.reponses_personnalisees).length
      ? JSON.stringify(data.reponses_personnalisees)
      : null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO event_registrations
        (event_id, prenom, nom, email, telephone, facebook_link, filiere, annee, motivation,
         accompagnants, reponses_personnalisees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        data.prenom,
        data.nom,
        data.email,
        data.telephone,
        data.facebook_link || null,
        data.filiere || null,
        data.annee || null,
        data.motivation || null,
        accompagnantsJson,
        reponsesJson,
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [result] = await pool.execute(
      `INSERT INTO event_registrations
        (event_id, prenom, nom, email, telephone, facebook_link, filiere, annee, motivation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        data.prenom,
        data.nom,
        data.email,
        data.telephone,
        data.facebook_link || null,
        data.filiere || null,
        data.annee || null,
        data.motivation || null,
      ]
    );
    return result.insertId;
  }
}

async function listEventRegistrations(eventId) {
  const [rows] = await pool.execute(
    `SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at ASC`,
    [eventId]
  );
  return rows.map(normalizeRegistration);
}

async function createTrainingRegistration(trainingId, data) {
  const accepte = data.accepte_paiement ? 1 : 0;
  const reponsesJson =
    data.reponses_personnalisees && Object.keys(data.reponses_personnalisees).length
      ? JSON.stringify(data.reponses_personnalisees)
      : null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO training_registrations
        (training_id, prenom, nom, email, telephone, facebook_link, filiere, annee, motivation,
         accepte_paiement, reponses_personnalisees)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trainingId,
        data.prenom,
        data.nom,
        data.email,
        data.telephone,
        data.facebook_link || null,
        data.filiere || null,
        data.annee || null,
        data.motivation || null,
        accepte,
        reponsesJson,
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      const [result] = await pool.execute(
        `INSERT INTO training_registrations
          (training_id, prenom, nom, email, telephone, facebook_link, filiere, annee, motivation, accepte_paiement)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trainingId,
          data.prenom,
          data.nom,
          data.email,
          data.telephone,
          data.facebook_link || null,
          data.filiere || null,
          data.annee || null,
          data.motivation || null,
          accepte,
        ]
      );
      return result.insertId;
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
      const [result] = await pool.execute(
        `INSERT INTO training_registrations
          (training_id, prenom, nom, email, telephone, facebook_link, filiere, annee, motivation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trainingId,
          data.prenom,
          data.nom,
          data.email,
          data.telephone,
          data.facebook_link || null,
          data.filiere || null,
          data.annee || null,
          data.motivation || null,
        ]
      );
      return result.insertId;
    }
  }
}

async function listTrainingRegistrations(trainingId) {
  const [rows] = await pool.execute(
    `SELECT * FROM training_registrations WHERE training_id = ? ORDER BY created_at ASC`,
    [trainingId]
  );
  return rows.map(normalizeRegistration);
}

module.exports = {
  normalizeEvent,
  normalizeTraining,
  normalizeCustomFields,
  createEventRegistration,
  listEventRegistrations,
  createTrainingRegistration,
  listTrainingRegistrations,
};
