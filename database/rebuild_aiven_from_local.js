/**
 * Aligne le schéma Aiven sur le local, puis synchronise les données.
 * Usage: node database/rebuild_aiven_from_local.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
const mysql = require(path.join(backendModules, 'mysql2', 'promise'));
require(path.join(backendModules, 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

const MYSQLDUMP = process.env.MYSQLDUMP_PATH || 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
const EXPORT_DIR = path.join(__dirname, '_export_hosting');

const KEEP_DATA_TABLES = new Set(['admins']); // ne pas écraser les comptes bureau seedés

function remoteCfg() {
  const useSsl =
    String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DB_SSL || '') === '1';
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

async function main() {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  const local = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eniso_team',
  });
  const [tableRows] = await local.query('SHOW TABLES');
  const key = Object.keys(tableRows[0])[0];
  const tables = tableRows
    .map((r) => r[key])
    .filter((t) => t !== 'recruitment_candidates_broken');
  await local.end();

  console.log(`Tables locales: ${tables.length}`);

  // 1) Structure complète
  const schemaFile = path.join(EXPORT_DIR, 'schema.sql');
  const schemaDump = spawnSync(
    MYSQLDUMP,
    [
      '-u',
      'root',
      '--no-data',
      '--skip-comments',
      '--skip-add-drop-table',
      '--compact',
      'eniso_team',
      ...tables,
    ],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  if (schemaDump.status !== 0) throw new Error(schemaDump.stderr || 'schema dump failed');
  fs.writeFileSync(schemaFile, schemaDump.stdout);

  // 2) Data (sauf admins)
  const dataTables = tables.filter((t) => !KEEP_DATA_TABLES.has(t));
  const dataFile = path.join(EXPORT_DIR, 'data.sql');
  const dataDump = spawnSync(
    MYSQLDUMP,
    [
      '-u',
      'root',
      '--no-create-info',
      '--skip-triggers',
      '--complete-insert',
      '--skip-add-locks',
      '--skip-disable-keys',
      '--skip-comments',
      '--compact',
      'eniso_team',
      ...dataTables,
    ],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  if (dataDump.status !== 0) throw new Error(dataDump.stderr || 'data dump failed');
  fs.writeFileSync(dataFile, dataDump.stdout);

  const remote = await mysql.createConnection(remoteCfg());
  await remote.query('SET FOREIGN_KEY_CHECKS=0');
  await remote.query("SET NAMES utf8mb4");

  console.log('Drop + recreate tables…');
  for (const t of [...tables].reverse()) {
    await remote.query(`DROP TABLE IF EXISTS \`${t}\``);
  }

  let schemaSql = schemaDump.stdout
    .replace(/^\uFEFF/, '')
    .replace(/\/\*!40101 SET[^;]+;/g, '')
    .replace(/\/\*![\s\S]*?\*\//g, '');

  // Recreate CREATE TABLE statements one by one for clearer errors
  const creates = schemaSql
    .split(/;(?=\s*CREATE\s+TABLE)/i)
    .map((s) => s.trim())
    .filter((s) => /^CREATE\s+TABLE/i.test(s));

  for (const stmt of creates) {
    try {
      await remote.query(stmt);
    } catch (err) {
      console.warn(`CREATE fail: ${err.message.slice(0, 160)}`);
      console.warn(stmt.slice(0, 120));
    }
  }

  // Ensure admins exists even if create order weird — restore from seed if needed
  const [adminTables] = await remote.query("SHOW TABLES LIKE 'admins'");
  if (!adminTables.length) {
    throw new Error('Table admins absente après recreate');
  }

  console.log('Import data…');
  let dataSql = dataDump.stdout.replace(/^\uFEFF/, '');
  const inserts = dataSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /^INSERT\s+INTO/i.test(s));

  let ok = 0;
  let fail = 0;
  for (const stmt of inserts) {
    try {
      await remote.query(stmt);
      ok += 1;
    } catch (err) {
      fail += 1;
      console.warn(`INSERT fail: ${err.message.slice(0, 160)}`);
    }
  }

  await remote.query('SET FOREIGN_KEY_CHECKS=1');

  // Re-seed bureau accounts (admins was dropped)
  await remote.end();
  console.log('Re-seed bureau accounts…');
  const seed = spawnSync(process.execPath, [path.join(__dirname, 'seed_bureau_accounts.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });

  console.log(`\nDone. creates=${creates.length} inserts_ok=${ok} inserts_fail=${fail} seed=${seed.status}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
