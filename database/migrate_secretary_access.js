const pool = require('../backend/config/db');

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function main() {
  if (!await hasColumn('admins', 'role')) {
    await pool.execute(
      `ALTER TABLE admins
       ADD COLUMN role ENUM('admin', 'secretaire') NOT NULL DEFAULT 'admin'
       AFTER password_hash`
    );
    console.log('Added admins.role');
  } else {
    console.log('admins.role already exists');
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
