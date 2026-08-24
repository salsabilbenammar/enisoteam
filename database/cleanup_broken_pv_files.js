/**
 * Supprime les PV dont le fichier n'existe plus sur le disque API (Render free).
 * Usage: node database/cleanup_broken_pv_files.js
 */
const path = require('path');
const https = require('https');
const http = require('http');
const mysql = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

function headOk(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 20000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const apiBase = (process.env.API_PUBLIC_URL || 'https://enisoteam.onrender.com').replace(/\/$/, '');
  const useSsl =
    String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DB_SSL || '') === '1';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const [rows] = await conn.query(
    'SELECT id, titre, fichier FROM pv_reunions WHERE fichier IS NOT NULL AND fichier != \'\''
  );
  let cleared = 0;
  for (const row of rows) {
    const url = `${apiBase}${row.fichier}`;
    const ok = await headOk(url);
    if (!ok) {
      await conn.query('UPDATE pv_reunions SET fichier = NULL WHERE id = ?', [row.id]);
      console.log(`cleared id=${row.id} ${row.titre} -> ${row.fichier}`);
      cleared += 1;
    } else {
      console.log(`ok id=${row.id}`);
    }
  }
  console.log(`Done. cleared=${cleared}/${rows.length}`);
  await conn.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
