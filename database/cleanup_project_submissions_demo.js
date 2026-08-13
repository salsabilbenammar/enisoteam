/**
 * Supprime les soumissions / attributions / comptes créés pour les tests (seed démo).
 * Usage: node database/cleanup_project_submissions_demo.js
 */
const path = require('path');
const pool = require(path.join(__dirname, '..', 'backend', 'config', 'db'));

const DEMO_MEMBER_EMAILS = ['demo.groupe@eniso.local', 'demo.solo@eniso.local'];

async function main() {
  const [members] = await pool.query(
    `SELECT id, email FROM members WHERE email IN (?)`,
    [DEMO_MEMBER_EMAILS]
  );

  if (!members.length) {
    console.log('Aucun compte démo trouvé — rien à supprimer.');
    return;
  }

  const memberIds = members.map((m) => m.id);

  const [subs] = await pool.query(
    `SELECT id, type, group_label, submitter_member_id
     FROM project_form_submissions
     WHERE submitter_member_id IN (?)`,
    [memberIds]
  );

  const submissionIds = subs.map((s) => s.id);

  if (submissionIds.length) {
    const [assignments] = await pool.query(
      `SELECT id, label FROM project_assignments WHERE source_submission_id IN (?)`,
      [submissionIds]
    );
    const assignmentIds = assignments.map((a) => a.id);

    if (assignmentIds.length) {
      await pool.query(`DELETE FROM project_assignment_steps WHERE assignment_id IN (?)`, [
        assignmentIds,
      ]);
      await pool.query(`DELETE FROM project_assignment_members WHERE assignment_id IN (?)`, [
        assignmentIds,
      ]);
      const [delAssign] = await pool.query(`DELETE FROM project_assignments WHERE id IN (?)`, [
        assignmentIds,
      ]);
      console.log(`Attributions démo supprimées : ${delAssign.affectedRows}`);
    }

    const [delSubs] = await pool.query(
      `DELETE FROM project_form_submissions WHERE id IN (?)`,
      [submissionIds]
    );
    console.log(`Soumissions démo supprimées : ${delSubs.affectedRows}`);
    for (const s of subs) {
      console.log(`  - #${s.id} (${s.type}) ${s.group_label || ''}`);
    }
  } else {
    console.log('Aucune soumission démo trouvée.');
  }

  const [delMembers] = await pool.query(`DELETE FROM members WHERE id IN (?)`, [memberIds]);
  console.log(`Comptes démo supprimés : ${delMembers.affectedRows}`);
  for (const m of members) {
    console.log(`  - ${m.email}`);
  }
}

main()
  .catch((e) => {
    console.error('Échec:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
