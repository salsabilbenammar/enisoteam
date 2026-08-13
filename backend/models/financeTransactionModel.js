const pool = require('../config/db');

const TYPES = ['depense', 'recette'];
const CATEGORIES = [
  'materiel',
  'evenement',
  'cotisation',
  'subvention',
  'transport',
  'communication',
  'formation',
  'autre',
];

const CATEGORY_LABELS = {
  materiel: 'Matériel',
  evenement: 'Événement',
  cotisation: 'Cotisation',
  subvention: 'Subvention',
  transport: 'Transport',
  communication: 'Communication',
  formation: 'Formation',
  autre: 'Autre',
};

async function addLog(transactionId, action, snapshot, adminNom) {
  await pool.execute(
    `INSERT INTO finance_transaction_logs (transaction_id, action, snapshot_json, admin_nom)
     VALUES (?, ?, ?, ?)`,
    [
      transactionId,
      action,
      snapshot ? JSON.stringify(snapshot) : null,
      adminNom || null,
    ]
  );
}

function snapshotOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    montant: Number(row.montant),
    categorie: row.categorie,
    date_transaction: row.date_transaction,
    description: row.description,
    justificatif_path: row.justificatif_path,
    member_payment_id: row.member_payment_id,
  };
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT * FROM finance_transactions WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function create(data, adminNom = null) {
  const [result] = await pool.execute(
    `INSERT INTO finance_transactions
      (type, montant, categorie, date_transaction, description, justificatif_path, member_payment_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.type,
      data.montant,
      data.categorie,
      data.date_transaction,
      data.description || null,
      data.justificatif_path || null,
      data.member_payment_id || null,
      adminNom || data.created_by || null,
    ]
  );
  const row = await findById(result.insertId);
  await addLog(row.id, 'create', snapshotOf(row), adminNom);
  return row;
}

async function update(id, data, adminNom = null) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.execute(
    `UPDATE finance_transactions
     SET type = ?, montant = ?, categorie = ?, date_transaction = ?,
         description = ?, justificatif_path = ?
     WHERE id = ?`,
    [
      data.type ?? existing.type,
      data.montant ?? existing.montant,
      data.categorie ?? existing.categorie,
      data.date_transaction ?? existing.date_transaction,
      data.description !== undefined ? data.description : existing.description,
      data.justificatif_path !== undefined
        ? data.justificatif_path
        : existing.justificatif_path,
      id,
    ]
  );
  const row = await findById(id);
  await addLog(id, 'update', { before: snapshotOf(existing), after: snapshotOf(row) }, adminNom);
  return row;
}

async function remove(id, adminNom = null) {
  const existing = await findById(id);
  if (!existing) return false;
  await addLog(id, 'delete', snapshotOf(existing), adminNom);
  const [result] = await pool.execute(`DELETE FROM finance_transactions WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function list({
  type = '',
  categorie = '',
  from = '',
  to = '',
  search = '',
  page = 1,
  limit = 30,
} = {}) {
  const where = [];
  const params = [];
  if (type && TYPES.includes(type)) {
    where.push('type = ?');
    params.push(type);
  }
  if (categorie) {
    where.push('categorie = ?');
    params.push(categorie);
  }
  if (from) {
    where.push('date_transaction >= ?');
    params.push(String(from).slice(0, 10));
  }
  if (to) {
    where.push('date_transaction <= ?');
    params.push(String(to).slice(0, 10));
  }
  if (search.trim()) {
    where.push('(description LIKE ? OR categorie LIKE ?)');
    const q = `%${search.trim()}%`;
    params.push(q, q);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * limit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM finance_transactions ${clause}`,
    params
  );
  const [sumRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'recette' THEN montant ELSE 0 END), 0) AS total_recettes,
       COALESCE(SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END), 0) AS total_depenses
     FROM finance_transactions ${clause}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT * FROM finance_transactions
     ${clause}
     ORDER BY date_transaction DESC, id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const totalRecettes = Number(sumRows[0].total_recettes);
  const totalDepenses = Number(sumRows[0].total_depenses);
  const total = Number(countRows[0].total);

  return {
    items: rows,
    total,
    page: Number(page),
    pages: Math.max(1, Math.ceil(total / limit)),
    total_recettes: totalRecettes,
    total_depenses: totalDepenses,
    solde: Math.round((totalRecettes - totalDepenses) * 100) / 100,
  };
}

async function getLogs(transactionId) {
  const [rows] = await pool.execute(
    `SELECT * FROM finance_transaction_logs
     WHERE transaction_id = ?
     ORDER BY created_at DESC`,
    [transactionId]
  );
  return rows;
}

async function reportSummary({ from, to }) {
  const where = [];
  const params = [];
  if (from) {
    where.push('date_transaction >= ?');
    params.push(String(from).slice(0, 10));
  }
  if (to) {
    where.push('date_transaction <= ?');
    params.push(String(to).slice(0, 10));
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [sumRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'recette' THEN montant ELSE 0 END), 0) AS total_recettes,
       COALESCE(SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END), 0) AS total_depenses,
       COUNT(*) AS tx_count
     FROM finance_transactions ${clause}`,
    params
  );

  const [byCat] = await pool.execute(
    `SELECT categorie,
            SUM(montant) AS total
     FROM finance_transactions
     ${clause ? `${clause} AND` : 'WHERE'} type = 'depense'
     GROUP BY categorie
     ORDER BY total DESC`,
    params
  );

  const [byMonth] = await pool.execute(
    `SELECT DATE_FORMAT(date_transaction, '%Y-%m') AS periode,
            SUM(CASE WHEN type = 'recette' THEN montant ELSE 0 END) AS recettes,
            SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END) AS depenses
     FROM finance_transactions
     ${clause}
     GROUP BY DATE_FORMAT(date_transaction, '%Y-%m')
     ORDER BY periode ASC`,
    params
  );

  const recettes = Number(sumRows[0].total_recettes);
  const depenses = Number(sumRows[0].total_depenses);

  return {
    from: from || null,
    to: to || null,
    total_recettes: recettes,
    total_depenses: depenses,
    solde: Math.round((recettes - depenses) * 100) / 100,
    tx_count: Number(sumRows[0].tx_count),
    depenses_par_categorie: byCat.map((r) => ({
      categorie: r.categorie,
      label: CATEGORY_LABELS[r.categorie] || r.categorie,
      total: Number(r.total),
    })),
    evolution: byMonth.map((r) => ({
      periode: r.periode,
      recettes: Number(r.recettes),
      depenses: Number(r.depenses),
      solde: Math.round((Number(r.recettes) - Number(r.depenses)) * 100) / 100,
    })),
  };
}

async function listForExport({ from, to, type = '' }) {
  const where = [];
  const params = [];
  if (from) {
    where.push('date_transaction >= ?');
    params.push(String(from).slice(0, 10));
  }
  if (to) {
    where.push('date_transaction <= ?');
    params.push(String(to).slice(0, 10));
  }
  if (type && TYPES.includes(type)) {
    where.push('type = ?');
    params.push(type);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT id, type, montant, categorie, date_transaction, description, created_by, created_at
     FROM finance_transactions
     ${clause}
     ORDER BY date_transaction ASC, id ASC`,
    params
  );
  return rows;
}

module.exports = {
  TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  findById,
  create,
  update,
  remove,
  list,
  getLogs,
  reportSummary,
  listForExport,
};
