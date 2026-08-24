/**
 * Compare row counts: local XAMPP vs Aiven (backend/.env).
 * Usage: node database/compare_local_aiven.js
 */
const path = require('path');
const mysql = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));
require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

async function tableCounts(cfg) {
  const c = await mysql.createConnection(cfg);
  const [tables] = await c.query('SHOW TABLES');
  const key = Object.keys(tables[0] || { x: 1 })[0];
  const out = {};
  for (const t of tables) {
    const name = t[key];
    try {
      const [rows] = await c.query(`SELECT COUNT(*) AS n FROM \`${name}\``);
      out[name] = Number(rows[0].n);
    } catch {
      out[name] = -1;
    }
  }
  await c.end();
  return out;
}

async function main() {
  const local = await tableCounts({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eniso_team',
  });
  const useSsl =
    String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DB_SSL || '') === '1';
  const remote = await tableCounts({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const all = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const missing = [];
  console.log('table\tlocal\taiven\tstatus');
  [...all].sort().forEach((t) => {
    const L = local[t] ?? 0;
    const R = remote[t] ?? 0;
    let status = 'OK';
    if (!(t in local)) status = 'ONLY_AIVEN';
    else if (!(t in remote)) status = 'MISSING_TABLE';
    else if (L > R) status = 'NEEDS_SYNC';
    else if (R > L) status = 'AIVEN_MORE';
    console.log(`${t}\t${L}\t${R}\t${status}`);
    if (status === 'NEEDS_SYNC' || status === 'MISSING_TABLE') {
      missing.push(t);
    }
  });
  console.log('\nTO_SYNC=' + missing.join(','));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
