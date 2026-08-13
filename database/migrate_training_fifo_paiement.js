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
  if (!(await hasColumn('trainings', 'fifo_paiement'))) {
    await pool.execute(
      `ALTER TABLE trainings
       ADD COLUMN fifo_paiement TINYINT(1) NOT NULL DEFAULT 0 AFTER prix`
    );
    console.log('Added trainings.fifo_paiement');
  } else {
    console.log('trainings.fifo_paiement already exists');
  }

  if (!(await hasColumn('training_registrations', 'paiement_valide_at'))) {
    await pool.execute(
      `ALTER TABLE training_registrations
       ADD COLUMN paiement_valide_at DATETIME NULL DEFAULT NULL AFTER paiement_valide`
    );
    console.log('Added training_registrations.paiement_valide_at');
  } else {
    console.log('training_registrations.paiement_valide_at already exists');
  }

  console.log('training fifo_paiement ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
