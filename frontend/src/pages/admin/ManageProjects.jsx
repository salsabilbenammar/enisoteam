import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { assetUrl, openStepDocument } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import styles from './ManageProjects.module.css';
import {
  archiveEndYearFromDate,
  currentArchiveEndYear,
  currentArchiveSeasonLabel,
  formatArchiveSeason,
  seasonLabelForItem,
} from '../../utils/archiveProjects';

const emptyProject = { titre: '', description: '', image: null, existingImage: null, preview: null };

const emptyRealizedProject = () => ({
  ...emptyProject,
  archive_year: String(currentArchiveEndYear()),
  project_lead: '',
});

function SupervisorFields({ values, onChange }) {
  const list = values?.length ? values : [''];
  const update = (idx, value) => {
    const next = [...list];
    next[idx] = value;
    onChange(next);
  };
  const add = () => onChange([...list, '']);
  const remove = (idx) => {
    if (list.length <= 1) {
      onChange(['']);
      return;
    }
    onChange(list.filter((_, i) => i !== idx));
  };
  return (
    <div className={styles.supervisorFields}>
      <label>Superviseurs</label>
      {list.map((name, idx) => (
        <div key={idx} className={styles.supervisorRow}>
          <input
            placeholder={`Superviseur ${idx + 1}`}
            value={name}
            onChange={(e) => update(idx, e.target.value)}
            required={idx === 0}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => remove(idx)}>
            −
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        + Ajouter un superviseur
      </button>
    </div>
  );
}

function formatSupervisors(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—';
  return value || '—';
}

/** Année de fin de saison pour filtrage attributions. */
function assignmentSeasonEndYear(a) {
  if (a?.season_year != null && !Number.isNaN(Number(a.season_year))) {
    return Number(a.season_year);
  }
  if (a?.archive_year != null && !Number.isNaN(Number(a.archive_year))) {
    return Number(a.archive_year);
  }
  if (a?.published_at) return archiveEndYearFromDate(a.published_at);
  if (a?.created_at) return archiveEndYearFromDate(a.created_at);
  return null;
}

const PROJECT_TABS = new Set([
  'catalog',
  'realized',
  'steps',
  'settings',
  'submissions',
  'assignments',
]);

export default function ManageProjects() {
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = PROJECT_TABS.has(tabParam) ? tabParam : 'catalog';
  const editorRef = useRef(null);

  const setTab = (id) => {
    if (!PROJECT_TABS.has(id)) return;
    if (id === 'catalog') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: id }, { replace: true });
    }
  };

  const scrollToEditor = () => {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [projects, setProjects] = useState([]);
  const [realizedProjects, setRealizedProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [realizedForm, setRealizedForm] = useState(emptyRealizedProject);
  const [realizedAdding, setRealizedAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [realizedEditId, setRealizedEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    group_size: 3,
    choices_count: 3,
    form_open: false,
  });

  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignYear, setAssignYear] = useState(currentArchiveSeasonLabel());

  const [groupAssign, setGroupAssign] = useState({});

  const [stepsProjectId, setStepsProjectId] = useState('');
  const [projectSteps, setProjectSteps] = useState([]);
  const [stepForm, setStepForm] = useState({
    titre: '',
    description: '',
    ordre: '',
    requires_document: false,
  });
  const [assignmentSteps, setAssignmentSteps] = useState({});
  const [pendingSteps, setPendingSteps] = useState([]);

  const flash = (msg) => {
    setSuccess(msg);
    setError('');
  };

  const loadCatalog = () => api.get('/projects/catalog').then((r) => setProjects(r.data || []));
  const loadRealizedProjects = () =>
    api.get('/projects/catalog', { params: { realized: '1' } }).then((r) => {
      setRealizedProjects(r.data || []);
      return r.data || [];
    });
  const loadSettings = () => api.get('/projects/settings').then((r) => setSettings(r.data));
  const loadSubmissions = () =>
    api.get('/projects/submissions').then((r) => {
      setGroups(r.data.groups || []);
      if (r.data.settings) setSettings(r.data.settings);
    });
  const loadAssignments = async () => {
    const { data } = await api.get('/projects/assignments');
    setAssignments(data);
    if (!data.length) {
      setAssignmentSteps({});
      return data;
    }
    const packs = await Promise.all(
      data.map((a) =>
        api
          .get(`/projects/assignments/${a.id}/steps`)
          .then((r) => [a.id, r.data])
          .catch(() => [a.id, null])
      )
    );
    setAssignmentSteps(Object.fromEntries(packs));
    return data;
  };
  const loadPendingSteps = () =>
    api.get('/projects/assignments/pending-steps').then((r) => setPendingSteps(r.data || []));
  const loadProjectSteps = (projectId) => {
    if (!projectId) {
      setProjectSteps([]);
      return Promise.resolve();
    }
    return api
      .get(`/projects/catalog/${projectId}/steps`)
      .then((r) => setProjectSteps(r.data || []));
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCatalog(),
        loadRealizedProjects(),
        loadSettings(),
        loadSubmissions(),
        loadAssignments(),
        loadPendingSteps(),
      ]);
    } catch {
      setError('Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (tab === 'steps' && stepsProjectId) {
      loadProjectSteps(stepsProjectId).catch(() => setError('Chargement des étapes impossible.'));
    }
  }, [tab, stepsProjectId]);

  useEffect(() => {
    if (!projects.length) {
      if (stepsProjectId) setStepsProjectId('');
      return;
    }
    const stillValid = projects.some((p) => String(p.id) === String(stepsProjectId));
    if (!stepsProjectId || !stillValid) {
      setStepsProjectId(String(projects[0].id));
    }
  }, [projects, stepsProjectId]);

  const maxGroupSize = Math.max(1, Number(settings.group_size) || 3);
  const completeGroups = useMemo(
    () => groups.filter((g) => (g.participants || []).length >= maxGroupSize),
    [groups, maxGroupSize]
  );
  const incompleteGroups = useMemo(
    () => groups.filter((g) => (g.participants || []).length < maxGroupSize),
    [groups, maxGroupSize]
  );

  const assignmentById = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.id, a])),
    [assignments]
  );

  const assignYearOptions = useMemo(() => {
    const labels = new Set(
      assignments
        .map((a) => a.season_label || formatArchiveSeason(assignmentSeasonEndYear(a)))
        .filter(Boolean)
    );
    labels.add(currentArchiveSeasonLabel());
    return [...labels]
      .sort((a, b) => {
        const endA = Number(a.split('/')[1]) || 0;
        const endB = Number(b.split('/')[1]) || 0;
        return endB - endA;
      })
      .map((label) => ({ value: label, label }));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    if (assignYear === 'all') return assignments;
    return assignments.filter(
      (a) => (a.season_label || formatArchiveSeason(assignmentSeasonEndYear(a))) === assignYear
    );
  }, [assignments, assignYear]);

  const filteredPendingSteps = useMemo(() => {
    if (assignYear === 'all') return pendingSteps;
    return pendingSteps.filter((p) => {
      const a = assignmentById[p.assignment_id];
      if (!a) return false;
      return (a.season_label || formatArchiveSeason(assignmentSeasonEndYear(a))) === assignYear;
    });
  }, [pendingSteps, assignYear, assignmentById]);

  useEffect(() => {
    if (assignYear === 'all') return;
    const validValues = new Set(['all', ...assignYearOptions.map((o) => o.value)]);
    if (assignYearOptions.length && !validValues.has(assignYear)) {
      setAssignYear(assignYearOptions[0].value);
    }
  }, [assignYearOptions, assignYear]);

  const renderGroupCard = (g, idx) => {
    const count = (g.participants || []).length;
    return (
      <article key={g.id} className={styles.submissionCard}>
        <header>
          <strong>
            #{idx + 1} — Groupe #{g.id}
          </strong>
          <span className={styles.badge}>
            {count}/{maxGroupSize} membre{count > 1 ? 's' : ''}
          </span>
          <span className={styles.badge}>
            {new Date(g.submitted_at).toLocaleString('fr-FR')}
          </span>
          {g.assigned && <span className={`${styles.badge} ${styles.badgeOk}`}>Attribué</span>}
        </header>
        <div className={styles.memberList}>
          {(g.participants || []).map((p) => (
            <div key={p.id || `${p.email}-${p.prenom}`} className={styles.memberItem}>
              {p.photo ? (
                <img src={assetUrl(p.photo)} alt="" />
              ) : (
                <span>{(p.prenom || '?').slice(0, 1)}</span>
              )}
              <div>
                <strong>
                  {p.prenom} {p.nom}
                </strong>
                <small>{[p.telephone, p.filiere].filter(Boolean).join(' · ') || '—'}</small>
              </div>
            </div>
          ))}
        </div>
        <ul className={styles.choices}>
          {(g.choices || []).map((c) => (
            <li key={c.id}>
              <span>{c.preference_rank}</span>
              {c.project_titre}
            </li>
          ))}
        </ul>
        {!g.assigned && (
          <div className={styles.assignBox}>
            <select
              value={groupAssign[g.id]?.project_id || ''}
              onChange={(e) =>
                setGroupAssign((prev) => ({
                  ...prev,
                  [g.id]: { ...prev[g.id], project_id: e.target.value },
                }))
              }
            >
              <option value="">Projet à attribuer…</option>
              {(g.choices || []).map((c) => (
                <option key={c.project_id} value={c.project_id}>
                  {c.preference_rank}. {c.project_titre}
                </option>
              ))}
            </select>
            <input
              placeholder="Label groupe (optionnel)"
              value={groupAssign[g.id]?.label || ''}
              onChange={(e) =>
                setGroupAssign((prev) => ({
                  ...prev,
                  [g.id]: { ...prev[g.id], label: e.target.value },
                }))
              }
            />
            <SupervisorFields
              values={groupAssign[g.id]?.supervisors || ['']}
              onChange={(supervisors) =>
                setGroupAssign((prev) => ({
                  ...prev,
                  [g.id]: { ...prev[g.id], supervisors },
                }))
              }
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={() => assignGroup(g.id)}
            >
              Attribuer
            </button>
          </div>
        )}
      </article>
    );
  };

  const resetRealizedForm = () => {
    setRealizedEditId(null);
    setRealizedAdding(false);
    setRealizedForm(emptyRealizedProject());
  };

  const startAddRealizedProject = () => {
    setTab('realized');
    setRealizedEditId(null);
    setRealizedAdding(true);
    setRealizedForm(emptyRealizedProject());
    scrollToEditor();
  };

  const onRealizedImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setRealizedForm((prev) => ({
      ...prev,
      image: file,
      preview: file
        ? URL.createObjectURL(file)
        : prev.existingImage
          ? assetUrl(prev.existingImage)
          : null,
    }));
  };

  const saveRealizedProject = async (e) => {
    e.preventDefault();
    if (!realizedEditId && !realizedAdding) return;
    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      data.append('titre', realizedForm.titre);
      data.append('description', realizedForm.description);
      if (realizedForm.archive_year != null && realizedForm.archive_year !== '') {
        data.append('archive_year', realizedForm.archive_year);
      } else {
        data.append('archive_year', String(currentArchiveEndYear()));
      }
      if (realizedForm.project_lead != null) {
        data.append('project_lead', realizedForm.project_lead.trim());
      }
      if (realizedForm.image) data.append('image', realizedForm.image);
      if (realizedEditId) {
        await api.put(`/projects/catalog/${realizedEditId}`, data);
        flash('Réalisation mise à jour.');
      } else {
        await api.post('/projects/catalog', data);
        flash('Réalisation ajoutée au showroom.');
      }
      resetRealizedForm();
      await loadRealizedProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const editRealizedProject = (p) => {
    setTab('realized');
    setRealizedAdding(false);
    setRealizedEditId(p.id);
    setRealizedForm({
      titre: p.titre,
      description: p.description,
      image: null,
      existingImage: p.image || null,
      preview: p.image ? assetUrl(p.image) : null,
      archive_year: p.archive_year ? String(p.archive_year) : String(currentArchiveEndYear()),
      project_lead: p.project_lead || '',
    });
    scrollToEditor();
  };

  const resetProjectForm = () => {
    setEditId(null);
    setProjectForm(emptyProject);
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setProjectForm((prev) => ({
      ...prev,
      image: file,
      preview: file ? URL.createObjectURL(file) : prev.existingImage ? assetUrl(prev.existingImage) : null,
    }));
  };

  const saveProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      data.append('titre', projectForm.titre);
      data.append('description', projectForm.description);
      if (projectForm.image) data.append('image', projectForm.image);
      const wasEdit = Boolean(editId);
      if (editId) await api.put(`/projects/catalog/${editId}`, data);
      else await api.post('/projects/catalog', data);
      resetProjectForm();
      flash(wasEdit ? 'Projet mis à jour.' : 'Projet créé.');
      await loadCatalog();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const editProject = (p) => {
    setTab('catalog');
    setEditId(p.id);
    setProjectForm({
      titre: p.titre,
      description: p.description,
      image: null,
      existingImage: p.image || null,
      preview: p.image ? assetUrl(p.image) : null,
    });
    scrollToEditor();
  };

  const deleteProject = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce projet ?',
      message: 'Il disparaîtra du catalogue et des futurs formulaires.',
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/catalog/${id}`);
      flash('Projet supprimé.');
      await loadCatalog();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/projects/settings', settings);
      setSettings(data);
      flash('Configuration enregistrée.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const assignGroup = async (submissionId) => {
    const draft = groupAssign[submissionId] || {};
    if (!draft.project_id) {
      setError('Choisissez un projet pour ce groupe.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/projects/assignments/group', {
        submission_id: submissionId,
        project_id: Number(draft.project_id),
        supervisors: (draft.supervisors || []).map((s) => String(s || '').trim()).filter(Boolean),
        label: draft.label || '',
      });
      flash('Groupe attribué.');
      await Promise.all([loadSubmissions(), loadAssignments()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Attribution impossible.');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette attribution ?',
      message: 'Le groupe disparaîtra de la page Projets.',
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/assignments/${id}`);
      flash('Attribution supprimée.');
      await Promise.all([loadAssignments(), loadSubmissions()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const updateProgress = async (id, progress) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/projects/assignments/${id}/progress`, {
        progress: Number(progress),
      });
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      flash(`Avancement mis à jour : ${data.progress}%.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  const saveStep = async (e) => {
    e.preventDefault();
    if (!stepsProjectId) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/projects/catalog/${stepsProjectId}/steps`, {
        titre: stepForm.titre,
        description: stepForm.description,
        ordre: stepForm.ordre === '' ? undefined : Number(stepForm.ordre),
        requires_document: !!stepForm.requires_document,
      });
      setStepForm({ titre: '', description: '', ordre: '', requires_document: false });
      flash('Étape ajoutée.');
      await Promise.all([loadProjectSteps(stepsProjectId), loadAssignments(), loadPendingSteps()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Ajout d’étape impossible.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStep = async (stepId) => {
    const ok = await confirm({
      title: 'Supprimer cette étape ?',
      message: 'Les validations liées à cette étape seront perdues.',
    });
    if (!ok) return;
    try {
      await api.delete(`/projects/steps/${stepId}`);
      flash('Étape supprimée.');
      await Promise.all([loadProjectSteps(stepsProjectId), loadAssignments(), loadPendingSteps()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const validateStep = async (assignmentId, stepId) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(
        `/projects/assignments/${assignmentId}/steps/${stepId}/validate`
      );
      setAssignmentSteps((prev) => ({ ...prev, [assignmentId]: data }));
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, progress: data.progress } : a
        )
      );
      flash('Étape validée — le groupe peut avancer.');
      await loadPendingSteps();
    } catch (err) {
      setError(err.response?.data?.message || 'Validation impossible.');
    } finally {
      setSaving(false);
    }
  };

  const rejectStep = async (assignmentId, stepId) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post(
        `/projects/assignments/${assignmentId}/steps/${stepId}/reject`
      );
      setAssignmentSteps((prev) => ({ ...prev, [assignmentId]: data }));
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, progress: data.progress } : a
        )
      );
      flash('Demande refusée — le groupe doit reprendre l’étape.');
      await loadPendingSteps();
    } catch (err) {
      setError(err.response?.data?.message || 'Refus impossible.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (status) =>
    ({
      locked: 'Verrouillée',
      current: 'En cours',
      submitted: 'À valider',
      validated: 'Validée',
    }[status] || status);

  if (loading) return <Loader />;

  const thumbSrc = (p) => (p.image ? assetUrl(p.image) : null);

  return (
    <div>
      <header className="page-header">
        <h1>Gestion des projets</h1>
        <p>
          Catalogue, réalisations, étapes, formulaire de sélection, soumissions et attributions.
        </p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.tabs}>
        {[
          ['catalog', 'Catalogue'],
          ['realized', 'Réalisations'],
          ['steps', 'Étapes'],
          ['settings', 'Formulaire'],
          ['submissions', 'Soumissions'],
          ['assignments', 'Attributions'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tabBtn} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <div className={styles.catalogLayout}>
          <form className={`card form ${styles.editor}`} onSubmit={saveProject} ref={editorRef}>
            <h3>{editId ? 'Modifier le projet' : 'Nouveau projet'}</h3>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              Projets en cours uniquement — visibles dans le formulaire de sélection des membres.
            </p>

            <div className={styles.photoBox}>
              {projectForm.preview ? (
                <img src={projectForm.preview} alt="" className={styles.photoPreview} />
              ) : (
                <div className={styles.photoPlaceholder}>
                  <span>Photo optionnelle</span>
                  <small>JPG, PNG, WebP</small>
                </div>
              )}
              <label className={styles.fileBtn}>
                Choisir une image
                <input type="file" accept="image/*" onChange={onImageChange} hidden />
              </label>
            </div>

            <div className="form-group">
              <label>Titre</label>
              <input
                value={projectForm.titre}
                onChange={(e) => setProjectForm({ ...projectForm, titre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description courte</label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                rows={4}
                required
              />
            </div>
            <div className={styles.rowActions}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '…' : editId ? 'Mettre à jour' : 'Créer'}
              </button>
              {editId && (
                <button type="button" className="btn btn-secondary" onClick={resetProjectForm}>
                  Annuler
                </button>
              )}
            </div>
          </form>

          <div className={styles.catalogGrid}>
            {!projects.length && (
              <p className={styles.empty}>Aucun projet en cours dans le catalogue.</p>
            )}
            {projects.map((p) => (
              <article
                key={p.id}
                className={`${styles.catalogCard} ${editId === p.id ? styles.catalogCardActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.catalogCardHit}
                  onClick={() => editProject(p)}
                  aria-label={`Modifier ${p.titre}`}
                >
                  <div className={styles.catalogMedia}>
                    {thumbSrc(p) ? (
                      <img src={thumbSrc(p)} alt="" />
                    ) : (
                      <div className={styles.mediaFallback}>Projet</div>
                    )}
                  </div>
                  <div className={styles.catalogBody}>
                    <h3>{p.titre}</h3>
                    <p>{p.description}</p>
                  </div>
                </button>
                <div className={styles.rowActions}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => editProject(p)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => deleteProject(p.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'realized' && (
        <div className={styles.catalogLayout}>
          <form
            className={`card form ${styles.editor}`}
            onSubmit={saveRealizedProject}
            ref={editorRef}
          >
            <div className={styles.editorHeader}>
              <h3>
                {realizedEditId
                  ? 'Modifier la réalisation'
                  : realizedAdding
                    ? 'Nouvelle réalisation'
                    : 'Réalisations publiées'}
              </h3>
              {!realizedEditId && !realizedAdding && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={startAddRealizedProject}
                >
                  + Ajouter une réalisation
                </button>
              )}
            </div>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              {realizedEditId || realizedAdding
                ? 'Projet affiché dans le showroom public (hors catalogue de sélection).'
                : 'Projets archivés ou publiés. Ajoutez manuellement une réalisation passée, ou modifiez une fiche existante.'}
            </p>
            {realizedEditId || realizedAdding ? (
              <>
                <div className={styles.photoBox}>
                  {realizedForm.preview ? (
                    <img src={realizedForm.preview} alt="" className={styles.photoPreview} />
                  ) : (
                    <div className={styles.photoPlaceholder}>
                      <span>Photo de couverture</span>
                    </div>
                  )}
                  <label className={styles.fileBtn}>
                    Choisir une image
                    <input type="file" accept="image/*" onChange={onRealizedImageChange} hidden />
                  </label>
                </div>
                <div className="form-group">
                  <label>Titre</label>
                  <input
                    value={realizedForm.titre}
                    onChange={(e) =>
                      setRealizedForm({ ...realizedForm, titre: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Saison</label>
                  <input
                    value={formatArchiveSeason(realizedForm.archive_year) || ''}
                    readOnly
                    aria-readonly="true"
                  />
                  <small className={styles.fieldHint}>
                    Calculée automatiquement à la création (saison universitaire en cours).
                  </small>
                </div>
                <div className="form-group">
                  <label>Réalisé par</label>
                  <input
                    value={realizedForm.project_lead || ''}
                    onChange={(e) =>
                      setRealizedForm({ ...realizedForm, project_lead: e.target.value })
                    }
                    placeholder="Ex. : Prénom Nom, Prénom Nom…"
                  />
                  <small className={styles.fieldHint}>
                    Membres ou équipe ayant réalisé ce projet (séparez les noms par des virgules).
                  </small>
                </div>
                <div className="form-group">
                  <label>Description (showroom)</label>
                  <textarea
                    value={realizedForm.description}
                    onChange={(e) =>
                      setRealizedForm({ ...realizedForm, description: e.target.value })
                    }
                    rows={6}
                    required
                  />
                </div>
                <div className={styles.rowActions}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? '…' : realizedEditId ? 'Enregistrer' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={resetRealizedForm}
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.empty} style={{ margin: 0 }}>
                Cliquez sur « Ajouter une réalisation » ou « Modifier » sur une fiche existante.
              </p>
            )}
          </form>

          <div className={styles.catalogGrid}>
            {!realizedProjects.length && (
              <p className={styles.empty}>Aucune réalisation archivée.</p>
            )}
            {realizedProjects.map((p) => (
              <article
                key={p.id}
                className={`${styles.catalogCard} ${realizedEditId === p.id ? styles.catalogCardActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.catalogCardHit}
                  onClick={() => editRealizedProject(p)}
                  aria-label={`Modifier ${p.titre}`}
                >
                  <div className={styles.catalogMedia}>
                    {thumbSrc(p) ? (
                      <img src={thumbSrc(p)} alt={p.titre} />
                    ) : (
                      <div className={styles.mediaFallback}>Projet</div>
                    )}
                    {p.archive_year ? (
                      <span className={styles.archiveBadge}>
                        Réalisation {seasonLabelForItem(p)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.catalogBody}>
                    <h3>{p.titre}</h3>
                    {p.project_lead ? (
                      <p className={styles.metaLine}>Réalisé par : {p.project_lead}</p>
                    ) : null}
                    <p>
                      {p.description?.slice(0, 160)}
                      {p.description?.length > 160 ? '…' : ''}
                    </p>
                    {p.published_groups > 0 ? (
                      <p className={styles.metaLine}>{p.published_groups} groupe(s) publié(s)</p>
                    ) : null}
                  </div>
                </button>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => editRealizedProject(p)}
                  >
                    Modifier
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'steps' && (
        <div className={styles.stepsLayout}>
          <div className={`card form ${styles.editor}`}>
            <h3>Étapes du projet</h3>
            <p className={styles.hint}>
              Tous les groupes attribués à ce projet partagent les mêmes étapes, dans l’ordre.
              Seuls les projets en cours sont listés (pas les réalisations archivées ou publiées).
              Si une étape exige un document, le groupe doit l’uploader puis attendre votre
              validation pour débloquer l’étape suivante.
            </p>
            <div className="form-group">
              <label>Projet</label>
              <select
                value={stepsProjectId}
                onChange={(e) => setStepsProjectId(e.target.value)}
                disabled={!projects.length}
              >
                {!projects.length && (
                  <option value="">Aucun projet en cours disponible</option>
                )}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titre}
                  </option>
                ))}
              </select>
            </div>
            <form onSubmit={saveStep} className={styles.stepAddForm}>
              <div className="form-group">
                <label>Titre de l’étape</label>
                <input
                  value={stepForm.titre}
                  onChange={(e) => setStepForm({ ...stepForm, titre: e.target.value })}
                  required
                  placeholder="Ex. Cahier des charges"
                />
              </div>
              <div className="form-group">
                <label>Description (optionnel)</label>
                <textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  rows={3}
                  placeholder="Ce que le groupe doit livrer…"
                />
              </div>
              <div className="form-group">
                <label>Ordre (optionnel)</label>
                <input
                  type="number"
                  min="0"
                  value={stepForm.ordre}
                  onChange={(e) => setStepForm({ ...stepForm, ordre: e.target.value })}
                  placeholder="Auto"
                />
              </div>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!stepForm.requires_document}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, requires_document: e.target.checked })
                  }
                />
                Document obligatoire (upload par le groupe)
              </label>
              <button type="submit" className="btn btn-primary" disabled={saving || !stepsProjectId}>
                Ajouter l’étape
              </button>
            </form>
          </div>

          <div className={styles.stepsList}>
            {!projectSteps.length && (
              <p className={styles.empty}>Aucune étape pour ce projet. Ajoutez-en à gauche.</p>
            )}
            {projectSteps.map((s, idx) => (
              <article key={s.id} className={styles.stepCard}>
                <div className={styles.stepOrdre}>{idx + 1}</div>
                <div>
                  <h4>{s.titre}</h4>
                  {s.description ? <p>{s.description}</p> : null}
                  {s.requires_document ? (
                    <span className={styles.docBadge}>Document requis</span>
                  ) : (
                    <span className={styles.docBadgeMuted}>Sans document</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => deleteStep(s.id)}
                >
                  Supprimer
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form className={`card form ${styles.settingsCard}`} onSubmit={saveSettings}>
          <div className={styles.statusBanner} data-open={settings.form_open ? '1' : '0'}>
            Formulaire {settings.form_open ? 'ouvert' : 'fermé'}
          </div>
          <h3>Configuration</h3>
          <div className="form-group">
            <label>Taille maximale des groupes</label>
            <input
              type="number"
              min="1"
              value={settings.group_size}
              onChange={(e) => setSettings({ ...settings, group_size: e.target.value })}
              required
            />
            <p className={styles.hint}>
              Les membres peuvent former un groupe de 1 jusqu’à ce maximum. Les groupes complets et
              incomplets sont listés séparément dans Soumissions.
            </p>
          </div>
          <div className="form-group">
            <label>Nombre de choix à classer</label>
            <input
              type="number"
              min="1"
              value={settings.choices_count}
              onChange={(e) => setSettings({ ...settings, choices_count: e.target.value })}
              required
            />
          </div>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={!!settings.form_open}
              onChange={(e) => setSettings({ ...settings, form_open: e.target.checked })}
            />
            <span>Ouvrir le formulaire aux membres</span>
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Enregistrer
          </button>
        </form>
      )}

      {tab === 'submissions' && (
        <div className={styles.submissionsStack}>
          <div className={styles.grid2}>
            <section className={`card ${styles.panel}`}>
              <h3>
                Groupes complets ({completeGroups.length}) — {maxGroupSize}/{maxGroupSize}
              </h3>
              {!completeGroups.length && (
                <p className={styles.empty}>Aucun groupe complet pour le moment.</p>
              )}
              {completeGroups.map((g, idx) => renderGroupCard(g, idx))}
            </section>

            <section className={`card ${styles.panel}`}>
              <h3>Groupes incomplets ({incompleteGroups.length}) — moins de {maxGroupSize}</h3>
              {!incompleteGroups.length && (
                <p className={styles.empty}>Aucun groupe incomplet.</p>
              )}
              {incompleteGroups.map((g, idx) => renderGroupCard(g, idx))}
            </section>
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className={styles.assignSection}>
          <div className={styles.assignFilters}>
            <label>
              Année
              <select value={assignYear} onChange={(e) => setAssignYear(e.target.value)}>
                <option value="all">Toutes les années</option>
                {assignYearOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.metaLine}>
              {filteredAssignments.length} attribution{filteredAssignments.length > 1 ? 's' : ''}
              {assignYear !== 'all' ? ` · ${assignYear}` : ''}
            </span>
          </div>

          {filteredPendingSteps.length > 0 && (
            <div className={styles.pendingBox}>
              <h3>Validations en attente ({filteredPendingSteps.length})</h3>
              <ul className={styles.pendingList}>
                {filteredPendingSteps.map((p) => (
                  <li key={`${p.assignment_id}-${p.step_id}`}>
                    <div>
                      <strong>
                        {p.project_titre} · {p.assignment_label}
                      </strong>
                      <span>
                        Étape : {p.step_titre}
                        {p.requires_document ? ' · document' : ''}
                      </span>
                      {p.document_path ? (
                        <button
                          type="button"
                          className={styles.docLink}
                          onClick={() =>
                            openStepDocument(p.document_path, p.document_name)
                          }
                        >
                          📄 {p.document_name || 'Voir le document'}
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.pendingActions}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={saving}
                        onClick={() => validateStep(p.assignment_id, p.step_id)}
                      >
                        Valider
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={saving}
                        onClick={() => rejectStep(p.assignment_id, p.step_id)}
                      >
                        Refuser
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.assignGrid}>
            {!filteredAssignments.length && (
              <p className={styles.empty}>
                {assignments.length
                  ? 'Aucune attribution pour cette année.'
                  : 'Aucune attribution.'}
              </p>
            )}
            {filteredAssignments.map((a) => {
              const pack = assignmentSteps[a.id];
              const steps = pack?.steps || [];
              const progress =
                pack?.progress != null ? pack.progress : Number(a.progress) || 0;
              return (
                <article key={a.id} className={styles.assignCard}>
                  <div className={styles.assignMedia}>
                    {a.project_image ? (
                      <img src={assetUrl(a.project_image)} alt={a.project_titre} />
                    ) : (
                      <div className={styles.mediaFallback}>Projet</div>
                    )}
                  </div>
                  <div className={styles.assignBody}>
                    <h3>{a.project_titre}</h3>
                    <p>
                      <strong>{a.label}</strong>
                      {seasonLabelForItem(a) ? (
                        <span className={styles.assignYearTag}> · {seasonLabelForItem(a)}</span>
                      ) : null}
                    </p>
                    <div className={styles.progressBox}>
                      <div className={styles.progressHead}>
                        <span>Avancement</span>
                        <strong>{progress}%</strong>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {steps.length > 0 ? (
                        <p className={styles.progressMeta}>
                          {pack.validated_count}/{pack.total_steps} étapes validées
                        </p>
                      ) : (
                        <div className={styles.progressControls}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={progress}
                            disabled={saving}
                            onChange={(e) =>
                              setAssignments((prev) =>
                                prev.map((row) =>
                                  row.id === a.id
                                    ? { ...row, progress: Number(e.target.value) }
                                    : row
                                )
                              )
                            }
                            onMouseUp={(e) => updateProgress(a.id, e.target.value)}
                            onTouchEnd={(e) => updateProgress(a.id, e.target.value)}
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={progress}
                            disabled={saving}
                            onChange={(e) =>
                              setAssignments((prev) =>
                                prev.map((row) =>
                                  row.id === a.id
                                    ? { ...row, progress: Number(e.target.value) }
                                    : row
                                )
                              )
                            }
                            onBlur={(e) => updateProgress(a.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    {steps.length > 0 && (
                      <ol className={styles.stepMiniList}>
                        {steps.map((s, idx) => {
                          const canValidate =
                            s.status === 'submitted' ||
                            (s.status === 'current' && !s.requires_document);
                          return (
                            <li key={s.id} data-status={s.status}>
                              <span>
                                {idx + 1}. {s.titre}
                                {s.requires_document ? ' 📎' : ''}
                              </span>
                              <em>{statusLabel(s.status)}</em>
                              {s.document_path ? (
                                <button
                                  type="button"
                                  className={styles.docLink}
                                  onClick={() =>
                                    openStepDocument(s.document_path, s.document_name)
                                  }
                                >
                                  {s.document_name || 'Document'}
                                </button>
                              ) : null}
                              {canValidate ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={saving}
                                  onClick={() => validateStep(a.id, s.id)}
                                >
                                  Valider
                                </button>
                              ) : null}
                              {s.status === 'submitted' ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={saving}
                                  onClick={() => rejectStep(a.id, s.id)}
                                >
                                  Refuser
                                </button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    <p className={styles.metaLine}>
                      Superviseur(s) : {formatSupervisors(a.supervisors)}
                    </p>
                    <div className={styles.memberList}>
                      {(a.members || []).map((m) => (
                        <div key={m.id || `${m.email}-${m.prenom}`} className={styles.memberItem}>
                          {m.photo ? (
                            <img src={assetUrl(m.photo)} alt="" />
                          ) : (
                            <span>{(m.prenom || '?').slice(0, 1)}</span>
                          )}
                          <div>
                            <strong>
                              {m.prenom} {m.nom}
                            </strong>
                            <small>
                              {[m.telephone, m.filiere].filter(Boolean).join(' · ') || '—'}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeAssignment(a.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
