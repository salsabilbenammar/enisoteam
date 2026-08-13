const fs = require('fs');
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));
const {
  ARCHIVE_YEAR,
  PROJECT_LEAD,
  PUBLISHED_AT,
} = require('./archiveProjectsConfig');

/**
 * Ajoute le projet réalisé « Robot contrôlé par gestes » (mandat précédent).
 * Usage: node database/seed_robot_gestes_2025.js
 */

const PROJECT_TITLE = 'Robot contrôlé par gestes';

const ASSETS = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Desktop-eniso-team',
  'assets'
);

const UPLOADS = path.join(__dirname, '..', 'backend', 'uploads', 'projects');

const IMAGE_SOURCES = {
  prototype:
    'c__Users_salsa_AppData_Roaming_Cursor_User_workspaceStorage_a5c34c0f47d65d0e0c7afa23b4393f94_images_image-fdf0e379-ac3f-4e6a-bac0-9c847b805150.png',
};

const COVER_IMAGE = '/uploads/projects/robot-gestes-prototype.png';
const GALLERY = [];

const SUPERVISORS = ['Azer Naffeti', 'Brahim Abdelberi'];

const DESCRIPTION = `Ce projet permet de contrôler une voiture robotique à distance grâce aux gestes de la main. Un gant équipé d'un capteur MPU6050 (accéléromètre + gyroscope) détecte l'inclinaison et l'orientation, puis transmet les commandes au robot via Bluetooth.

Le robot repose sur un châssis à deux roues motrices, une carte Arduino, un module L298N pour piloter les moteurs DC, et un module HC-05 pour la communication sans fil. Le contrôleur porté sur la main utilise un Arduino Nano couplé au MPU6050 et au Bluetooth.

Matériel utilisé : Arduino UNO, Arduino Nano, MPU6050, 2 moteurs DC, module L298N, batterie Li-Ion, châssis robot, module HC-05, plaque perforée, breadboard et câbles.

Compétences développées : utilisation du capteur MPU6050 (I2C), lecture des valeurs d'orientation, contrôle directionnel des moteurs via L298N, programmation Arduino (C/C++), communication série Bluetooth UART, intégration électronique et mécanique sur châssis mobile.`;

const TEAMS = [
  {
    label: 'Équipe — Robot contrôlé par gestes',
    members: [
      { prenom: 'Manar', nom: 'Fkih Hassen' },
      { prenom: 'Farah', nom: 'Malleh' },
      { prenom: 'Maryam', nom: 'Loghmari' },
      { prenom: 'Nour', nom: 'Mosbah' },
      { prenom: 'Edriss', nom: 'Amamou' },
      { prenom: 'Med Ahmed', nom: 'Souid' },
      { prenom: 'Ahmed', nom: 'Chaaben' },
      { prenom: 'Amina', nom: 'Kouki' },
      { prenom: 'Hamouda', nom: 'Cherif' },
      { prenom: 'Mohamed', nom: 'Kchaou' },
    ],
  },
];

function copyImages() {
  fs.mkdirSync(UPLOADS, { recursive: true });
  const from = path.join(ASSETS, IMAGE_SOURCES.prototype);
  const to = path.join(UPLOADS, 'robot-gestes-prototype.png');
  if (!fs.existsSync(from)) {
    throw new Error(`Image introuvable : ${from}`);
  }
  fs.copyFileSync(from, to);
}

function memberEmail(prenom, nom) {
  const slug = `${prenom}.${nom}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug}@eniso-team.tn`;
}

async function resolveMemberId(email) {
  const normalized = String(email).trim().toLowerCase();
  const [rows] = await pool.query(
    'SELECT id FROM members WHERE LOWER(TRIM(email)) = ? AND actif = 1 LIMIT 1',
    [normalized]
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
}

async function syncLastMandateArchiveProjects() {
  const [catalog] = await pool.query(
    'SELECT id FROM project_catalog WHERE archive_year IS NOT NULL'
  );
  if (!catalog.length) return 0;
  const ids = catalog.map((r) => r.id);
  await pool.query(
    `UPDATE project_catalog SET archive_year = ?, project_lead = ? WHERE id IN (?)`,
    [ARCHIVE_YEAR, PROJECT_LEAD, ids]
  );
  await pool.query(
    `UPDATE project_assignments SET published_at = ? WHERE project_id IN (?)`,
    [PUBLISHED_AT, ids]
  );
  return ids.length;
}

async function upsertCatalog() {
  const galleryJson = JSON.stringify(GALLERY);
  const [rows] = await pool.query('SELECT id FROM project_catalog WHERE titre = ? LIMIT 1', [
    PROJECT_TITLE,
  ]);
  if (rows[0]) {
    await pool.query(
      `UPDATE project_catalog
       SET description = ?, image = ?, gallery = ?, archive_year = ?, project_lead = ?
       WHERE id = ?`,
      [DESCRIPTION, COVER_IMAGE, galleryJson, ARCHIVE_YEAR, PROJECT_LEAD, rows[0].id]
    );
    return rows[0].id;
  }
  const [ins] = await pool.query(
    `INSERT INTO project_catalog (titre, description, image, gallery, archive_year, project_lead)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [PROJECT_TITLE, DESCRIPTION, COVER_IMAGE, galleryJson, ARCHIVE_YEAR, PROJECT_LEAD]
  );
  return ins.insertId;
}

async function resetAssignments(projectId) {
  await pool.query('DELETE FROM project_assignments WHERE project_id = ?', [projectId]);
}

async function insertTeam(projectId, team) {
  const supervisors = JSON.stringify(SUPERVISORS);
  const [ins] = await pool.query(
    `INSERT INTO project_assignments
      (project_id, supervisors, label, progress, published_at, source_submission_id)
     VALUES (?, ?, ?, 100, ?, NULL)`,
    [projectId, supervisors, team.label, PUBLISHED_AT]
  );
  const assignmentId = ins.insertId;
  for (const m of team.members) {
    const email = memberEmail(m.prenom, m.nom);
    const memberId = await resolveMemberId(email);
    await pool.query(
      `INSERT INTO project_assignment_members
        (assignment_id, member_id, prenom, nom, email, telephone, filiere, photo, from_submission_id)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [assignmentId, memberId, m.prenom, m.nom, email]
    );
  }
  return assignmentId;
}

async function main() {
  copyImages();
  const projectId = await upsertCatalog();
  await resetAssignments(projectId);
  const assignmentIds = [];
  for (const team of TEAMS) {
    assignmentIds.push(await insertTeam(projectId, team));
  }
  const synced = await syncLastMandateArchiveProjects();

  console.log('Robot contrôlé par gestes ajouté avec succès.');
  console.log({
    project_id: projectId,
    title: PROJECT_TITLE,
    archive_year: ARCHIVE_YEAR,
    project_lead: PROJECT_LEAD,
    supervisors: SUPERVISORS,
    synced_archive_projects: synced,
    teams: TEAMS.map((t, i) => ({
      assignment_id: assignmentIds[i],
      label: t.label,
      members: t.members.length,
    })),
    published_at: PUBLISHED_AT,
    cover: COVER_IMAGE,
  });
  console.log('Voir : http://localhost:5173/projets');
}

main()
  .catch((e) => {
    console.error('FAILED:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
