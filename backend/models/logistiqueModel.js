const pool = require('../config/db');

const ETATS = ['disponible', 'emprunte', 'en_reparation', 'hors_service'];

function cleanOptional(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeQty(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function syncMaterielStock(conn, materielId) {
  const [rows] = await conn.execute(
    `SELECT m.id, m.quantite_totale, m.etat,
            COALESCE((
              SELECT SUM(e.quantite)
              FROM materiel_emprunts e
              WHERE e.materiel_id = m.id AND e.statut = 'en_cours'
            ), 0) AS emprunte
     FROM materiels m
     WHERE m.id = ?
     FOR UPDATE`,
    [materielId]
  );
  const m = rows[0];
  if (!m) return null;

  const total = Number(m.quantite_totale) || 0;
  const emprunte = Number(m.emprunte) || 0;
  const dispo = Math.max(0, total - emprunte);

  let etat = m.etat;
  if (etat !== 'en_reparation' && etat !== 'hors_service') {
    etat = dispo <= 0 ? 'emprunte' : 'disponible';
  }

  await conn.execute(
    `UPDATE materiels SET quantite_disponible = ?, etat = ? WHERE id = ?`,
    [dispo, etat, materielId]
  );
  return { ...m, quantite_disponible: dispo, etat, emprunte };
}

async function getAll({ search = '', etat = '', categorie = '' } = {}) {
  const where = [];
  const params = [];
  if (search.trim()) {
    where.push('(m.nom LIKE ? OR m.categorie LIKE ? OR m.emplacement LIKE ? OR m.responsable LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }
  if (etat === 'disponible') {
    where.push(
      "(m.quantite_disponible > 0 AND m.etat NOT IN ('en_reparation', 'hors_service'))"
    );
  } else if (etat === 'emprunte') {
    where.push(`(
      m.etat = 'emprunte'
      OR EXISTS (
        SELECT 1 FROM materiel_emprunts e
        WHERE e.materiel_id = m.id AND e.statut = 'en_cours'
      )
    )`);
  } else if (etat && ETATS.includes(etat)) {
    where.push('m.etat = ?');
    params.push(etat);
  }
  if (categorie.trim()) {
    where.push('m.categorie = ?');
    params.push(categorie.trim());
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT m.*,
            COALESCE((
              SELECT SUM(e.quantite)
              FROM materiel_emprunts e
              WHERE e.materiel_id = m.id AND e.statut = 'en_cours'
            ), 0) AS emprunts_en_cours
     FROM materiels m
     ${clause}
     ORDER BY m.nom ASC, m.id ASC`,
    params
  );
  return rows.map((r) => {
    const emprunts = Number(r.emprunts_en_cours) || 0;
    const dispo = Number(r.quantite_disponible) || 0;
    let etat = r.etat;
    if (etat !== 'en_reparation' && etat !== 'hors_service') {
      if (dispo <= 0 && emprunts > 0) etat = 'emprunte';
      else if (dispo > 0) etat = 'disponible';
    }
    return { ...r, emprunts_en_cours: emprunts, etat };
  });
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM materiels WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create(data) {
  const total = normalizeQty(data.quantite_totale, 1);
  // À la création, tout le stock est disponible sauf si un dispo explicite est fourni
  const hasExplicitDispo =
    data.quantite_disponible !== undefined &&
    data.quantite_disponible !== null &&
    String(data.quantite_disponible).trim() !== '';
  let dispo = hasExplicitDispo ? normalizeQty(data.quantite_disponible, total) : total;
  if (dispo > total) dispo = total;
  const etat = ETATS.includes(data.etat) ? data.etat : 'disponible';

  const [result] = await pool.execute(
    `INSERT INTO materiels
      (nom, categorie, description, quantite_totale, quantite_disponible,
       etat, emplacement, responsable, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(data.nom).trim(),
      cleanOptional(data.categorie),
      cleanOptional(data.description),
      total,
      dispo,
      etat,
      cleanOptional(data.emplacement),
      cleanOptional(data.responsable),
      cleanOptional(data.notes),
    ]
  );
  return getById(result.insertId);
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) return null;

  const total = normalizeQty(data.quantite_totale, existing.quantite_totale);
  const etat = ETATS.includes(data.etat) ? data.etat : existing.etat;

  await pool.execute(
    `UPDATE materiels
     SET nom = ?, categorie = ?, description = ?, quantite_totale = ?,
         etat = ?, emplacement = ?, responsable = ?, notes = ?
     WHERE id = ?`,
    [
      String(data.nom).trim(),
      cleanOptional(data.categorie),
      cleanOptional(data.description),
      total,
      etat,
      cleanOptional(data.emplacement),
      cleanOptional(data.responsable),
      cleanOptional(data.notes),
      id,
    ]
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await syncMaterielStock(conn, id);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM materiels WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function getEmpruntById(id) {
  const [rows] = await pool.execute(
    `SELECT e.*, m.nom AS materiel_nom, m.categorie AS materiel_categorie
     FROM materiel_emprunts e
     JOIN materiels m ON m.id = e.materiel_id
     WHERE e.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listEmprunts({ statut = '', materiel_id = '', search = '' } = {}) {
  const where = [];
  const params = [];
  if (statut === 'en_cours' || statut === 'retourne') {
    where.push('e.statut = ?');
    params.push(statut);
  }
  if (materiel_id) {
    where.push('e.materiel_id = ?');
    params.push(Number(materiel_id));
  }
  if (search.trim()) {
    where.push(
      '(e.emprunteur_nom LIKE ? OR e.emprunteur_email LIKE ? OR m.nom LIKE ?)'
    );
    const q = `%${search.trim()}%`;
    params.push(q, q, q);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT e.*, m.nom AS materiel_nom, m.categorie AS materiel_categorie
     FROM materiel_emprunts e
     JOIN materiels m ON m.id = e.materiel_id
     ${clause}
     ORDER BY
       CASE WHEN e.statut = 'en_cours' THEN 0 ELSE 1 END,
       e.date_emprunt DESC,
       e.id DESC`,
    params
  );
  return rows;
}

async function createEmprunt(data) {
  const materielId = Number(data.materiel_id);
  const quantite = normalizeQty(data.quantite, 1);
  const nom = String(data.emprunteur_nom || '').trim();
  if (!materielId) {
    const err = new Error('Matériel requis.');
    err.status = 400;
    throw err;
  }
  if (!nom) {
    const err = new Error('Nom de l’emprunteur requis.');
    err.status = 400;
    throw err;
  }
  if (quantite < 1) {
    const err = new Error('Quantité invalide.');
    err.status = 400;
    throw err;
  }

  const dateEmprunt = String(data.date_emprunt || todayKey()).slice(0, 10);
  const dateRetourPrevue = data.date_retour_prevue
    ? String(data.date_retour_prevue).slice(0, 10)
    : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [matRows] = await conn.execute(
      `SELECT * FROM materiels WHERE id = ? FOR UPDATE`,
      [materielId]
    );
    const materiel = matRows[0];
    if (!materiel) {
      const err = new Error('Matériel introuvable.');
      err.status = 404;
      throw err;
    }
    if (materiel.etat === 'hors_service' || materiel.etat === 'en_reparation') {
      const err = new Error('Ce matériel n’est pas empruntable actuellement.');
      err.status = 400;
      throw err;
    }

    const dispo = Number(materiel.quantite_disponible) || 0;
    if (quantite > dispo) {
      const err = new Error(
        `Stock insuffisant (${dispo} disponible${dispo > 1 ? 's' : ''}).`
      );
      err.status = 400;
      throw err;
    }

    const [result] = await conn.execute(
      `INSERT INTO materiel_emprunts
        (materiel_id, emprunteur_nom, emprunteur_email, emprunteur_telephone,
         quantite, date_emprunt, date_retour_prevue, notes, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_cours')`,
      [
        materielId,
        nom,
        cleanOptional(data.emprunteur_email),
        cleanOptional(data.emprunteur_telephone),
        quantite,
        dateEmprunt,
        dateRetourPrevue,
        cleanOptional(data.notes),
      ]
    );

    await syncMaterielStock(conn, materielId);
    await conn.commit();
    return getEmpruntById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function returnEmprunt(id, { date_retour_effectif, notes } = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM materiel_emprunts WHERE id = ? FOR UPDATE`,
      [id]
    );
    const emprunt = rows[0];
    if (!emprunt) {
      const err = new Error('Emprunt introuvable.');
      err.status = 404;
      throw err;
    }
    if (emprunt.statut === 'retourne') {
      const err = new Error('Cet emprunt est déjà retourné.');
      err.status = 400;
      throw err;
    }

    const dateRetour = String(date_retour_effectif || todayKey()).slice(0, 10);
    await conn.execute(
      `UPDATE materiel_emprunts
       SET statut = 'retourne',
           date_retour_effectif = ?,
           notes = COALESCE(?, notes)
       WHERE id = ?`,
      [dateRetour, cleanOptional(notes), id]
    );

    await syncMaterielStock(conn, emprunt.materiel_id);
    await conn.commit();
    return getEmpruntById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  ETATS,
  getAll,
  getById,
  create,
  update,
  remove,
  listEmprunts,
  getEmpruntById,
  createEmprunt,
  returnEmprunt,
};
