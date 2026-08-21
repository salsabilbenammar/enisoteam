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
  if (!(await hasColumn('deplacement_registrations', 'role_candidat'))) {
    await pool.execute(
      `ALTER TABLE deplacement_registrations
       ADD COLUMN role_candidat ENUM('spectateur', 'competiteur') NOT NULL DEFAULT 'spectateur'
       AFTER annee`
    );
    console.log('Added deplacement_registrations.role_candidat');
  } else {
    console.log('role_candidat already exists');
  }

  if (!(await hasColumn('deplacements', 'competition'))) {
    await pool.execute(
      `ALTER TABLE deplacements
       ADD COLUMN competition VARCHAR(200) NULL DEFAULT NULL
       AFTER destination`
    );
    console.log('Added deplacements.competition');
  } else {
    console.log('competition already exists');
  }

  console.log('deplacement role ready');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
