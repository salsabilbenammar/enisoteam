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
  if (!(await hasColumn('liste_finale'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN liste_finale JSON NULL AFTER places_max`
    );
    console.log('Added liste_finale');
  } else {
    console.log('liste_finale already exists');
  }

  if (!(await hasColumn('liste_finale_at'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN liste_finale_at DATETIME NULL AFTER liste_finale`
    );
    console.log('Added liste_finale_at');
  } else {
    console.log('liste_finale_at already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
