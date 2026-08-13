/**
 * Rattache le compte admin au projet « site web » (attribution equipe1).
 * Usage: node database/fix_admin_siteweb_assignment.js
 */
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

(async () => {
  try {
    const [admins] = await pool.query('SELECT id, nom, email FROM admins LIMIT 1');
    const admin = admins[0];
    if (!admin?.email) throw new Error('Aucun admin trouvé.');

    const [projects] = await pool.query(
      "SELECT id, titre FROM project_catalog WHERE LOWER(titre) = 'site web' LIMIT 1"
    );
    const project = projects[0];
    if (!project) throw new Error('Projet « site web » introuvable.');

    const [assigns] = await pool.query(
      'SELECT id, label FROM project_assignments WHERE project_id = ? ORDER BY id DESC LIMIT 1',
      [project.id]
    );
    const assignment = assigns[0];
    if (!assignment) throw new Error('Aucune attribution pour « site web ».');

    const adminEmail = String(admin.email).trim().toLowerCase();
    const nameParts = String(admin.nom || 'Administrateur').trim().split(/\s+/);
    const prenom = nameParts[0] || 'Administrateur';
    const nom = nameParts.slice(1).join(' ') || 'ENISO Team';

    const [existing] = await pool.query(
      `SELECT id FROM project_assignment_members
       WHERE assignment_id = ? AND LOWER(TRIM(email)) = ? LIMIT 1`,
      [assignment.id, adminEmail]
    );

    if (existing[0]) {
      await pool.query(
        `UPDATE project_assignment_members
         SET member_id = NULL, prenom = ?, nom = ?, email = ?
         WHERE id = ?`,
        [prenom, nom, adminEmail, existing[0].id]
      );
      console.log(`Participant admin déjà présent (#${existing[0].id}) — mis à jour.`);
    } else {
      // Remplace le faux « Administrateur » lié au mauvais email, s’il existe
      const [fakeAdmin] = await pool.query(
        `SELECT id FROM project_assignment_members
         WHERE assignment_id = ?
           AND (
             LOWER(prenom) LIKE '%admin%'
             OR LOWER(CONCAT(prenom,' ',nom)) LIKE '%administrateur%'
           )
         LIMIT 1`,
        [assignment.id]
      );

      if (fakeAdmin[0]) {
        await pool.query(
          `UPDATE project_assignment_members
           SET member_id = NULL, prenom = ?, nom = ?, email = ?
           WHERE id = ?`,
          [prenom, nom, adminEmail, fakeAdmin[0].id]
        );
        console.log(`Participant #${fakeAdmin[0].id} rattaché à l’admin ${adminEmail}`);
      } else {
        await pool.query(
          `INSERT INTO project_assignment_members
            (assignment_id, member_id, prenom, nom, email, telephone, filiere, photo, from_submission_id)
           VALUES (?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL)`,
          [assignment.id, prenom, nom, adminEmail]
        );
        console.log(`Admin ${adminEmail} ajouté à l’attribution #${assignment.id}`);
      }
    }

    const [members] = await pool.query(
      `SELECT prenom, nom, email, member_id FROM project_assignment_members WHERE assignment_id = ?`,
      [assignment.id]
    );
    console.log(`Projet « ${project.titre} » · ${assignment.label}`);
    console.log(members);
    console.log('OK — connectez-vous en admin puis ouvrez /mes-projets');
  } catch (e) {
    console.error('Échec:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
