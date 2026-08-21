const pool = require('../backend/config/db');

async function tableExists(table) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await tableExists('merit_entries'))) {
    await pool.execute(`
      CREATE TABLE \`merit_entries\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`member_id\` INT UNSIGNED NOT NULL,
        \`points\` INT NOT NULL,
        \`motif\` VARCHAR(500) NOT NULL,
        \`action_code\` VARCHAR(64) DEFAULT NULL,
        \`source_type\` VARCHAR(40) DEFAULT 'manual',
        \`source_id\` INT UNSIGNED DEFAULT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_merit_member\` (\`member_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created merit_entries');
  }

  if (!(await columnExists('merit_entries', 'action_code'))) {
    await pool.execute(
      `ALTER TABLE merit_entries ADD COLUMN action_code VARCHAR(64) DEFAULT NULL AFTER motif`
    );
    console.log('Added merit_entries.action_code');
  }
  if (!(await columnExists('merit_entries', 'source_type'))) {
    await pool.execute(
      `ALTER TABLE merit_entries ADD COLUMN source_type VARCHAR(40) DEFAULT 'manual' AFTER action_code`
    );
    console.log('Added merit_entries.source_type');
  }
  if (!(await columnExists('merit_entries', 'source_id'))) {
    await pool.execute(
      `ALTER TABLE merit_entries ADD COLUMN source_id INT UNSIGNED DEFAULT NULL AFTER source_type`
    );
    console.log('Added merit_entries.source_id');
  }
  if (!(await indexExists('merit_entries', 'uq_merit_auto_source'))) {
    await pool.execute(
      `ALTER TABLE merit_entries
       ADD UNIQUE KEY uq_merit_auto_source (member_id, action_code, source_type, source_id)`
    );
    console.log('Added uq_merit_auto_source');
  }

  if (await tableExists('attendance_entries')) {
    if (!(await columnExists('attendance_entries', 'member_id'))) {
      await pool.execute(
        `ALTER TABLE attendance_entries ADD COLUMN member_id INT UNSIGNED DEFAULT NULL AFTER nom`
      );
      console.log('Added attendance_entries.member_id');
    }
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
