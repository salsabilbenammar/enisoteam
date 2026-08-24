/**
 * Synchronise le contenu local (XAMPP eniso_team) vers Aiven (backend/.env).
 * - Crée les tables manquantes via scripts migrate / SQL
 * - Remplace les données des tables listées
 *
 * Usage: node database/sync_local_to_aiven.js
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
const EXPORT_FILE = path.join(EXPORT_DIR, 'full_content.sql');

const SKIP_TABLES = new Set([
  'recruitment_candidates_broken',
  // comptes bureau déjà seedés — on les garde côté Aiven
  'admins',
]);

const PRE_MIGRATE = [
  'migrate_finance_cotisation_types.js',
  'migrate_finance_cotisation_offers.js',
  'migrate_merit_auto.js',
  'migrate_training_image.js',
  'migrate_training_max_places.js',
  'migrate_training_fifo_paiement.js',
  'migrate_training_paiement_valide.js',
  'migrate_event_payant.js',
  'migrate_event_liste_finale.js',
  'migrate_deplacement_affiche.js',
  'migrate_deplacement_date.js',
  'migrate_deplacement_liste_finale.js',
  'migrate_deplacement_competiteur.js',
  'migrate_announcement_salle_heure.js',
];

const EXTRA_SQL_FILES = ['update_activity_inscriptions.sql'];

function runNode(script) {
  const file = path.join(__dirname, script);
  if (!fs.existsSync(file)) {
    console.log(`skip missing ${script}`);
    return true;
  }
  console.log(`── ${script}`);
  const r = spawnSync(process.execPath, [file], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  return r.status === 0;
}

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

async function applySqlFile(conn, filePath) {
  let sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  sql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/USE\s+`?[^`;]+`?\s*;/gi, '')
    .replace(
      /`(\w*updated_at)`\s+TIMESTAMP\s+NOT NULL\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON UPDATE\s+CURRENT_TIMESTAMP/gi,
      '`$1` DATETIME NULL DEFAULT NULL'
    );
  const parts = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || s.startsWith('--')) return false;
      return /^(CREATE|ALTER|INSERT|UPDATE|DELETE|SET|DROP)\b/i.test(s);
    });
  for (const stmt of parts) {
    try {
      await conn.query(stmt);
    } catch (err) {
      // ignore already-exists / duplicate column
      if (!/exists|Duplicate|check that.+exists/i.test(err.message)) {
        console.warn(`  warn: ${err.message.slice(0, 120)}`);
      }
    }
  }
}

async function listLocalTables(conn) {
  const [rows] = await conn.query('SHOW TABLES');
  const key = Object.keys(rows[0])[0];
  return rows.map((r) => r[key]).filter((t) => !SKIP_TABLES.has(t));
}

async function main() {
  console.log('1) Migrations / schéma manquant…');
  for (const m of PRE_MIGRATE) runNode(m);

  const remote = await mysql.createConnection(remoteCfg());
  for (const f of EXTRA_SQL_FILES) {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) {
      console.log(`── SQL ${f}`);
      await applySqlFile(remote, p);
    }
  }

  console.log('2) Dump local…');
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const local = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eniso_team',
  });
  const tables = await listLocalTables(local);
  await local.end();

  if (!fs.existsSync(MYSQLDUMP)) {
    throw new Error(`mysqldump introuvable: ${MYSQLDUMP}`);
  }

  const dumpArgs = [
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
    ...tables,
  ];
  const dump = spawnSync(MYSQLDUMP, dumpArgs, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (dump.status !== 0) {
    throw new Error(dump.stderr || 'mysqldump failed');
  }
  fs.writeFileSync(EXPORT_FILE, dump.stdout, 'utf8');
  console.log(`Dump OK (${tables.length} tables, ${dump.stdout.length} bytes)`);

  console.log('3) Import Aiven…');
  let sql = dump.stdout.replace(/^\uFEFF/, '');
  sql = sql
    .replace(/\/\*![\s\S]*?\*\//g, '')
    .replace(/LOCK TABLES[^;]*;/gi, '')
    .replace(/UNLOCK TABLES;?/gi, '');

  const inserts = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /^INSERT\s+INTO/i.test(s));

  // ordre de vidage (enfants d'abord)
  const deleteOrder = [...tables].reverse();
  await remote.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of deleteOrder) {
    if (SKIP_TABLES.has(t)) continue;
    try {
      await remote.query(`DELETE FROM \`${t}\``);
    } catch (err) {
      console.warn(`  skip delete ${t}: ${err.message.slice(0, 80)}`);
    }
  }

  let ok = 0;
  let fail = 0;
  for (const stmt of inserts) {
    try {
      await remote.query(stmt);
      ok += 1;
    } catch (err) {
      fail += 1;
      console.warn(`  insert fail: ${err.message.slice(0, 140)}`);
    }
  }
  await remote.query('SET FOREIGN_KEY_CHECKS=1');

  // counts spot-check
  const checks = [
    'gallery',
    'project_catalog',
    'project_assignments',
    'board_members',
    'events',
    'announcements',
    'trainings',
    'members',
    'deplacements',
    'materiels',
  ];
  console.log('\nCounts Aiven:');
  for (const t of checks) {
    try {
      const [rows] = await remote.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      console.log(`  ${t}=${rows[0].n}`);
    } catch {
      console.log(`  ${t}=ABSENT`);
    }
  }

  await remote.end();
  console.log(`\nDone. inserts_ok=${ok} inserts_fail=${fail}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
