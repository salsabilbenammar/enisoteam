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
    if (!(await hasColumn('project_assignments', 'published_at'))) {
      await pool.query(
        `ALTER TABLE project_assignments
         ADD COLUMN published_at TIMESTAMP NULL DEFAULT NULL AFTER progress`
      );
      console.log('Added published_at');
    } else {
      console.log('published_at already exists');
    }
    // Publier rétroactivement les groupes déjà à 100%
    const [r] = await pool.query(
      `UPDATE project_assignments
       SET published_at = COALESCE(published_at, NOW())
       WHERE progress >= 100 AND published_at IS NULL`
    );
    console.log('Backfilled published rows:', r.affectedRows);
    console.log('project publish ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
