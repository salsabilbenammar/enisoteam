/**
 * Comptes bureau ENISO Team — même email, un mot de passe par poste.
 * Usage: node database/seed_bureau_accounts.js
 */
const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'bcrypt'));
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

/** Email partagé par tout le bureau ; le mot de passe détermine le poste. */
const SHARED_EMAIL = 'eniso.teamm@gmail.com';

const ACCOUNTS = [
  {
    nom: 'Président ENISO Team',
    password: 'Bexenisoteam',
    role: 'admin',
  },
  {
    nom: 'Responsable RH',
    password: 'rhfenisoteam',
    role: 'rh',
  },
  {
    nom: 'Secrétaire générale',
    password: 'secretaireenisoteam',
    role: 'secretaire',
  },
  {
    nom: 'Responsable projets',
    password: 'projetsenisoteam',
    role: 'projets',
  },
  {
    nom: 'Trésorier',
    password: 'tresorierenisoteam',
    role: 'tresorier',
  },
  {
    nom: 'Responsable logistique',
    password: 'logistiqueenisoteam',
    role: 'logistique',
  },
  {
    nom: 'Responsable événementiel',
    password: 'eventsenisoteam',
    role: 'evenementiel',
  },
  {
    nom: 'Responsable média',
    password: 'mediaenisoteam',
    role: 'media',
  },
  {
    nom: 'Responsable prospection',
    password: 'prospectionenisoteam',
    role: 'prospection',
  },
];

const ROLE_LIST =
  "'admin','secretaire','rh','projets','tresorier','logistique','evenementiel','media','prospection'";

const ENUM = `ENUM(${ROLE_LIST}) NOT NULL DEFAULT 'admin'`;

async function ensureSchema() {
  await pool.execute(`ALTER TABLE admins MODIFY COLUMN role ${ENUM}`);

  const [indexes] = await pool.execute(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'admins'
       AND COLUMN_NAME = 'email'
       AND NON_UNIQUE = 0`
  );
  for (const row of indexes) {
    const name = row.INDEX_NAME || row.index_name;
    if (!name || name === 'PRIMARY') continue;
    await pool.execute(`ALTER TABLE admins DROP INDEX \`${name}\``);
    console.log(`Dropped unique index ${name} on admins.email`);
  }
}

async function upsertByRole({ nom, password, role }) {
  const password_hash = await bcrypt.hash(password, 10);
  const [rows] = await pool.execute('SELECT id FROM admins WHERE role = ? LIMIT 1', [role]);
  if (rows.length) {
    await pool.execute(
      `UPDATE admins SET nom = ?, email = ?, password_hash = ? WHERE id = ?`,
      [nom, SHARED_EMAIL, password_hash, rows[0].id]
    );
    console.log(`Updated ${role}`);
  } else {
    await pool.execute(
      `INSERT INTO admins (nom, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [nom, SHARED_EMAIL, password_hash, role]
    );
    console.log(`Created ${role}`);
  }
}

async function main() {
  await ensureSchema();

  for (const account of ACCOUNTS) {
    await upsertByRole(account);
  }

  await pool.execute(
    `DELETE FROM admins
     WHERE email <> ?
       AND role IN (${ROLE_LIST})`,
    [SHARED_EMAIL]
  );

  console.log(`\nEmail commun : ${SHARED_EMAIL}`);
  console.log('Mot de passe = poste :');
  for (const a of ACCOUNTS) {
    console.log(`  ${a.role.padEnd(14)} ${a.password}`);
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
