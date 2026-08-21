const pool = require('../backend/config/db');

async function tableExists(table) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function main() {
  if (!(await tableExists('attendance_sessions'))) {
    await pool.execute(`
      CREATE TABLE \`attendance_sessions\` (
        \`id\`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`type\`         ENUM('reunion','assemblee_generale','formation') NOT NULL DEFAULT 'reunion',
        \`titre\`        VARCHAR(200) NOT NULL,
        \`date_seance\`  DATE DEFAULT NULL,
        \`heure\`        VARCHAR(10) DEFAULT NULL,
        \`lieu\`         VARCHAR(200) DEFAULT NULL,
        \`ouverte\`      TINYINT(1) NOT NULL DEFAULT 1,
        \`public_token\` VARCHAR(64) NOT NULL,
        \`created_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_attendance_token\` (\`public_token\`),
        KEY \`idx_attendance_date\` (\`date_seance\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created attendance_sessions');
  } else {
    console.log('attendance_sessions already exists');
  }

  if (!(await tableExists('attendance_entries'))) {
    await pool.execute(`
      CREATE TABLE \`attendance_entries\` (
        \`id\`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`session_id\`   INT UNSIGNED NOT NULL,
        \`prenom\`       VARCHAR(120) NOT NULL,
        \`nom\`          VARCHAR(120) NOT NULL,
        \`created_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_attendance_session\` (\`session_id\`),
        CONSTRAINT \`fk_attendance_entries_session\`
          FOREIGN KEY (\`session_id\`) REFERENCES \`attendance_sessions\` (\`id\`)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created attendance_entries');
  } else {
    console.log('attendance_entries already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
