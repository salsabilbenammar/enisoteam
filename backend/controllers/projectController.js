const projectModel = require('../models/projectModuleModel');
const memberModel = require('../models/memberModel');

function parseJsonField(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function photoMapFromFiles(files) {
  const map = new Map();
  for (const file of files || []) {
    if (file.fieldname === 'photo') {
      map.set(0, `/uploads/project-members/${file.filename}`);
      continue;
    }
    const m = /^photo_(\d+)$/.exec(file.fieldname);
    if (m) {
      map.set(Number(m[1]), `/uploads/project-members/${file.filename}`);
    }
  }
  return map;
}

function parseSupervisorsBody(body) {
  if (Array.isArray(body?.supervisors)) return body.supervisors;
  if (typeof body?.supervisors === 'string') {
    const raw = body.supervisors.trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
    return raw.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function getPublicProjects(req, res, next) {
  try {
    const { isClubMember } = require('../middlewares/authMiddleware');
    if (!isClubMember(req.user)) {
      return res.status(403).json({
        message: 'Le catalogue des projets est réservé aux membres ENISO Team.',
        catalog_locked: true,
        projects: [],
      });
    }
    res.json(await projectModel.listPublicProjects());
  } catch (err) {
    next(err);
  }
}

async function getPublishedRealizations(_req, res, next) {
  try {
    res.json(await projectModel.listPublishedRealizations());
  } catch (err) {
    next(err);
  }
}

async function getFormStatus(_req, res, next) {
  try {
    const settings = await projectModel.getSettings();
    const projects = await projectModel.listSelectableProjects();
    res.json({
      form_open: settings.form_open,
      group_size: settings.group_size,
      choices_count: settings.choices_count,
      projects: settings.form_open ? projects : [],
    });
  } catch (err) {
    next(err);
  }
}

async function getMySubmission(req, res, next) {
  try {
    const memberId = Number(req.user?.id);
    if (!memberId) {
      return res.status(401).json({ message: 'Compte membre invalide.' });
    }
    const existing = await projectModel.findSubmissionBySubmitter(memberId);
    if (!existing) {
      return res.json({
        submitted: false,
        submission: null,
        assigned: false,
        can_delete: false,
      });
    }
    const submission = await projectModel.getSubmissionDetail(existing.id);
    const assigned = await projectModel.isSubmissionAssigned(existing.id);
    res.json({
      submitted: true,
      submission,
      assigned,
      can_delete: !assigned,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteMySubmission(req, res, next) {
  try {
    const result = await projectModel.removeSubmissionBySubmitter(req.user.id);
    if (!result.ok) {
      if (result.reason === 'assigned') {
        return res.status(409).json({
          message: 'Impossible de supprimer : votre soumission a déjà été attribuée.',
        });
      }
      return res.status(404).json({ message: 'Aucune soumission à supprimer.' });
    }
    res.json({ message: 'Soumission supprimée. Vous pouvez renvoyer le formulaire.' });
  } catch (err) {
    next(err);
  }
}

async function submitForm(req, res, next) {
  try {
    const settings = await projectModel.getSettings();
    if (!settings.form_open) {
      return res.status(403).json({ message: 'Le formulaire de projets est fermé.' });
    }

    const existing = await projectModel.findSubmissionBySubmitter(req.user.id);
    if (existing) {
      return res.status(409).json({ message: 'Vous avez déjà soumis le formulaire.' });
    }

    const member = await memberModel.findById(req.user.id);
    if (!member || !member.actif) {
      return res.status(403).json({ message: 'Compte membre invalide.' });
    }

    if (req.body.type === 'solo') {
      return res.status(400).json({
        message: 'Le mode solo n’est plus disponible. Choisissez une taille de groupe de 1 membre.',
      });
    }

    const type = 'group';
    const choicesRaw = parseJsonField(req.body.choices, []);
    const participantsRaw = parseJsonField(req.body.participants, []);
    const photos = photoMapFromFiles(req.files);

    if (choicesRaw.length !== settings.choices_count) {
      return res.status(400).json({
        message: `Sélectionnez exactement ${settings.choices_count} projet(s) classé(s).`,
      });
    }

    const ranks = choicesRaw.map((c) => Number(c.preference_rank));
    const projectIds = choicesRaw.map((c) => Number(c.project_id));
    if (new Set(ranks).size !== ranks.length || new Set(projectIds).size !== projectIds.length) {
      return res.status(400).json({ message: 'Classement invalide (doublons).' });
    }
    for (let i = 1; i <= settings.choices_count; i += 1) {
      if (!ranks.includes(i)) {
        return res.status(400).json({ message: `Il manque le choix n°${i}.` });
      }
    }

    const catalog = await projectModel.listSelectableProjects();
    const catalogIds = new Set(catalog.map((p) => Number(p.id)));
    for (const id of projectIds) {
      if (!catalogIds.has(id)) {
        return res.status(400).json({ message: 'Projet sélectionné invalide.' });
      }
    }

    let participants;
    if (!participantsRaw.length || participantsRaw.length > settings.group_size) {
      return res.status(400).json({
        message: `Indiquez entre 1 et ${settings.group_size} membre(s) du groupe.`,
      });
    }
    participants = participantsRaw.map((p, idx) => ({
      member_id: idx === 0 ? member.id : null,
      prenom: String(p.prenom || '').trim(),
      nom: String(p.nom || '').trim(),
      email: String(p.email || '').trim().toLowerCase(),
      telephone: String(p.telephone || '').trim(),
      filiere: String(p.filiere || '').trim(),
      photo: photos.get(idx) || null,
      is_submitter: idx === 0,
    }));
    if (
      participants.some(
        (p) => !p.prenom || !p.nom || !p.email || !p.telephone || !p.filiere || !p.photo
      )
    ) {
      return res.status(400).json({
        message:
          'Tous les membres sont requis (prénom, nom, email, téléphone, filière et photo).',
      });
    }
    participants[0].email = String(member.email).toLowerCase();
    participants[0].member_id = member.id;
    participants[0].is_submitter = true;

    const choices = choicesRaw.map((c) => ({
      project_id: Number(c.project_id),
      preference_rank: Number(c.preference_rank),
    }));

    const submission = await projectModel.createSubmission({
      type,
      submitter_member_id: member.id,
      group_label: String(req.body.group_label || '').trim() || null,
      participants,
      choices,
    });

    res.status(201).json({ message: 'Formulaire envoyé.', submission });
  } catch (err) {
    next(err);
  }
}

/* ─── Admin ─── */

async function adminGetSettings(_req, res, next) {
  try {
    res.json(await projectModel.getSettings());
  } catch (err) {
    next(err);
  }
}

async function adminUpdateSettings(req, res, next) {
  try {
    res.json(await projectModel.updateSettings(req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function adminListProjects(req, res, next) {
  try {
    if (req.query.realized === '1' || req.query.archived === '1') {
      return res.json(await projectModel.listRealizedProjects());
    }
    if (req.query.all === '1') {
      return res.json(await projectModel.listProjects());
    }
    return res.json(await projectModel.listSelectableProjects());
  } catch (err) {
    next(err);
  }
}

async function adminCreateProject(req, res, next) {
  try {
    const { titre, description, archive_year, project_lead } = req.body || {};
    if (!titre || !description) {
      return res.status(400).json({ message: 'Titre et description requis.' });
    }
    const image = req.file ? `/uploads/projects/${req.file.filename}` : null;
    const row = await projectModel.createProject({
      titre,
      description,
      image,
      archive_year,
      project_lead,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function adminUpdateProject(req, res, next) {
  try {
    const { titre, description, archive_year, project_lead } = req.body || {};
    if (!titre || !description) {
      return res.status(400).json({ message: 'Titre et description requis.' });
    }
    const data = { titre, description };
    if (archive_year !== undefined) data.archive_year = archive_year;
    if (project_lead !== undefined) data.project_lead = project_lead;
    if (req.file) data.image = `/uploads/projects/${req.file.filename}`;
    const row = await projectModel.updateProject(req.params.id, data);
    if (!row) return res.status(404).json({ message: 'Projet introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function adminRemoveProject(req, res, next) {
  try {
    const ok = await projectModel.removeProject(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Projet introuvable.' });
    res.json({ message: 'Projet supprimé.' });
  } catch (err) {
    next(err);
  }
}

async function adminListSubmissions(_req, res, next) {
  try {
    const [groups, settings] = await Promise.all([
      projectModel.listGroupSubmissions(),
      projectModel.getSettings(),
    ]);
    res.json({ settings, groups, solos: [] });
  } catch (err) {
    next(err);
  }
}

async function adminListAssignments(req, res, next) {
  try {
    const year = req.query.year != null && req.query.year !== '' ? Number(req.query.year) : undefined;
    res.json(await projectModel.listAssignments({ year }));
  } catch (err) {
    next(err);
  }
}

async function adminAssignGroup(req, res, next) {
  try {
    const { submission_id, project_id, label } = req.body || {};
    const supervisors = parseSupervisorsBody(req.body);
    if (!submission_id || !project_id) {
      return res.status(400).json({ message: 'Soumission et projet requis.' });
    }
    if (!supervisors.length) {
      return res.status(400).json({ message: 'Ajoutez au moins un superviseur.' });
    }
    const row = await projectModel.createAssignmentFromGroup({
      submission_id: Number(submission_id),
      project_id: Number(project_id),
      supervisors,
      label,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminAssignSolos(req, res, next) {
  try {
    const { project_id, label, submission_ids } = req.body || {};
    const supervisors = parseSupervisorsBody(req.body);
    if (!project_id) {
      return res.status(400).json({ message: 'Projet requis.' });
    }
    if (!supervisors.length) {
      return res.status(400).json({ message: 'Ajoutez au moins un superviseur.' });
    }
    const row = await projectModel.createAssignmentFromSolos({
      project_id: Number(project_id),
      supervisors,
      label,
      submission_ids,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminUpdateAssignmentProgress(req, res, next) {
  try {
    if (req.body?.progress === undefined || req.body?.progress === null || req.body?.progress === '') {
      return res.status(400).json({ message: 'Progression requise (0–100).' });
    }
    const row = await projectModel.updateAssignmentProgress(req.params.id, req.body.progress);
    if (!row) return res.status(404).json({ message: 'Attribution introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function adminRemoveAssignment(req, res, next) {
  try {
    const ok = await projectModel.removeAssignment(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Attribution introuvable.' });
    res.json({ message: 'Attribution supprimée.' });
  } catch (err) {
    next(err);
  }
}

/* Étapes */
async function adminListProjectSteps(req, res, next) {
  try {
    res.json(await projectModel.listProjectSteps(Number(req.params.projectId)));
  } catch (err) {
    next(err);
  }
}

async function adminCreateProjectStep(req, res, next) {
  try {
    const { titre, description, ordre, requires_document } = req.body || {};
    if (!titre || !String(titre).trim()) {
      return res.status(400).json({ message: 'Titre de l’étape requis.' });
    }
    const row = await projectModel.createProjectStep({
      project_id: Number(req.params.projectId),
      titre,
      description,
      ordre,
      requires_document,
    });
    res.status(201).json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminUpdateProjectStep(req, res, next) {
  try {
    const row = await projectModel.updateProjectStep(Number(req.params.stepId), req.body || {});
    if (!row) return res.status(404).json({ message: 'Étape introuvable.' });
    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function adminRemoveProjectStep(req, res, next) {
  try {
    const ok = await projectModel.removeProjectStep(Number(req.params.stepId));
    if (!ok) return res.status(404).json({ message: 'Étape introuvable.' });
    res.json({ message: 'Étape supprimée.' });
  } catch (err) {
    next(err);
  }
}

async function adminGetAssignmentSteps(req, res, next) {
  try {
    const pack = await projectModel.getAssignmentSteps(Number(req.params.id));
    if (!pack) return res.status(404).json({ message: 'Attribution introuvable.' });
    res.json(pack);
  } catch (err) {
    next(err);
  }
}

async function adminValidateStep(req, res, next) {
  try {
    const pack = await projectModel.validateAssignmentStep(
      Number(req.params.id),
      Number(req.params.stepId)
    );
    res.json(pack);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminRejectStep(req, res, next) {
  try {
    const pack = await projectModel.rejectAssignmentStep(
      Number(req.params.id),
      Number(req.params.stepId)
    );
    res.json(pack);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

async function adminListPendingSteps(req, res, next) {
  try {
    res.json(await projectModel.listPendingStepValidations());
  } catch (err) {
    next(err);
  }
}

async function getPublicAssignmentSteps(req, res, next) {
  try {
    const pack = await projectModel.getAssignmentSteps(Number(req.params.id));
    if (!pack) return res.status(404).json({ message: 'Attribution introuvable.' });
    const allowDocs = require('../middlewares/authMiddleware').isClubMember(req.user);
    const safe = projectModel.redactStepDocuments(pack, { allowDocs });
    res.json({
      ...safe,
      can_edit: false,
      can_view_docs: allowDocs,
      published: !!(pack.assignment?.published || Number(pack.progress) >= 100),
    });
  } catch (err) {
    next(err);
  }
}

async function listMyAssignments(req, res, next) {
  try {
    res.json(await projectModel.listMyAssignments(req.user));
  } catch (err) {
    next(err);
  }
}

async function getMyAssignmentSteps(req, res, next) {
  try {
    const access = await projectModel.memberCanAccessAssignment(Number(req.params.id), req.user);
    if (access === null) return res.status(404).json({ message: 'Attribution introuvable.' });
    if (access === false) {
      return res.status(403).json({
        message: 'Seuls les membres de ce groupe peuvent agir sur les étapes.',
      });
    }
    const pack = await projectModel.getAssignmentSteps(Number(req.params.id));
    res.json({
      ...pack,
      can_edit: true,
      can_view_docs: true,
      published: !!(pack.assignment?.published || Number(pack.progress) >= 100),
    });
  } catch (err) {
    next(err);
  }
}

async function downloadStepDocument(req, res, next) {
  try {
    const pathMod = require('path');
    const fs = require('fs');
    const { uploadsRoot } = require('../middlewares/uploadMiddleware');
    const filename = pathMod.basename(String(req.params.filename || ''));
    if (!filename || filename.includes('..')) {
      return res.status(400).json({ message: 'Fichier invalide.' });
    }
    const full = pathMod.join(uploadsRoot, 'project-steps', filename);
    if (!fs.existsSync(full)) {
      return res.status(404).json({ message: 'Document introuvable.' });
    }
    res.download(full, filename);
  } catch (err) {
    next(err);
  }
}

async function submitMyStep(req, res, next) {
  try {
    const access = await projectModel.memberCanAccessAssignment(Number(req.params.id), req.user);
    if (access === null) return res.status(404).json({ message: 'Attribution introuvable.' });
    if (access === false) {
      return res.status(403).json({
        message: 'Seuls les membres attribués à ce groupe peuvent marquer une étape.',
      });
    }

    const document = req.file
      ? {
          path: `/uploads/project-steps/${req.file.filename}`,
          originalname: req.file.originalname,
        }
      : null;

    const pack = await projectModel.submitAssignmentStep(
      Number(req.params.id),
      Number(req.params.stepId),
      req.user.id,
      document
    );
    res.json({
      ...pack,
      can_edit: true,
      can_view_docs: true,
      published: !!(pack.assignment?.published || Number(pack.progress) >= 100),
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

module.exports = {
  getPublicProjects,
  getPublishedRealizations,
  getFormStatus,
  getMySubmission,
  deleteMySubmission,
  submitForm,
  adminGetSettings,
  adminUpdateSettings,
  adminListProjects,
  adminCreateProject,
  adminUpdateProject,
  adminRemoveProject,
  adminListSubmissions,
  adminListAssignments,
  adminAssignGroup,
  adminAssignSolos,
  adminUpdateAssignmentProgress,
  adminRemoveAssignment,
  adminListProjectSteps,
  adminCreateProjectStep,
  adminUpdateProjectStep,
  adminRemoveProjectStep,
  adminGetAssignmentSteps,
  adminValidateStep,
  adminRejectStep,
  adminListPendingSteps,
  listMyAssignments,
  getMyAssignmentSteps,
  submitMyStep,
  getPublicAssignmentSteps,
  downloadStepDocument,
};
