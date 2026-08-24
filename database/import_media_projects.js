/**
 * Importe database/_export_hosting/media_projects.sql vers la BDD de backend/.env
 * Usage: node database/import_media_projects.js
 */
const fs = require('fs');
const path = require('path');
const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
const mysql = require(path.join(backendModules, 'mysql2', 'promise'));
require(path.join(backendModules, 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

async function main() {
  const sqlPath = path.join(__dirname, '_export_hosting', 'media_projects.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Fichier introuvable: ${sqlPath}`);
  }

  let sql = fs.readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');
  sql = sql
    .replace(/\/\*![\s\S]*?\*\//g, '')
    .replace(/LOCK TABLES[^;]*;/gi, '')
    .replace(/UNLOCK TABLES;?/gi, '')
    .replace(/ALTER TABLE[^;]*DISABLE KEYS;?/gi, '')
    .replace(/ALTER TABLE[^;]*ENABLE KEYS;?/gi, '');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !s.startsWith('--') &&
        /^INSERT\s+/i.test(s) &&
        !/INSERT\s+INTO\s+`?project_form_settings`?/i.test(s)
    );

  if (!statements.length) {
    throw new Error('Aucun INSERT trouvé dans le dump.');
  }

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

  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  for (const table of [
    'project_assignment_step_status',
    'project_assignment_members',
    'project_assignments',
    'project_steps',
    'project_catalog',
    'gallery',
  ]) {
    await conn.query(`DELETE FROM \`${table}\``);
  }

  for (const stmt of statements) {
    await conn.query(stmt);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS=1');

  const [[g]] = await conn.query('SELECT COUNT(*) AS n FROM gallery');
  const [[p]] = await conn.query('SELECT COUNT(*) AS n FROM project_catalog');
  const [[a]] = await conn.query(
    'SELECT COUNT(*) AS n FROM project_assignments WHERE published_at IS NOT NULL OR progress >= 100'
  );
  console.log(`OK inserts=${statements.length} gallery=${g.n} catalog=${p.n} published=${a.n}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
