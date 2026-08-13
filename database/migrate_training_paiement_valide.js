const pool = require('../backend/config/db');

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('training_registrations', 'paiement_valide'))) {
    await pool.execute(
      `ALTER TABLE training_registrations
       ADD COLUMN paiement_valide TINYINT(1) NOT NULL DEFAULT 0 AFTER accepte_paiement`
    );
    console.log('Added training_registrations.paiement_valide');
  } else {
    console.log('training_registrations.paiement_valide already exists');
  }
  console.log('training paiement_valide ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
