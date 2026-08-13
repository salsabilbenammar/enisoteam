const pool = require('../config/db');

const DEFAULT_TYPES = [
  { code: 'recrutement', label: 'Cotisation recrutement', montant_defaut: 30, sort_order: 1 },
  { code: 'formation', label: 'Cotisation formation payante', montant_defaut: 0, sort_order: 2 },
  { code: 'deplacement', label: 'Cotisation car / déplacement', montant_defaut: 0, sort_order: 3 },
  { code: 'pull', label: 'Cotisation pull de club', montant_defaut: 0, sort_order: 4 },
  { code: 'robot', label: 'Cotisation robot', montant_defaut: 0, sort_order: 5 },
  { code: 'evenement', label: 'Cotisation événement', montant_defaut: 0, sort_order: 6 },
];

function normalize(row) {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    montant_defaut: Number(row.montant_defaut || 0),
    actif: Number(row.actif) === 1,
    sort_order: Number(row.sort_order || 0),
  };
}

async function list({ activeOnly = false } = {}) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM finance_cotisation_types
       ${activeOnly ? 'WHERE actif = 1' : ''}
       ORDER BY sort_order ASC, label ASC`
    );
    if (rows.length) return rows.map(normalize);
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
  return DEFAULT_TYPES.map((t, i) => ({
    id: i + 1,
    ...t,
    actif: true,
  }));
}

async function findByCode(code) {
  const types = await list();
  return types.find((t) => t.code === String(code || '').trim()) || null;
}

async function getMap() {
  const types = await list();
  return Object.fromEntries(types.map((t) => [t.code, t]));
}

async function updateType(code, data = {}) {
  const existing = await findByCode(code);
  if (!existing) return null;
  await pool.execute(
    `UPDATE finance_cotisation_types
     SET label = ?, montant_defaut = ?, actif = ?, sort_order = ?
     WHERE code = ?`,
    [
      data.label ?? existing.label,
      Number(data.montant_defaut ?? existing.montant_defaut),
      data.actif === false || data.actif === 0 || data.actif === '0' ? 0 : 1,
      Number(data.sort_order ?? existing.sort_order),
      code,
    ]
  );
  return findByCode(code);
}

async function upsertMany(items = []) {
  for (const item of items) {
    if (!item?.code) continue;
    await pool.execute(
      `INSERT INTO finance_cotisation_types (code, label, montant_defaut, actif, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         label = VALUES(label),
         montant_defaut = VALUES(montant_defaut),
         actif = VALUES(actif),
         sort_order = VALUES(sort_order)`,
      [
        String(item.code).trim(),
        String(item.label || item.code).trim(),
        Number(item.montant_defaut || 0),
        item.actif === false || item.actif === 0 || item.actif === '0' ? 0 : 1,
        Number(item.sort_order || 0),
      ]
    );
  }
  return list();
}

module.exports = {
  DEFAULT_TYPES,
  list,
  findByCode,
  getMap,
  updateType,
  upsertMany,
};
