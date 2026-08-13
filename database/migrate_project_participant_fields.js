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
      'telephone',
      'ALTER TABLE project_form_participants ADD COLUMN telephone VARCHAR(40) DEFAULT NULL AFTER email'
    );
    await addColumn(
      'project_form_participants',
      'filiere',
      'ALTER TABLE project_form_participants ADD COLUMN filiere VARCHAR(120) DEFAULT NULL AFTER telephone'
    );
    await addColumn(
      'project_assignment_members',
      'telephone',
      'ALTER TABLE project_assignment_members ADD COLUMN telephone VARCHAR(40) DEFAULT NULL AFTER email'
    );
    await addColumn(
      'project_assignment_members',
      'filiere',
      'ALTER TABLE project_assignment_members ADD COLUMN filiere VARCHAR(120) DEFAULT NULL AFTER telephone'
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
