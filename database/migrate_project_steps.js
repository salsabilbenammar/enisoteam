const path = require('path');
const fs = require('fs');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

const sqlPath = path.join(__dirname, 'update_projects_steps.sql');

(async () => {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) =>
        s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim()
      )
      .filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
      console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '…');
    }
    console.log('project_steps + project_assignment_step_status ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
