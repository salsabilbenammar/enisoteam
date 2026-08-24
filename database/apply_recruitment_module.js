/**
 * Applique database/update_recruitment_module.sql sur la BDD de backend/.env
 * Usage: node database/apply_recruitment_module.js
 */
const fs = require('fs');
const path = require('path');
const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
const mysql = require(path.join(backendModules, 'mysql2', 'promise'));
require(path.join(backendModules, 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

async function main() {
  const sqlPath = path.join(__dirname, 'update_recruitment_module.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');
  sql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/USE\s+`?[^`;]+`?\s*;/gi, '')
    .replace(
      /`(\w*updated_at)`\s+TIMESTAMP\s+NOT NULL\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON UPDATE\s+CURRENT_TIMESTAMP/gi,
      '`$1` DATETIME NULL DEFAULT NULL'
    )
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return t && !t.startsWith('--');
    })
    .join('\n');

  const useSsl =
    String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DB_SSL || '') === '1';

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  await conn.query(sql);
  const [tables] = await conn.query("SHOW TABLES LIKE 'recruitment_%'");
  console.log(
    'OK:',
    tables.map((t) => Object.values(t)[0]).join(', ')
  );
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
