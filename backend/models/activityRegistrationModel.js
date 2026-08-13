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
  const count = Number(row.inscriptions_count) || 0;
  const payante = Number(row.payante) === 1 || row.payante === true;
  return {
    ...row,
    inscription_ouverte:
      Number(row.inscription_ouverte) === 1 || row.inscription_ouverte === true,
    payante,
    prix: row.prix || null,
    fifo_paiement: payante && (Number(row.fifo_paiement) === 1 || row.fifo_paiement === true),
    inscriptions_count: count,
    champs_personnalises: normalizeCustomFields(row.champs_personnalises),
  };
}

function normalizeRegistration(row) {
  if (!row) return null;
  const accepte =
    Number(row.accepte_paiement) === 1 || row.accepte_paiement === true;
  const fromFinance =
    Number(row.paiement_finance) === 1 || row.paiement_finance === true;
  const fromFlag =
    Number(row.paiement_valide) === 1 || row.paiement_valide === true;
  const paiementValide = fromFlag || fromFinance;
  const paiementAt = row.paiement_at || row.paiement_valide_at || null;
  return {
    ...row,
    accompagnants: parseJsonField(row.accompagnants, []),
    reponses_personnalisees: parseJsonField(row.reponses_personnalisees, {}),
    accepte_paiement: accepte,
    paiement_valide: paiementValide,
    paiement_via_finance: fromFinance,
    paiement_at: paiementValide ? paiementAt : null,
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
  try {
    const [rows] = await pool.execute(
      `SELECT r.*,
              EXISTS (
                SELECT 1
                FROM member_payments p
                JOIN members m ON m.id = p.member_id
                WHERE p.cotisation_type = 'formation'
                  AND p.detail_ref_id = r.training_id
                  AND LOWER(TRIM(m.email)) = LOWER(TRIM(r.email))
              ) AS paiement_finance,
              COALESCE(
                r.paiement_valide_at,
                (
                  SELECT MIN(CONCAT(p.date_paiement, ' 00:00:00'))
                  FROM member_payments p
                  JOIN members m ON m.id = p.member_id
                  WHERE p.cotisation_type = 'formation'
                    AND p.detail_ref_id = r.training_id
                    AND LOWER(TRIM(m.email)) = LOWER(TRIM(r.email))
                )
              ) AS paiement_at
       FROM training_registrations r
       WHERE r.training_id = ?
       ORDER BY r.created_at ASC`,
      [trainingId]
    );
    return rows.map(normalizeRegistration);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') throw err;
    try {
      const [rows] = await pool.execute(
        `SELECT r.*,
                EXISTS (
                  SELECT 1
                  FROM member_payments p
                  JOIN members m ON m.id = p.member_id
                  WHERE p.cotisation_type = 'formation'
                    AND p.detail_ref_id = r.training_id
                    AND LOWER(TRIM(m.email)) = LOWER(TRIM(r.email))
                ) AS paiement_finance
         FROM training_registrations r
         WHERE r.training_id = ?
         ORDER BY r.created_at ASC`,
        [trainingId]
      );
      return rows.map(normalizeRegistration);
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR' && err2.code !== 'ER_NO_SUCH_TABLE') throw err2;
      const [rows] = await pool.execute(
        `SELECT * FROM training_registrations WHERE training_id = ? ORDER BY created_at ASC`,
        [trainingId]
      );
      return rows.map((r) =>
        normalizeRegistration({ ...r, paiement_valide: 0, paiement_finance: 0 })
      );
    }
  }
}

async function setTrainingRegistrationPayment(registrationId, trainingId, validated) {
  const value = validated ? 1 : 0;
  try {
    const [result] = await pool.execute(
      `UPDATE training_registrations
       SET paiement_valide = ?,
           paiement_valide_at = CASE
             WHEN ? = 1 THEN COALESCE(paiement_valide_at, NOW())
             ELSE NULL
           END
       WHERE id = ? AND training_id = ?`,
      [value, value, registrationId, trainingId]
    );
    if (!result.affectedRows) return null;
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [result] = await pool.execute(
          `UPDATE training_registrations
           SET paiement_valide = ?
           WHERE id = ? AND training_id = ?`,
          [value, registrationId, trainingId]
        );
        if (!result.affectedRows) return null;
      } catch (err2) {
        if (err2.code === 'ER_BAD_FIELD_ERROR') {
          const e = new Error(
            'Colonne paiement_valide absente. Exécutez database/migrate_training_paiement_valide.js'
          );
          e.status = 503;
          throw e;
        }
        throw err2;
      }
    } else {
      throw err;
    }
  }

  const list = await listTrainingRegistrations(trainingId);
  return list.find((r) => Number(r.id) === Number(registrationId)) || null;
}

module.exports = {
  normalizeEvent,
  normalizeTraining,
  normalizeCustomFields,
  createEventRegistration,
  listEventRegistrations,
  createTrainingRegistration,
  listTrainingRegistrations,
  setTrainingRegistrationPayment,
};
