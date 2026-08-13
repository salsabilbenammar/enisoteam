const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

(async () => {
  try {
    const [cols] = await pool.query(
      "SHOW COLUMNS FROM project_assignments LIKE 'progress'"
    );
    if (cols.length) {
      console.log('project_assignments.progress already exists');
    } else {
      await pool.query(
        `ALTER TABLE project_assignments
         ADD COLUMN progress TINYINT UNSIGNED NOT NULL DEFAULT 0
         AFTER label`
      );
      console.log('project_assignments.progress added (default 0)');
    }
    await pool.query(
      'UPDATE project_assignments SET progress = 0 WHERE progress IS NULL OR progress < 0'
    );
    console.log('existing rows normalized to >= 0');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
