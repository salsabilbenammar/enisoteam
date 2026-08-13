const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

(async () => {
  try {
    if (!(await hasColumn('trainings', 'max_places'))) {
      await pool.query(
        `ALTER TABLE trainings
         ADD COLUMN max_places INT UNSIGNED NULL DEFAULT NULL AFTER prix`
      );
      console.log('Added trainings.max_places');
    } else {
      console.log('trainings.max_places already exists');
    }
    console.log('training max_places ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
