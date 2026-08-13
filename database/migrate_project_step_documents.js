const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

async function tryAlter(sql, okMsg) {
  try {
    await pool.query(sql);
    console.log(okMsg);
  } catch (e) {
    if (e && (e.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(e.message))) {
      console.log('already exists:', okMsg);
      return;
    }
    throw e;
  }
}

(async () => {
  try {
    await tryAlter(
      `ALTER TABLE project_steps
       ADD COLUMN requires_document TINYINT(1) NOT NULL DEFAULT 0 AFTER ordre`,
      'Added project_steps.requires_document'
    );
    await tryAlter(
      `ALTER TABLE project_assignment_step_status
       ADD COLUMN document_path VARCHAR(255) DEFAULT NULL AFTER submitted_by_member_id`,
      'Added document_path'
    );
    await tryAlter(
      `ALTER TABLE project_assignment_step_status
       ADD COLUMN document_name VARCHAR(255) DEFAULT NULL AFTER document_path`,
      'Added document_name'
    );
    console.log('project step documents ready');
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
