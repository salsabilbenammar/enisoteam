const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));
const {
  ARCHIVE_YEAR,
  PROJECT_LEAD,
  PUBLISHED_AT,
} = require('./archiveProjectsConfig');

const TEAM_SUPERVISOR = 'Eya Belhaj Khaled';

/**
 * Ajoute le projet réalisé « Solar Tracking System » (mandat précédent) au catalogue + showroom.
 * Usage: node database/seed_solar_tracker_2025.js
 */

const PROJECT_TITLE = 'Solar Tracking System';
const LEGACY_TITLE = 'Solar Tracker';

const COVER_IMAGE = '/uploads/projects/solar-tracker-prototype.png';
const GALLERY = ['/uploads/projects/solar-tracking-realisation.png'];

const DESCRIPTION = `Un Solar Tracking System (suiveur solaire) est un système automatisé qui oriente un panneau solaire afin qu'il reste perpendiculaire aux rayons du soleil. Cette orientation optimale maximise la quantité d'énergie captée, améliorant ainsi son efficacité.

Ce projet sur Arduino consiste à concevoir un dispositif simple capable de détecter la position du soleil à l'aide de capteurs et de faire bouger le panneau solaire en conséquence à l'aide de servomoteurs ou moteurs DC.

Matériel utilisé : carte Arduino UNO, capteurs de lumière (LDR), servomoteur, câbles de connexion, panneau solaire, support mécanique mobile, breadboard et alimentation.

Compétences développées : lecture analogique des capteurs LDR, traitement des données pour déterminer la direction de la source lumineuse, contrôle de servomoteurs via Arduino, programmation C/C++, systèmes de feedback et intégration mécanique/électronique pour optimiser l'efficacité énergétique.`;

const TEAMS = [
  {
    label: 'Équipe 1 — Solar Tracking System',
    members: [
      { prenom: 'Adem', nom: 'Chargui' },
      { prenom: 'Othman', nom: 'Jedidi' },
      { prenom: 'Yosr', nom: 'Itaief' },
    ],
  },
  {
    label: 'Équipe 2 — Solar Tracking System',
    members: [
      { prenom: 'Fatma', nom: 'Chahdoura' },
      { prenom: 'Hadil', nom: 'Chamkhi' },
      { prenom: 'Mayssen', nom: 'Bouchareb' },
      { prenom: 'Shahd', nom: 'Trabelsi' },
    ],
  },
];

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
  const [rows] = await pool.query(
    'SELECT id FROM project_catalog WHERE titre = ? OR titre = ? LIMIT 1',
    [PROJECT_TITLE, LEGACY_TITLE]
  );
  if (rows[0]) {
    await pool.query(
      `UPDATE project_catalog
       SET titre = ?, description = ?, image = ?, gallery = ?, archive_year = ?, project_lead = ?
       WHERE id = ?`,
      [PROJECT_TITLE, DESCRIPTION, COVER_IMAGE, galleryJson, ARCHIVE_YEAR, PROJECT_LEAD, rows[0].id]
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
  const supervisors = JSON.stringify([TEAM_SUPERVISOR]);
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
  const projectId = await upsertCatalog();
  await resetAssignments(projectId);
  const assignmentIds = [];
  for (const team of TEAMS) {
    assignmentIds.push(await insertTeam(projectId, team));
  }
  const synced = await syncLastMandateArchiveProjects();

  console.log('Solar Tracking System ajouté avec succès.');
  console.log({
    project_id: projectId,
    title: PROJECT_TITLE,
    archive_year: ARCHIVE_YEAR,
    project_lead: PROJECT_LEAD,
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
