const fs = require('fs');
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));
const {
  ARCHIVE_YEAR,
  PROJECT_LEAD,
  PUBLISHED_AT,
} = require('./archiveProjectsConfig');

/**
 * Ajoute le projet réalisé « Fire Fighter » (mandat précédent).
 * Usage: node database/seed_fire_fighter_2025.js
 */

const PROJECT_TITLE = 'Fire Fighter';

const ASSETS = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Desktop-eniso-team',
  'assets'
);

const UPLOADS = path.join(__dirname, '..', 'backend', 'uploads', 'projects');

const IMAGE_SOURCES = {
  prototype: 'c__Users_salsa_AppData_Roaming_Cursor_User_workspaceStorage_a5c34c0f47d65d0e0c7afa23b4393f94_images_image-48277ade-2c34-4f08-b008-f472b7eb0bed.png',
};

const COVER_IMAGE = '/uploads/projects/fire-fighter-prototype.png';
const GALLERY = [];

const SUPERVISORS = ['Safwen Massoudi', 'Kossay Abdlaoui'];

const DESCRIPTION = `Le Fire Fighter est un robot autonome conçu pour détecter et éteindre une source de feu, comme une petite bougie. Ce projet pédagogique permet de développer des compétences en détection, navigation autonome et commande d'actionneurs.

Matériel utilisé : Arduino Uno, capteur de flamme (IR), capteurs ultrasoniques HC-SR04, moteurs DC, pont H L298N, pompe à eau, servomoteur, relais ou transistor, batterie rechargeable, châssis robot à roues.

Compétences développées : lecture de capteurs de flamme et température, évitement d'obstacles par ultrasons, programmation Arduino (C/C++) pour la logique autonome, contrôle de moteurs DC via pont H, gestion d'un système d'extinction (ventilateur, pompe à eau), communication série pour le diagnostic, algorithmes de navigation autonome et optimisation énergétique pour l'autonomie.`;

const TEAMS = [
  {
    label: 'Équipe 1 — Fire Fighter',
    members: [
      { prenom: 'Tasnime', nom: 'Bahri' },
      { prenom: 'Salma', nom: 'Ghrib' },
      { prenom: 'Oumaima', nom: 'Guemri' },
      { prenom: 'Nour', nom: 'Jemni' },
    ],
  },
  {
    label: 'Équipe 2 — Fire Fighter',
    members: [
      { prenom: 'Aymen', nom: 'Chriti' },
      { prenom: 'Hamza', nom: 'Lahouar' },
      { prenom: 'Syrine', nom: 'Halloul' },
    ],
  },
];

function copyImages() {
  fs.mkdirSync(UPLOADS, { recursive: true });
  const copies = [
    [path.join(ASSETS, IMAGE_SOURCES.prototype), path.join(UPLOADS, 'fire-fighter-prototype.png')],
  ];
  for (const [from, to] of copies) {
    if (!fs.existsSync(from)) {
      throw new Error(`Image introuvable : ${from}`);
    }
    fs.copyFileSync(from, to);
  }
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

  console.log('Fire Fighter ajouté avec succès.');
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
    gallery: GALLERY,
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
