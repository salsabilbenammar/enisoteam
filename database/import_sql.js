/**
 * Importe database/eniso_team.sql via Node (pas besoin du client mysql).
 * Prérequis : backend/.env avec DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 *
 *   node database/import_sql.js
 */
const fs = require('fs');
const path = require('path');

const backendModules = path.join(__dirname, '..', 'backend', 'node_modules');
const mysql = require(path.join(backendModules, 'mysql2', 'promise'));
require(path.join(backendModules, 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

async function main() {
  const sqlPath = path.join(__dirname, 'eniso_team.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Fichier introuvable: ${sqlPath}`);
  }

  const envPath = path.join(__dirname, '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(
      'Crée backend/.env (copie deploy/nocard/env.backend.example) avec les infos db4free.'
    );
  }

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'eniso_team';
  const port = Number(process.env.DB_PORT) || 3306;

  if (!password || user === 'CHANGEZ_MOI' || database === 'CHANGEZ_MOI') {
    throw new Error('Remplis DB_USER, DB_PASSWORD et DB_NAME dans backend/.env');
  }

  console.log(`Connexion à ${user}@${host}:${port} / ${database} ...`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  const raw = fs.readFileSync(sqlPath, 'utf8');
  // FreeSQL / MySQL 5.5 : un seul TIMESTAMP avec CURRENT_TIMESTAMP par table
  const cleaned = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/CREATE\s+DATABASE[\s\S]*?;/gi, '')
    .replace(/USE\s+`?[\w]+`?\s*;/gi, '')
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

  console.log('Import SQL en cours (peut prendre 1–2 min)...');
  await conn.query(cleaned);
  await conn.end();
  console.log('Import terminé.');
  console.log('Ensuite :');
  console.log('  node database/migrate_production.js');
  console.log('  node database/seed_bureau_accounts.js');
}

main().catch((err) => {
  console.error('Échec import:', err.message);
  process.exit(1);
});
