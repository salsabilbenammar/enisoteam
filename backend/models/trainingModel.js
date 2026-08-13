const pool = require('../config/db');
const { normalizeTraining, normalizeCustomFields } = require('./activityRegistrationModel');

function serializeCustomFields(data) {
  return JSON.stringify(normalizeCustomFields(data.champs_personnalises));
}

async function getAll() {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*,
              (SELECT COUNT(*) FROM training_registrations r WHERE r.training_id = t.id) AS inscriptions_count
       FROM trainings t
       ORDER BY t.date DESC`
    );
    return rows.map(normalizeTraining);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') throw err;
    const [rows] = await pool.execute('SELECT * FROM trainings ORDER BY date DESC');
    return rows.map((r) =>
      normalizeTraining({ ...r, inscription_ouverte: 0, inscriptions_count: 0 })
    );
  }
}

async function getById(id) {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*,
              (SELECT COUNT(*) FROM training_registrations r WHERE r.training_id = t.id) AS inscriptions_count
       FROM trainings t
       WHERE t.id = ?`,
      [id]
    );
    return normalizeTraining(rows[0] || null);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'ER_NO_SUCH_TABLE') throw err;
    try {
      const [rows] = await pool.execute('SELECT * FROM trainings WHERE id = ?', [id]);
      return normalizeTraining(
        rows[0] ? { ...rows[0], inscription_ouverte: 0, inscriptions_count: 0 } : null
      );
    } catch (err2) {
      throw err2;
    }
  }
}

async function countRegistrations(trainingId) {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS c FROM training_registrations WHERE training_id = ?',
      [trainingId]
    );
    return Number(rows[0]?.c) || 0;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return 0;
    throw err;
  }
}

async function create(data) {
  const payante = data.payante ? 1 : 0;
  const prix = payante && data.prix ? String(data.prix).trim() : null;
  const fifo = payante && data.fifo_paiement ? 1 : 0;
  const champs = serializeCustomFields(data);
  try {
    const [result] = await pool.execute(
      `INSERT INTO trainings
        (titre, description, date, formateur, niveau, lien, inscription_ouverte, payante, prix, fifo_paiement, champs_personnalises)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.titre,
        data.description,
        data.date,
        data.formateur || null,
        data.niveau || 'debutant',
        data.lien || null,
        data.inscription_ouverte ? 1 : 0,
        payante,
        prix,
        fifo,
        champs,
      ]
    );
    return getById(result.insertId);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      const [result] = await pool.execute(
        `INSERT INTO trainings
          (titre, description, date, formateur, niveau, lien, inscription_ouverte, payante, prix, champs_personnalises)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.titre,
          data.description,
          data.date,
          data.formateur || null,
          data.niveau || 'debutant',
          data.lien || null,
          data.inscription_ouverte ? 1 : 0,
          payante,
          prix,
          champs,
        ]
      );
      return getById(result.insertId);
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
      try {
        const [result] = await pool.execute(
          `INSERT INTO trainings
            (titre, description, date, formateur, niveau, lien, inscription_ouverte, payante, prix)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.titre,
            data.description,
            data.date,
            data.formateur || null,
            data.niveau || 'debutant',
            data.lien || null,
            data.inscription_ouverte ? 1 : 0,
            payante,
            prix,
          ]
        );
        return getById(result.insertId);
      } catch (err3) {
        if (err3.code !== 'ER_BAD_FIELD_ERROR') throw err3;
        try {
          const [result] = await pool.execute(
            `INSERT INTO trainings
              (titre, description, date, formateur, niveau, lien, inscription_ouverte)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              data.titre,
              data.description,
              data.date,
              data.formateur || null,
              data.niveau || 'debutant',
              data.lien || null,
              data.inscription_ouverte ? 1 : 0,
            ]
          );
          return getById(result.insertId);
        } catch (err4) {
          if (err4.code !== 'ER_BAD_FIELD_ERROR') throw err4;
          const [result] = await pool.execute(
            `INSERT INTO trainings (titre, description, date, formateur, niveau, lien)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              data.titre,
              data.description,
              data.date,
              data.formateur || null,
              data.niveau || 'debutant',
              data.lien || null,
            ]
          );
          return getById(result.insertId);
        }
      }
    }
  }
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;
  const open =
    data.inscription_ouverte !== undefined
      ? data.inscription_ouverte
        ? 1
        : 0
      : existing.inscription_ouverte
        ? 1
        : 0;
  const payante =
    data.payante !== undefined ? (data.payante ? 1 : 0) : existing.payante ? 1 : 0;
  const prixRaw = data.prix !== undefined ? data.prix : existing.prix;
  const prix = payante && prixRaw ? String(prixRaw).trim() : null;
  const fifo =
    payante &&
    (data.fifo_paiement !== undefined
      ? data.fifo_paiement
        ? 1
        : 0
      : existing.fifo_paiement
        ? 1
        : 0);
  const champs = serializeCustomFields({
    champs_personnalises:
      data.champs_personnalises !== undefined
        ? data.champs_personnalises
        : existing.champs_personnalises,
  });

  try {
    await pool.execute(
      `UPDATE trainings
       SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?,
           inscription_ouverte = ?, payante = ?, prix = ?, fifo_paiement = ?, champs_personnalises = ?
       WHERE id = ?`,
      [
        data.titre,
        data.description,
        data.date,
        data.formateur || null,
        data.niveau || 'debutant',
        data.lien || null,
        open,
        payante,
        prix,
        fifo,
        champs,
        id,
      ]
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    try {
      await pool.execute(
        `UPDATE trainings
         SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?,
             inscription_ouverte = ?, payante = ?, prix = ?, champs_personnalises = ?
         WHERE id = ?`,
        [
          data.titre,
          data.description,
          data.date,
          data.formateur || null,
          data.niveau || 'debutant',
          data.lien || null,
          open,
          payante,
          prix,
          champs,
          id,
        ]
      );
    } catch (err2) {
      if (err2.code !== 'ER_BAD_FIELD_ERROR') throw err2;
      try {
        await pool.execute(
          `UPDATE trainings
           SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?,
               inscription_ouverte = ?, payante = ?, prix = ?
           WHERE id = ?`,
          [
            data.titre,
            data.description,
            data.date,
            data.formateur || null,
            data.niveau || 'debutant',
            data.lien || null,
            open,
            payante,
            prix,
            id,
          ]
        );
      } catch (err3) {
        if (err3.code !== 'ER_BAD_FIELD_ERROR') throw err3;
        try {
          await pool.execute(
            `UPDATE trainings
             SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?,
                 inscription_ouverte = ?
             WHERE id = ?`,
            [
              data.titre,
              data.description,
              data.date,
              data.formateur || null,
              data.niveau || 'debutant',
              data.lien || null,
              open,
              id,
            ]
          );
        } catch (err4) {
          if (err4.code !== 'ER_BAD_FIELD_ERROR') throw err4;
          await pool.execute(
            `UPDATE trainings
             SET titre = ?, description = ?, date = ?, formateur = ?, niveau = ?, lien = ?
             WHERE id = ?`,
            [
              data.titre,
              data.description,
              data.date,
              data.formateur || null,
              data.niveau || 'debutant',
              data.lien || null,
              id,
            ]
          );
        }
      }
    }
  }
  return getById(id);
}

async function setInscriptionOpen(id, open) {
  try {
    const [result] = await pool.execute(
      `UPDATE trainings SET inscription_ouverte = ? WHERE id = ?`,
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
  const [result] = await pool.execute(`DELETE FROM trainings WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  setInscriptionOpen,
  remove,
  countRegistrations,
};
