const pool = require('../config/db');
const {
  SHOWCASE_ORDER = [],
  PROJECT_LEAD_BY_END_YEAR = {},
  PROJECT_LEAD: FALLBACK_LAST_LEAD = 'Achref Bouzidi',
} = require('../../database/archiveProjectsConfig');
const {
  archiveEndYearFromDate,
  formatArchiveSeason,
  currentArchiveEndYear,
} = require('../../database/archiveSeason');

const CURRENT_BOARD_PROJECT_LEAD = 'Dhouha Kmala';

function projectLeadForEndYear(endYear) {
  const n = endYear != null && endYear !== '' ? Number(endYear) : null;
  if (n && !Number.isNaN(n) && PROJECT_LEAD_BY_END_YEAR[n]) {
    return PROJECT_LEAD_BY_END_YEAR[n];
  }
  if (n === 2026) return FALLBACK_LAST_LEAD;
  return CURRENT_BOARD_PROJECT_LEAD;
}

function resolveStoredOrSeasonLead(stored, endYear) {
  const s = stored != null ? String(stored).trim() : '';
  if (s) return s;
  return projectLeadForEndYear(endYear != null ? endYear : currentArchiveEndYear());
}

function sortShowcaseRealizations(items) {
  const order = SHOWCASE_ORDER.map((t) => String(t).trim().toLowerCase());
  return [...items].sort((a, b) => {
    const ta = String(a.project_titre || '').trim().toLowerCase();
    const tb = String(b.project_titre || '').trim().toLowerCase();
    const ia = order.indexOf(ta);
    const ib = order.indexOf(tb);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return ta.localeCompare(tb, 'fr');
  });
}

function normalizeSupervisors(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (value == null || value === '') return [];
  const raw = String(value).trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s || '').trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeSupervisors(value) {
  return JSON.stringify(normalizeSupervisors(value));
}

function parseGallery(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (value == null || value === '') return [];
  const raw = String(value).trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s || '').trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return [];
}

function serializeGallery(value) {
  const items = parseGallery(value);
  return items.length ? JSON.stringify(items) : null;
}

function archiveSeasonLabel(endYear) {
  return formatArchiveSeason(endYear);
}

function mapProjectCatalogRow(row) {
  if (!row) return row;
  const archiveYear = row.archive_year != null ? Number(row.archive_year) : null;
  const year = archiveYear && !Number.isNaN(archiveYear) ? archiveYear : null;
  const lead = resolveStoredOrSeasonLead(row.project_lead, year || currentArchiveEndYear());
  return {
    ...row,
    gallery: parseGallery(row.gallery),
    archive_year: year,
    archive_season_label: year ? archiveSeasonLabel(year) : null,
    project_lead: lead,
  };
}

async function resolveMemberIdByEmail(email, existingId = null) {
  if (existingId) return Number(existingId) || null;
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  const [rows] = await pool.execute(
    'SELECT id FROM members WHERE LOWER(TRIM(email)) = ? AND actif = 1 LIMIT 1',
    [normalized]
  );
  return rows[0]?.id ? Number(rows[0].id) : null;
}

function userMatchesMember(user, member) {
  if (!user || !member) return false;
  const email = String(user.email || '')
    .trim()
    .toLowerCase();
  const memberEmail = String(member.email || '')
    .trim()
    .toLowerCase();
  // Email = source de vérité (admin ou membre club)
  if (email && memberEmail && email === memberEmail) return true;
  // Compte membre club : liaison par member_id (jamais par id admin)
  if (user.role === 'member') {
    const memberId = Number(user.id);
    if (memberId && member.member_id && Number(member.member_id) === memberId) return true;
  }
  return false;
}

/** Participant du groupe : membre club, ou admin listé avec le même email. */
async function userIsGroupParticipant(user, assignment) {
  if (!user || !assignment) return false;
  return (assignment.members || []).some((m) => userMatchesMember(user, m));
}

function mapAssignmentRow(row) {
  if (!row) return row;
  const progress = Math.min(100, Math.max(0, Number(row.progress) || 0));
  const published = progress >= 100 && !!row.published_at;
  const archiveYear =
    row.archive_year != null && !Number.isNaN(Number(row.archive_year))
      ? Number(row.archive_year)
      : null;
  let seasonEndYear = archiveYear;
  if (!seasonEndYear && row.published_at) {
    seasonEndYear = archiveEndYearFromDate(row.published_at);
  }
  if (!seasonEndYear && row.created_at) {
    seasonEndYear = archiveEndYearFromDate(row.created_at);
  }
  return {
    ...row,
    progress,
    published,
    published_at: row.published_at || null,
    archive_year: archiveYear,
    season_year: seasonEndYear,
    season_label: seasonEndYear ? archiveSeasonLabel(seasonEndYear) : null,
    supervisors: normalizeSupervisors(row.supervisors),
    supervisors_label: normalizeSupervisors(row.supervisors).join(', '),
  };
}

