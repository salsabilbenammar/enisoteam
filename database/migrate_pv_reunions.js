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
  if (!(await tableExists('pv_reunions'))) {
    await pool.execute(`
      CREATE TABLE \`pv_reunions\` (
        \`id\`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`titre\`        VARCHAR(200) NOT NULL,
        \`date_reunion\` DATE NOT NULL,
        \`contenu\`      TEXT,
        \`fichier\`      VARCHAR(255) DEFAULT NULL,
        \`created_at\`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_pv_date\` (\`date_reunion\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created pv_reunions');
  } else {
    console.log('pv_reunions already exists');
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
