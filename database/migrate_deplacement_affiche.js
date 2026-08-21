const pool = require('../backend/config/db');

async function hasColumn(column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'deplacements'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('affiche_url'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN affiche_url VARCHAR(500) NULL AFTER competition`
    );
    console.log('Added affiche_url');
  } else {
    console.log('affiche_url already exists');
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