async function getSettings() {
  const [rows] = await pool.execute(
    'SELECT group_size, choices_count, form_open FROM project_form_settings WHERE id = 1'
  );
  if (!rows[0]) {
    await pool.execute(
      'INSERT INTO project_form_settings (id, group_size, choices_count, form_open) VALUES (1, 3, 3, 0)'
    );
    return { group_size: 3, choices_count: 3, form_open: false };
  }
  return {
    group_size: Number(rows[0].group_size),
    choices_count: Number(rows[0].choices_count),
    form_open: !!rows[0].form_open,
  };
}

async function updateSettings({ group_size, choices_count, form_open }) {
  const size = Math.max(1, Number(group_size) || 1);
  const choices = Math.max(1, Number(choices_count) || 1);
  const open = form_open === true || form_open === 1 || form_open === '1' ? 1 : 0;
  await pool.execute(
    `INSERT INTO project_form_settings (id, group_size, choices_count, form_open)
     VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       group_size = VALUES(group_size),
       choices_count = VALUES(choices_count),
       form_open = VALUES(form_open)`,
    [size, choices, open]
  );
  return getSettings();
}

async function listProjects() {
  const [rows] = await pool.execute(
    'SELECT * FROM project_catalog ORDER BY titre ASC, id ASC'
  );
  return rows.map(mapProjectCatalogRow);
}

/** Projets proposés au formulaire de sélection (hors réalisations / archives) */
async function listSelectableProjects() {
  const [catalog, assignments] = await Promise.all([listProjects(), listAssignments()]);
  const realizedProjectIds = new Set(
    assignments.filter((a) => a.published).map((a) => Number(a.project_id))
  );
  return catalog.filter((p) => !p.archive_year && !realizedProjectIds.has(Number(p.id)));
}

/** Projets réalisés / archivés (showroom — hors catalogue actif) */
async function listRealizedProjects() {
  const [catalog, assignments] = await Promise.all([listProjects(), listAssignments()]);
  const realizedProjectIds = new Set(
    assignments.filter((a) => a.published).map((a) => Number(a.project_id))
  );
  const realized = catalog
    .filter((p) => p.archive_year || realizedProjectIds.has(Number(p.id)))
    .map((p) => ({
      ...p,
      published_groups: assignments.filter(
        (a) => Number(a.project_id) === Number(p.id) && a.published
      ).length,
    }));
  return sortShowcaseRealizations(realized.map((p) => ({ ...p, project_titre: p.titre })));
}

async function getProject(id) {
  const [rows] = await pool.execute('SELECT * FROM project_catalog WHERE id = ?', [id]);
  return mapProjectCatalogRow(rows[0] || null);
}

/** Projets éligibles aux étapes / formulaire (hors réalisations archivées ou publiées) */
async function assertProjectSelectable(projectId) {
  const project = await getProject(projectId);
  if (!project) {
    const err = new Error('Projet introuvable.');
    err.status = 404;
    throw err;
  }
  if (project.archive_year) {
    const err = new Error(
      'Ce projet est une réalisation archivée. Les étapes ne s’appliquent qu’aux projets en cours.'
    );
    err.status = 400;
    throw err;
  }
  const assignments = await listAssignments();
  const published = assignments.some(
    (a) => Number(a.project_id) === Number(projectId) && a.published
  );
  if (published) {
    const err = new Error(
      'Ce projet est déjà publié comme réalisation. Choisissez un projet en cours.'
    );
    err.status = 400;
    throw err;
  }
  return project;
}

async function createProject({ titre, description, image, gallery, archive_year, project_lead }) {
  const archive =
    archive_year != null && archive_year !== ''
      ? Number(archive_year) || null
      : null;
  let lead =
    project_lead != null && String(project_lead).trim() !== ''
      ? String(project_lead).trim().slice(0, 500)
      : null;
  if (!lead && archive) {
    lead = projectLeadForEndYear(archive);
  }
  if (!lead && !archive) {
    lead = projectLeadForEndYear(currentArchiveEndYear());
  }
  const [result] = await pool.execute(
    'INSERT INTO project_catalog (titre, description, image, gallery, archive_year, project_lead) VALUES (?, ?, ?, ?, ?, ?)',
    [
      String(titre).trim(),
      String(description).trim(),
      image || null,
      gallery !== undefined ? serializeGallery(gallery) : null,
      archive,
      lead,
    ]
  );
  return getProject(result.insertId);
}

