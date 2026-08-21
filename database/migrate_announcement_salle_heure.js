const pool = require('../backend/config/db');

async function hasColumn(column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'announcements'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [column]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await hasColumn('salle'))) {
    await pool.execute(
      `ALTER TABLE announcements
       ADD COLUMN salle VARCHAR(200) NULL AFTER date_publication`
    );
    console.log('Added salle');
  } else {
    console.log('salle already exists');
  }

  if (!(await hasColumn('heure'))) {
    await pool.execute(
      `ALTER TABLE announcements
       ADD COLUMN heure VARCHAR(20) NULL AFTER salle`
    );
    console.log('Added heure');
  } else {
    console.log('heure already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
