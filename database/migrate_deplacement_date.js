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

async function hasIndex(table, indexName) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function main() {
  if ((await hasColumn('deplacements', 'date_depart')) && !(await hasColumn('deplacements', 'date_competition'))) {
    if (await hasIndex('deplacements', 'idx_deplacements_date')) {
      await pool.execute(`ALTER TABLE deplacements DROP INDEX idx_deplacements_date`);
    }
    await pool.execute(
      `ALTER TABLE deplacements
       CHANGE COLUMN date_depart date_competition DATE NULL DEFAULT NULL`
    );
    console.log('Renamed date_depart → date_competition');
  } else if (!(await hasColumn('deplacements', 'date_competition'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN date_competition DATE NULL DEFAULT NULL
       AFTER competition`
    );
    console.log('Added date_competition');
  } else {
    console.log('date_competition already exists');
  }

  if (await hasColumn('deplacements', 'date_retour')) {
    await pool.execute(`ALTER TABLE deplacements DROP COLUMN date_retour`);
    console.log('Dropped date_retour');
  } else {
    console.log('date_retour already removed');
  }

  if (await hasColumn('deplacements', 'date_depart')) {
    await pool.execute(
      `UPDATE deplacements
       SET date_competition = COALESCE(date_competition, date_depart)
       WHERE date_competition IS NULL AND date_depart IS NOT NULL`
    );
    await pool.execute(`ALTER TABLE deplacements DROP COLUMN date_depart`);
    console.log('Migrated and dropped date_depart');
  }

  if (!(await hasIndex('deplacements', 'idx_deplacements_date'))) {
    await pool.execute(
      `ALTER TABLE deplacements ADD KEY idx_deplacements_date (date_competition)`
    );
    console.log('Added idx_deplacements_date on date_competition');
  }

  console.log('competition date ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