async function updateProject(id, { titre, description, image, gallery, archive_year, project_lead }) {
  const existing = await getProject(id);
  if (!existing) return null;
  const archive =
    archive_year !== undefined
      ? archive_year != null && archive_year !== ''
        ? Number(archive_year) || null
        : null
      : existing.archive_year;
  const lead =
    project_lead !== undefined
      ? project_lead != null && String(project_lead).trim() !== ''
        ? String(project_lead).trim().slice(0, 500)
        : null
      : existing.project_lead;
  await pool.execute(
    'UPDATE project_catalog SET titre = ?, description = ?, image = ?, gallery = ?, archive_year = ?, project_lead = ? WHERE id = ?',
    [
      titre !== undefined ? String(titre).trim() : existing.titre,
      description !== undefined ? String(description).trim() : existing.description,
      image !== undefined ? image : existing.image,
      gallery !== undefined ? serializeGallery(gallery) : serializeGallery(existing.gallery),
      archive,
      lead,
      id,
    ]
  );
  return getProject(id);
}

async function removeProject(id) {
  const [result] = await pool.execute('DELETE FROM project_catalog WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function findSubmissionBySubmitter(memberId) {
  const [rows] = await pool.execute(
    'SELECT * FROM project_form_submissions WHERE submitter_member_id = ? LIMIT 1',
    [memberId]
  );
  return rows[0] || null;
}

async function isSubmissionAssigned(submissionId) {
  const [fromSource] = await pool.execute(
    'SELECT id FROM project_assignments WHERE source_submission_id = ? LIMIT 1',
    [submissionId]
  );
  if (fromSource[0]) return true;
  const [fromMembers] = await pool.execute(
    'SELECT id FROM project_assignment_members WHERE from_submission_id = ? LIMIT 1',
    [submissionId]
  );
  return Boolean(fromMembers[0]);
}

async function removeSubmissionBySubmitter(memberId) {
  const existing = await findSubmissionBySubmitter(memberId);
  if (!existing) return { ok: false, reason: 'missing' };
  if (await isSubmissionAssigned(existing.id)) {
    return { ok: false, reason: 'assigned' };
  }
  const [result] = await pool.execute(
    'DELETE FROM project_form_submissions WHERE id = ? AND submitter_member_id = ?',
    [existing.id, memberId]
  );
  return { ok: result.affectedRows > 0, reason: result.affectedRows > 0 ? null : 'missing' };
}

async function getSubmissionDetail(id) {
  const [subs] = await pool.execute(
    'SELECT * FROM project_form_submissions WHERE id = ?',
    [id]
  );
  const submission = subs[0];
  if (!submission) return null;

  const [participants] = await pool.execute(
    `SELECT * FROM project_form_participants
     WHERE submission_id = ? ORDER BY is_submitter DESC, id ASC`,
    [id]
  );
  const [choices] = await pool.execute(
    `SELECT c.*, p.titre AS project_titre, p.description AS project_description
     FROM project_form_choices c
     JOIN project_catalog p ON p.id = c.project_id
     WHERE c.submission_id = ?
     ORDER BY c.preference_rank ASC`,
    [id]
  );
  return { ...submission, participants, choices };
}

async function createSubmission({
  type,
  submitter_member_id,
  group_label,
  participants,
  choices,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.execute(
      `INSERT INTO project_form_submissions (type, submitter_member_id, group_label)
       VALUES (?, ?, ?)`,
      [type, submitter_member_id, group_label || null]
    );
    const submissionId = ins.insertId;

    for (const p of participants) {
      await conn.execute(
        `INSERT INTO project_form_participants
          (submission_id, member_id, prenom, nom, email, telephone, filiere, photo, is_submitter)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          submissionId,
          p.member_id || null,
          String(p.prenom).trim(),
          String(p.nom).trim(),
          String(p.email).trim().toLowerCase(),
          String(p.telephone || '').trim() || null,
          String(p.filiere || '').trim() || null,
          p.photo || null,
          p.is_submitter ? 1 : 0,
        ]
      );
    }

    for (const c of choices) {
      await conn.execute(
        `INSERT INTO project_form_choices (submission_id, project_id, preference_rank)
         VALUES (?, ?, ?)`,
        [submissionId, c.project_id, c.preference_rank]
      );
    }

    await conn.commit();
    return getSubmissionDetail(submissionId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function listGroupSubmissions() {
  const [rows] = await pool.execute(
    `SELECT s.*,
            (SELECT COUNT(*) FROM project_assignments a WHERE a.source_submission_id = s.id) AS assigned
     FROM project_form_submissions s
     WHERE s.type IN ('group', 'solo')
     ORDER BY s.submitted_at ASC, s.id ASC`
  );
  const details = [];
  for (const row of rows) {
    details.push({
      ...(await getSubmissionDetail(row.id)),
      assigned: Number(row.assigned) > 0,
    });
  }
  return details;
}

async function listSoloSubmissions() {
  const [rows] = await pool.execute(
    `SELECT s.*
     FROM project_form_submissions s
     WHERE s.type = 'solo'
     ORDER BY s.submitted_at ASC, s.id ASC`
  );
  const details = [];
  for (const row of rows) {
    const full = await getSubmissionDetail(row.id);
    const first = (full.choices || []).find((c) => Number(c.preference_rank) === 1);
    details.push({
      ...full,
      first_choice_project_id: first?.project_id || null,
      first_choice_titre: first?.project_titre || null,
    });
  }
  // Tri : par projet 1er choix, puis chronologique
  details.sort((a, b) => {
    const ta = (a.first_choice_titre || 'zzz').localeCompare(b.first_choice_titre || 'zzz', 'fr');
    if (ta !== 0) return ta;
    return new Date(a.submitted_at) - new Date(b.submitted_at);
  });
  return details;
}

async function createAssignmentFromGroup({
  submission_id,
  project_id,
  supervisors,
  label,
}) {
  const submission = await getSubmissionDetail(submission_id);
  if (!submission || !['group', 'solo'].includes(submission.type)) {
    const err = new Error('Soumission de groupe introuvable.');
    err.status = 404;
    throw err;
  }
  const allowed = (submission.choices || []).some((c) => Number(c.project_id) === Number(project_id));
  if (!allowed) {
    const err = new Error('Le projet doit faire partie des choix du groupe.');
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO project_assignments (project_id, supervisors, label, progress, source_submission_id)
       VALUES (?, ?, ?, 0, ?)`,
      [
        project_id,
        serializeSupervisors(supervisors),
        String(label || submission.group_label || `Groupe #${submission.id}`).trim(),
        submission_id,
      ]
    );
    const assignmentId = ins.insertId;
    for (const p of submission.participants) {
      const memberId = await resolveMemberIdByEmail(p.email, p.member_id);
      await conn.execute(
        `INSERT INTO project_assignment_members
          (assignment_id, member_id, prenom, nom, email, telephone, filiere, photo, from_submission_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assignmentId,
          memberId,
          p.prenom,
          p.nom,
          p.email,
          p.telephone || null,
          p.filiere || null,
          p.photo || null,
          submission_id,
        ]
      );
    }
    await conn.commit();
    return getAssignmentDetail(assignmentId);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const e = new Error('Ce groupe a déjà une attribution.');
      e.status = 409;
      throw e;
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function createAssignmentFromSolos({
  project_id,
  supervisors,
  label,
  submission_ids,
}) {
  const ids = [...new Set((submission_ids || []).map(Number).filter(Boolean))];
  if (!ids.length) {
    const err = new Error('Sélectionnez au moins un candidat solo.');
    err.status = 400;
    throw err;
  }

  const members = [];
  for (const sid of ids) {
    const sub = await getSubmissionDetail(sid);
    if (!sub || sub.type !== 'solo') {
      const err = new Error(`Soumission solo #${sid} introuvable.`);
      err.status = 404;
      throw err;
    }
    for (const p of sub.participants) {
      members.push({ ...p, from_submission_id: sid });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute(
      `INSERT INTO project_assignments (project_id, supervisors, label, progress, source_submission_id)
       VALUES (?, ?, ?, 0, NULL)`,
      [
        project_id,
        serializeSupervisors(supervisors),
        String(label || 'Nouveau groupe').trim(),
      ]
    );
    const assignmentId = ins.insertId;
    for (const p of members) {
      const memberId = await resolveMemberIdByEmail(p.email, p.member_id);
      await conn.execute(
        `INSERT INTO project_assignment_members
          (assignment_id, member_id, prenom, nom, email, telephone, filiere, photo, from_submission_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assignmentId,
          memberId,
          p.prenom,
          p.nom,
          p.email,
          p.telephone || null,
          p.filiere || null,
          p.photo || null,
          p.from_submission_id,
        ]
      );
    }
    await conn.commit();
    return getAssignmentDetail(assignmentId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getAssignmentDetail(id) {
  const [rows] = await pool.execute(
    `SELECT a.*, p.titre AS project_titre, p.description AS project_description,
            p.image AS project_image, p.gallery AS project_gallery, p.archive_year,
            p.project_lead
     FROM project_assignments a
     JOIN project_catalog p ON p.id = a.project_id
     WHERE a.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const [members] = await pool.execute(
    'SELECT * FROM project_assignment_members WHERE assignment_id = ? ORDER BY id ASC',
    [id]
  );
  return mapAssignmentRow({ ...rows[0], members });
}

async function listAssignments({ year } = {}) {
  const [rows] = await pool.execute(
    `SELECT a.*, p.titre AS project_titre, p.description AS project_description,
            p.image AS project_image, p.gallery AS project_gallery, p.archive_year,
            p.project_lead
     FROM project_assignments a
     JOIN project_catalog p ON p.id = a.project_id
     ORDER BY p.titre ASC, a.label ASC, a.id ASC`
  );
  const out = [];
  for (const row of rows) {
    const [members] = await pool.execute(
      'SELECT * FROM project_assignment_members WHERE assignment_id = ? ORDER BY id ASC',
      [row.id]
    );
    out.push(mapAssignmentRow({ ...row, members }));
  }
  if (year != null && year !== '' && !Number.isNaN(Number(year))) {
    const y = Number(year);
    return out.filter((a) => a.season_year === y);
  }
  return out;
}

async function updateAssignmentProgress(id, progress) {
  const value = Math.min(100, Math.max(0, Math.round(Number(progress))));
  if (Number.isNaN(value)) return null;
  if (value >= 100) {
    await pool.execute(
      `UPDATE project_assignments
       SET progress = ?,
           published_at = COALESCE(published_at, NOW())
       WHERE id = ?`,
      [value, id]
    );
  } else {
    await pool.execute(
      `UPDATE project_assignments
       SET progress = ?,
           published_at = NULL
       WHERE id = ?`,
      [value, id]
    );
  }
  return getAssignmentDetail(id);
}

async function removeAssignment(id) {
  const [result] = await pool.execute('DELETE FROM project_assignments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/* ---------- Étapes de projet ---------- */

async function listProjectSteps(projectId) {
  const [rows] = await pool.execute(
    `SELECT id, project_id, titre, description, ordre, requires_document, created_at
     FROM project_steps
     WHERE project_id = ?
     ORDER BY ordre ASC, id ASC`,
    [projectId]
  );
  return rows.map((r) => ({
    ...r,
    requires_document: !!r.requires_document,
  }));
}

async function getProjectStep(id) {
  const [rows] = await pool.execute('SELECT * FROM project_steps WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return { ...rows[0], requires_document: !!rows[0].requires_document };
}

async function createProjectStep({ project_id, titre, description, ordre, requires_document }) {
  await assertProjectSelectable(project_id);
  let orderVal = Number(ordre);
  if (Number.isNaN(orderVal) || orderVal < 0) {
    const [mx] = await pool.execute(
      'SELECT COALESCE(MAX(ordre), 0) AS m FROM project_steps WHERE project_id = ?',
      [project_id]
    );
    orderVal = Number(mx[0].m) + 1;
  }
  const needsDoc =
    requires_document === true ||
    requires_document === 1 ||
    requires_document === '1' ||
    requires_document === 'true'
      ? 1
      : 0;
  const [ins] = await pool.execute(
    `INSERT INTO project_steps (project_id, titre, description, ordre, requires_document)
     VALUES (?, ?, ?, ?, ?)`,
    [
      project_id,
      String(titre || '').trim(),
      String(description || '').trim() || null,
      orderVal,
      needsDoc,
    ]
  );
  await recomputeProgressForProject(project_id);
  return getProjectStep(ins.insertId);
}

async function updateProjectStep(id, { titre, description, ordre, requires_document }) {
  const existing = await getProjectStep(id);
  if (!existing) return null;
  const nextTitre = titre !== undefined ? String(titre).trim() : existing.titre;
  const nextDesc =
    description !== undefined
      ? String(description || '').trim() || null
      : existing.description;
  const nextOrdre =
    ordre !== undefined && !Number.isNaN(Number(ordre))
      ? Math.max(0, Number(ordre))
      : existing.ordre;
  let nextNeedsDoc = existing.requires_document ? 1 : 0;
  if (requires_document !== undefined) {
    nextNeedsDoc =
      requires_document === true ||
      requires_document === 1 ||
      requires_document === '1' ||
      requires_document === 'true'
        ? 1
        : 0;
  }
  await pool.execute(
    `UPDATE project_steps SET titre = ?, description = ?, ordre = ?, requires_document = ? WHERE id = ?`,
    [nextTitre, nextDesc, nextOrdre, nextNeedsDoc, id]
  );
  return getProjectStep(id);
}

async function removeProjectStep(id) {
  const existing = await getProjectStep(id);
  if (!existing) return false;
  await pool.execute('DELETE FROM project_assignment_step_status WHERE step_id = ?', [id]);
  const [result] = await pool.execute('DELETE FROM project_steps WHERE id = ?', [id]);
  if (result.affectedRows) {
    await recomputeProgressForProject(existing.project_id);
  }
  return result.affectedRows > 0;
}

async function recomputeProgress(assignmentId) {
  const assignment = await getAssignmentDetail(assignmentId);
  if (!assignment) return null;
  const steps = await listProjectSteps(assignment.project_id);
  if (!steps.length) {
    return updateAssignmentProgress(assignmentId, assignment.progress ?? 0);
  }
  const [validated] = await pool.execute(
    `SELECT COUNT(*) AS c FROM project_assignment_step_status
     WHERE assignment_id = ? AND status = 'validated'`,
    [assignmentId]
  );
  const pct = Math.round((Number(validated[0].c) / steps.length) * 100);
  return updateAssignmentProgress(assignmentId, pct);
}

async function recomputeProgressForProject(projectId) {
  const [rows] = await pool.execute(
    'SELECT id FROM project_assignments WHERE project_id = ?',
    [projectId]
  );
  for (const row of rows) {
    await recomputeProgress(row.id);
  }
}

function buildStepsWithStatus(steps, statusRows) {
  const byStep = new Map(statusRows.map((r) => [r.step_id, r]));
  let firstOpen = true;
  return steps.map((step) => {
    const st = byStep.get(step.id);
    let status = 'locked';
    if (st?.status === 'validated') {
      status = 'validated';
    } else if (st?.status === 'submitted') {
      status = 'submitted';
      firstOpen = false;
    } else if (firstOpen) {
      status = 'current';
      firstOpen = false;
    } else {
      status = 'locked';
    }
    return {
      id: step.id,
      project_id: step.project_id,
      titre: step.titre,
      description: step.description,
      ordre: step.ordre,
      requires_document: !!step.requires_document,
      status,
      document_path: st?.document_path || null,
      document_name: st?.document_name || null,
      submitted_at: st?.submitted_at || null,
      validated_at: st?.validated_at || null,
      submitted_by_member_id: st?.submitted_by_member_id || null,
    };
  });
}

async function getAssignmentSteps(assignmentId) {
  const assignment = await getAssignmentDetail(assignmentId);
  if (!assignment) return null;
  const steps = await listProjectSteps(assignment.project_id);
  const [statusRows] = await pool.execute(
    `SELECT * FROM project_assignment_step_status WHERE assignment_id = ?`,
    [assignmentId]
  );
  const enriched = buildStepsWithStatus(steps, statusRows);
  const validatedCount = enriched.filter((s) => s.status === 'validated').length;
  return {
    assignment,
    steps: enriched,
    validated_count: validatedCount,
    total_steps: enriched.length,
    progress:
      enriched.length > 0
        ? Math.round((validatedCount / enriched.length) * 100)
        : Number(assignment.progress) || 0,
  };
}

async function memberCanAccessAssignment(assignmentId, user) {
  const assignment = await getAssignmentDetail(assignmentId);
  if (!assignment) return null;
  // Seuls les participants du groupe (membres club OU admin listé avec le même email).
  const ok = await userIsGroupParticipant(user, assignment);
  return ok ? assignment : false;
}

async function healAssignmentMemberLinks(assignment) {
  if (!assignment?.members?.length) return;
  for (const m of assignment.members) {
    if (m.member_id || !m.email) continue;
    const resolved = await resolveMemberIdByEmail(m.email, null);
    if (!resolved) continue;
    await pool.execute(
      'UPDATE project_assignment_members SET member_id = ? WHERE id = ? AND member_id IS NULL',
      [resolved, m.id]
    );
    m.member_id = resolved;
  }
}

async function listMyAssignments(user) {
  const all = await listAssignments();
  for (const a of all) {
    await healAssignmentMemberLinks(a);
  }
  const mine = all.filter((a) => (a.members || []).some((m) => userMatchesMember(user, m)));
  const out = [];
  for (const a of mine) {
    const detail = await getAssignmentSteps(a.id);
    out.push({
      ...a,
      progress: detail.progress,
      steps_summary: {
        validated_count: detail.validated_count,
        total_steps: detail.total_steps,
        current:
          detail.steps.find((s) => s.status === 'current' || s.status === 'submitted') || null,
      },
      can_edit: true,
    });
  }
  return out;
}

async function submitAssignmentStep(assignmentId, stepId, memberId, document = null) {
  const pack = await getAssignmentSteps(assignmentId);
  if (!pack) {
    const err = new Error('Attribution introuvable.');
    err.status = 404;
    throw err;
  }
  const step = pack.steps.find((s) => Number(s.id) === Number(stepId));
  if (!step) {
    const err = new Error('Étape introuvable pour ce projet.');
    err.status = 404;
    throw err;
  }
  if (step.status === 'validated') {
    const err = new Error('Cette étape est déjà validée.');
    err.status = 400;
    throw err;
  }
  if (step.status === 'submitted') {
    const err = new Error('Validation déjà demandée pour cette étape.');
    err.status = 400;
    throw err;
  }
  if (step.status !== 'current') {
    const err = new Error('Terminez d’abord les étapes précédentes.');
    err.status = 400;
    throw err;
  }

  const docPath = document?.path || null;
  const docName = document?.originalname || document?.name || null;

  if (step.requires_document && !docPath) {
    const err = new Error('Un document est requis pour cette étape.');
    err.status = 400;
    throw err;
  }

  await pool.execute(
    `INSERT INTO project_assignment_step_status
      (assignment_id, step_id, status, submitted_by_member_id, document_path, document_name, submitted_at)
     VALUES (?, ?, 'submitted', ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       status = 'submitted',
       submitted_by_member_id = VALUES(submitted_by_member_id),
       document_path = COALESCE(VALUES(document_path), document_path),
       document_name = COALESCE(VALUES(document_name), document_name),
       submitted_at = NOW(),
       validated_at = NULL`,
    [assignmentId, stepId, memberId || null, docPath, docName]
  );
  return getAssignmentSteps(assignmentId);
}

async function validateAssignmentStep(assignmentId, stepId) {
  const pack = await getAssignmentSteps(assignmentId);
  if (!pack) {
    const err = new Error('Attribution introuvable.');
    err.status = 404;
    throw err;
  }
  const step = pack.steps.find((s) => Number(s.id) === Number(stepId));
  if (!step) {
    const err = new Error('Étape introuvable.');
    err.status = 404;
    throw err;
  }
  if (step.requires_document) {
    if (step.status !== 'submitted' || !step.document_path) {
      const err = new Error(
        'Impossible de valider : le groupe doit d’abord uploader le document.'
      );
      err.status = 400;
      throw err;
    }
  } else if (step.status !== 'submitted' && step.status !== 'current') {
    const err = new Error('Cette étape ne peut pas être validée pour le moment.');
    err.status = 400;
    throw err;
  }
  await pool.execute(
    `INSERT INTO project_assignment_step_status
      (assignment_id, step_id, status, submitted_at, validated_at)
     VALUES (?, ?, 'validated', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       status = 'validated',
       validated_at = NOW()`,
    [assignmentId, stepId]
  );
  await recomputeProgress(assignmentId);
  return getAssignmentSteps(assignmentId);
}

async function rejectAssignmentStep(assignmentId, stepId) {
  const pack = await getAssignmentSteps(assignmentId);
  if (!pack) {
    const err = new Error('Attribution introuvable.');
    err.status = 404;
    throw err;
  }
  const step = pack.steps.find((s) => Number(s.id) === Number(stepId));
  if (!step) {
    const err = new Error('Étape introuvable.');
    err.status = 404;
    throw err;
  }
  if (step.status !== 'submitted') {
    const err = new Error('Aucune demande de validation à refuser.');
    err.status = 400;
    throw err;
  }
  await pool.execute(
    `DELETE FROM project_assignment_step_status
     WHERE assignment_id = ? AND step_id = ?`,
    [assignmentId, stepId]
  );
  await recomputeProgress(assignmentId);
  return getAssignmentSteps(assignmentId);
}

async function listPendingStepValidations() {
  const assignments = await listAssignments();
  const pending = [];
  for (const a of assignments) {
    const pack = await getAssignmentSteps(a.id);
    for (const step of pack.steps) {
      if (step.status === 'submitted') {
        pending.push({
          assignment_id: a.id,
          assignment_label: a.label,
          project_id: a.project_id,
          project_titre: a.project_titre,
          step_id: step.id,
          step_titre: step.titre,
          step_ordre: step.ordre,
          requires_document: step.requires_document,
          document_path: step.document_path,
          document_name: step.document_name,
          submitted_at: step.submitted_at,
          progress: pack.progress,
        });
      }
    }
  }
  return pending;
}

/** Page publique : catalogue membres (hors réalisations / archives déjà au showroom) */
async function listPublicProjects() {
  const [selectable, assignments] = await Promise.all([
    listSelectableProjects(),
    listAssignments(),
  ]);
  const byProject = new Map();
  for (const a of assignments) {
    if (!byProject.has(a.project_id)) byProject.set(a.project_id, []);
    byProject.get(a.project_id).push({
      id: a.id,
      label: a.label,
      progress: a.progress ?? 0,
      published: !!a.published,
      published_at: a.published_at || null,
      supervisors: a.supervisors,
      members: a.members,
    });
  }
  return selectable.map((p) => ({
    id: p.id,
    titre: p.titre,
    description: p.description,
    image: p.image || null,
    gallery: p.gallery || [],
    archive_year: p.archive_year || null,
    project_lead: p.project_lead || null,
    groups: byProject.get(p.id) || [],
    has_published: false,
  }));
}

function redactStepDocuments(pack, { allowDocs }) {
  if (!pack) return pack;
  return {
    ...pack,
    docs_locked: !allowDocs,
    steps: (pack.steps || []).map((s) => {
      if (allowDocs) return s;
      const hasDoc = !!(s.document_path || s.document_name);
      return {
        ...s,
        document_path: null,
        document_name: hasDoc ? null : null,
        has_document: hasDoc,
      };
    }),
  };
}

async function listPublishedRealizations() {
  const assignments = await listAssignments();
  const published = assignments.filter((a) => a.published || Number(a.progress) >= 100);
  const byProject = new Map();

  for (const a of published) {
    const group = {
      id: a.id,
      label: a.label,
      progress: a.progress,
      published: true,
      published_at: a.published_at,
      supervisors: a.supervisors,
      members: (a.members || []).map((m) => ({
        id: m.id,
        prenom: m.prenom,
        nom: m.nom,
        filiere: m.filiere,
        photo: m.photo,
      })),
    };

    if (!byProject.has(a.project_id)) {
      const archiveYear =
        a.archive_year != null && !Number.isNaN(Number(a.archive_year))
          ? Number(a.archive_year)
          : null;
      byProject.set(a.project_id, {
        id: a.project_id,
        project_id: a.project_id,
        project_titre: a.project_titre,
        project_description: a.project_description,
        project_image: a.project_image,
        project_gallery: parseGallery(a.project_gallery),
        archive_year: archiveYear,
        archive_season_label: archiveYear ? archiveSeasonLabel(archiveYear) : null,
        project_lead: resolveStoredOrSeasonLead(
          a.project_lead,
          archiveYear || currentArchiveEndYear()
        ),
        published_at: a.published_at,
        groups: [group],
      });
      continue;
    }

    const entry = byProject.get(a.project_id);
    entry.groups.push(group);
    if (
      a.published_at &&
      (!entry.published_at || new Date(a.published_at) < new Date(entry.published_at))
    ) {
      entry.published_at = a.published_at;
    }
  }

  return sortShowcaseRealizations(Array.from(byProject.values()));
}

module.exports = {
  getSettings,
  updateSettings,
  listProjects,
  listSelectableProjects,
  listRealizedProjects,
  assertProjectSelectable,
  getProject,
  createProject,
  updateProject,
  removeProject,
  findSubmissionBySubmitter,
  isSubmissionAssigned,
  removeSubmissionBySubmitter,
  getSubmissionDetail,
  createSubmission,
  listGroupSubmissions,
  listSoloSubmissions,
  createAssignmentFromGroup,
  createAssignmentFromSolos,
  getAssignmentDetail,
  listAssignments,
  updateAssignmentProgress,
  removeAssignment,
  listPublicProjects,
  listPublishedRealizations,
  redactStepDocuments,
  listProjectSteps,
  getProjectStep,
  createProjectStep,
  updateProjectStep,
  removeProjectStep,
  getAssignmentSteps,
  listMyAssignments,
  memberCanAccessAssignment,
  submitAssignmentStep,
  validateAssignmentStep,
  rejectAssignmentStep,
  listPendingStepValidations,
  recomputeProgress,
  resolveMemberIdByEmail,
};
