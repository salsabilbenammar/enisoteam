const pool = require('../backend/config/db');

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1
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
  if (!(await hasColumn('deplacements', 'champs_competiteur'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN champs_competiteur JSON NULL DEFAULT NULL
       AFTER champs_personnalises`
    );
    console.log('Added deplacements.champs_competiteur');
  } else {
    console.log('champs_competiteur already exists');
  }

  console.log('competitor fields ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
