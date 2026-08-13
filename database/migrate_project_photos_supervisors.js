const pool = require('../backend/config/db');

async function hasColumn(table, column) {
  const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`);
  return cols.length > 0;
}

async function addColumn(table, column, ddl) {
  if (await hasColumn(table, column)) {
    console.log(`${table}.${column} already exists`);
    return;
  }
  await pool.query(ddl);
  console.log(`${table}.${column} added`);
}

(async () => {
  try {
    await addColumn(
      'project_form_participants',
      'photo',
      'ALTER TABLE project_form_participants ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER filiere'
    );
    await addColumn(
      'project_assignment_members',
      'photo',
      'ALTER TABLE project_assignment_members ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER filiere'
    );
    // Superviseurs : texte JSON (plusieurs noms)
    await pool.query(
      'ALTER TABLE project_assignments MODIFY COLUMN supervisors TEXT NOT NULL'
    );
    console.log('project_assignments.supervisors -> TEXT');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
