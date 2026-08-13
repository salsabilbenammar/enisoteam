import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api, { assetUrl, openStepDocument } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/common/ConfirmDialog';
import {
  formatArchiveSeason,
  resolveProjectLead,
  seasonLabelForItem,
} from '../../utils/archiveProjects';
import styles from './Projects.module.css';

const STEP_LABEL = {
  locked: 'Verrouillée',
  current: 'À faire',
  submitted: 'En attente admin',
  validated: 'Validée',
};

function realizationSeasonLabel(item) {
  return seasonLabelForItem(item);
}

function shortArchiveGroupLabel(label) {
  const match = String(label || '').match(/équipe\s*(\d+)/iu);
  return match ? `Équipe ${match[1]}` : label;
}

function userInGroup(user, group) {
  if (!user || !group?.members?.length) return false;
  const email = String(user.email || '')
    .trim()
    .toLowerCase();
  return group.members.some((m) => {
    const memberEmail = String(m.email || '')
      .trim()
      .toLowerCase();
    // Email commun (admin ou membre)
    if (email && memberEmail && email === memberEmail) return true;
    // Compte membre lié par id
    if (
      user.role === 'member' &&
      user.id &&
      m.member_id &&
      Number(m.member_id) === Number(user.id)
    ) {
      return true;
    }
    return false;
  });
}

function GroupStepsWorkspace({ assignmentId, onProgress, canEdit }) {
  const { isMember } = useAuth();
  const confirm = useConfirm();
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileByStep, setFileByStep] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const stepsUrl = canEdit
    ? `/projects/my-assignments/${assignmentId}/steps`
    : `/projects/public/assignments/${assignmentId}/steps`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(stepsUrl);
        if (!cancelled) setPack(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Impossible de charger les étapes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stepsUrl]);

  const markDone = async (step) => {
    if (!canEdit) return;
    if (step.requires_document && !fileByStep[step.id]) {
      setError('Choisissez un document pour cette étape.');
      return;
    }
    const ok = await confirm({
      title: step.requires_document
        ? 'Envoyer le document pour validation ?'
        : 'Marquer cette étape comme terminée ?',
      message:
        'L’admin doit ensuite valider pour débloquer l’étape suivante et augmenter l’avancement.',
      confirmLabel: 'Confirmer',
      tone: 'primary',
    });
    if (!ok) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      if (fileByStep[step.id]) form.append('document', fileByStep[step.id]);
      const { data } = await api.post(
        `/projects/my-assignments/${assignmentId}/steps/${step.id}/submit`,
        form
      );
      setPack(data);
      onProgress?.(data.progress);
      setSuccess('Demande envoyée — en attente de validation admin.');
      setFileByStep((prev) => {
        const next = { ...prev };
        delete next[step.id];
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className={styles.muted}>Chargement des étapes…</p>;
  if (error && !pack) return <p className={styles.workspaceError}>{error}</p>;

  return (
    <div className={`${styles.workspace} ${!canEdit ? styles.workspaceReadonly : ''}`}>
      <div className={styles.workspaceHead}>
        <div>
          <p className={styles.blockTitle}>Parcours du groupe</p>
          <p className={styles.muted}>
            {canEdit
              ? 'Terminez l’étape active, puis attendez la validation admin.'
              : pack?.published
                ? 'Réalisation publiée — visible par tous. Documents réservés aux membres.'
                : 'Lecture seule — seuls les membres du groupe peuvent avancer les étapes.'}
          </p>
        </div>
        <div className={styles.workspaceStat}>
          <strong>
            {pack?.validated_count || 0}/{pack?.total_steps || 0}
          </strong>
          <span>validées</span>
        </div>
      </div>
      {!canEdit && (
        <div className={styles.readonlyBanner}>Vue lecture seule</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {!pack?.steps?.length ? (
        <p className={styles.muted}>Aucune étape définie encore pour ce projet.</p>
      ) : (
        <ol className={styles.stepList}>
          {pack.steps.map((step, idx) => (
            <li key={step.id} data-status={step.status}>
              <div className={styles.stepRail}>
                <span className={styles.stepNum}>
                  {step.status === 'validated' ? '✓' : idx + 1}
                </span>
                {idx < pack.steps.length - 1 ? <span className={styles.stepLine} /> : null}
              </div>
              <div className={styles.stepPanel}>
                <div className={styles.stepTitleRow}>
                  <strong>{step.titre}</strong>
                  <em data-status={step.status}>{STEP_LABEL[step.status] || step.status}</em>
                  {step.requires_document ? <span className={styles.docPill}>Doc</span> : null}
                </div>
                {step.description ? <p>{step.description}</p> : null}
                {(step.document_path || step.has_document) &&
                (step.status === 'submitted' || step.status === 'validated') ? (
                  pack?.can_view_docs && step.document_path ? (
                    <button
                      type="button"
                      className={styles.docBtn}
                      onClick={() => openStepDocument(step.document_path, step.document_name)}
                    >
                      Voir le document
                      {step.document_name ? ` · ${step.document_name}` : ''}
                    </button>
                  ) : (
                    <p className={styles.docLocked}>
                      Document réservé aux membres ENISO Team.
                      {!isMember ? (
                        <>
                          {' '}
                          <Link to="/login">Connexion</Link>
                        </>
                      ) : null}
                    </p>
                  )
                ) : null}
                {canEdit && step.status === 'current' && (
                  <div className={styles.stepActions}>
                    {step.requires_document ? (
                      <label className={styles.filePick}>
                        <span>
                          {fileByStep[step.id]?.name || 'Choisir un document…'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.zip,.txt"
                          onChange={(e) =>
                            setFileByStep((prev) => ({
                              ...prev,
                              [step.id]: e.target.files?.[0] || null,
                            }))
                          }
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={submitting}
                      onClick={() => markDone(step)}
                    >
                      Marquer comme terminée
                    </button>
                  </div>
                )}
                {!canEdit && step.status === 'current' && (
                  <p className={styles.wait}>Étape en cours pour le groupe.</p>
                )}
                {step.status === 'submitted' && (
                  <p className={styles.wait}>En attente de validation par l’admin.</p>
                )}
                {step.status === 'locked' && (
                  <p className={styles.wait}>Débloquée après validation de l’étape précédente.</p>
                )}
                {step.status === 'validated' && (
                  <p className={styles.ok}>Étape validée.</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ProjectDetailModal({ project, onClose, onGroupProgress, initialGroupIndex = 0 }) {
  const { user, isMember } = useAuth();
  const [memberFocus, setMemberFocus] = useState(null);
  const [photoFocus, setPhotoFocus] = useState(null);
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [coverImage, setCoverImage] = useState(project?.image || null);

  useEffect(() => {
    setGroupIndex(initialGroupIndex || 0);
    setMemberFocus(null);
    setPhotoFocus(null);
    setCoverImage(project?.image || null);
  }, [project?.id, initialGroupIndex, project?.image]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (photoFocus) setPhotoFocus(null);
        else if (memberFocus) setMemberFocus(null);
        else onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, memberFocus, photoFocus]);

  if (!project) return null;

  const groups = project.groups || [];
  const activeGroup = groups[groupIndex] || null;
  const progress = Number(activeGroup?.progress) || 0;
  const isArchive = Boolean(project.archive_year);
  const supervisors = Array.isArray(activeGroup?.supervisors)
    ? activeGroup.supervisors
    : activeGroup?.supervisors
      ? [activeGroup.supervisors]
      : [];
  const canWork = Boolean(user && activeGroup && userInGroup(user, activeGroup));
  const archiveLead = resolveProjectLead(project);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <div className={styles.modalLayout}>
          <aside
            className={`${styles.modalSidebar} ${isArchive ? styles.modalSidebarArchive : ''}`}
          >
            <div className={styles.sidebarCover}>
              <div
                className={`${styles.photoShowcase} ${isArchive ? styles.photoShowcaseArchive : ''}`}
              >
                <span className={styles.photoShowcaseGlow} aria-hidden />
                <div
                  className={`${styles.photoShowcaseRow} ${
                    isArchive && project.gallery?.length ? styles.photoShowcaseRowSplit : ''
                  }`}
                >
                  {isArchive && project.gallery?.length > 0 ? (
                    <div className={styles.photoShowcaseOutside} aria-label="Photo de la réalisation">
                      <img src={assetUrl(project.gallery[0])} alt="" />
                      <span className={styles.photoShowcaseOutsideTag}>Réalisation</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={styles.photoShowcaseFrameBtn}
                    onClick={() =>
                      coverImage &&
                      setPhotoFocus({
                        src: coverImage,
                        label: isArchive ? 'Photo du prototype' : 'Photo du projet',
                      })
                    }
                    disabled={!coverImage}
                    aria-label="Voir la photo en grand"
                  >
                    <div className={styles.photoShowcaseFrame}>
                      {coverImage ? (
                        <img src={assetUrl(coverImage)} alt="" />
                      ) : (
                        <div className={styles.sidebarCoverFallback}>
                          <span>{project.titre.slice(0, 1)}</span>
                        </div>
                      )}
                      <span className={styles.photoShowcaseShine} aria-hidden />
                      {coverImage ? (
                        <span className={styles.photoShowcaseZoom} aria-hidden>⤢</span>
                      ) : null}
                    </div>
                  </button>
                </div>
                {isArchive ? (
                  <span className={styles.photoShowcaseTag}>Photo du prototype</span>
                ) : null}
              </div>
            </div>
            {!isArchive && project.gallery?.length > 0 && (
              <div className={styles.sidebarGallery} aria-label="Photos du projet">
                {[project.image, ...project.gallery.filter((src) => src !== project.image)].map(
                  (src) => (
                    <button
                      key={src}
                      type="button"
                      className={`${styles.sidebarGalleryBtn} ${
                        coverImage === src ? styles.sidebarGalleryBtnActive : ''
                      }`}
                      onClick={() => setCoverImage(src)}
                      aria-label="Voir cette photo"
                      aria-pressed={coverImage === src}
                    >
                      <img src={assetUrl(src)} alt="" />
                    </button>
                  )
                )}
              </div>
            )}
            <div className={styles.sidebarBody}>
              {!isArchive ? <p className={styles.sidebarLabel}>Projet</p> : null}
              <div className={styles.sidebarTitleRow}>
                <h2 id="project-modal-title">{project.titre}</h2>
                {isArchive ? (
                  <span className={styles.archiveBadge}>
                    Réalisation {realizationSeasonLabel(project)}
                  </span>
                ) : null}
              </div>
              {archiveLead ? (
                <p className={styles.projectLead}>
                  Responsable projet : <strong>{archiveLead}</strong>
                </p>
              ) : null}
              {!isArchive ? <p className={styles.sidebarDesc}>{project.description}</p> : null}
              {!isArchive ? (
                <div className={styles.sidebarFacts}>
                  <div>
                    <span>Équipes</span>
                    <strong>{groups.length}</strong>
                  </div>
                  <div>
                    <span>Statut</span>
                    <strong>{groups.length ? 'Attribué' : 'Ouvert'}</strong>
                  </div>
                </div>
              ) : (
                <div className={styles.sidebarFactsArchive}>
                  <span>{groups.length} équipe{groups.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </aside>

          <main className={styles.modalContent}>
            <header className={styles.contentHeader}>
              <div>
                <h3>{isArchive ? 'Équipes & description' : 'Composition & suivi'}</h3>
                <p>
                  {isArchive
                    ? 'Parcourez les équipes et la description du projet.'
                    : 'Sélectionnez un groupe pour consulter l’avancement et l’équipe.'}
                </p>
              </div>
            </header>

            {!groups.length ? (
              <div className={styles.emptyPanel}>
                <strong>Aucune équipe assignée</strong>
                <p>Ce projet est au catalogue, mais n’a pas encore de groupe attribué.</p>
              </div>
            ) : (
              <>
                <div className={styles.groupNav} role="tablist" aria-label="Groupes">
                  {groups.map((g, i) => (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={i === groupIndex}
                      className={`${styles.groupNavBtn} ${
                        i === groupIndex ? styles.groupNavBtnActive : ''
                      }`}
                      onClick={() => setGroupIndex(i)}
                    >
                      <span className={styles.groupNavName}>
                        {isArchive ? shortArchiveGroupLabel(g.label) : g.label}
                      </span>
                      {!isArchive && (g.published || Number(g.progress) >= 100) ? (
                        <span className={styles.publishedPill}>Publié</span>
                      ) : null}
                      {!isArchive ? (
                        <span className={styles.groupNavPct}>{Number(g.progress) || 0}%</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {activeGroup && (
                  <section className={styles.detailPanel} key={activeGroup.id}>
                    <div className={styles.detailTop}>
                      <div>
                        <p className={styles.panelEyebrow}>Groupe sélectionné</p>
                        <h4>{activeGroup.label}</h4>
                      </div>
                      {!isArchive ? (
                        <div className={styles.progressBlock}>
                          <div className={styles.progressLabelRow}>
                            <span>Avancement</span>
                            <strong>{progress}%</strong>
                          </div>
                          <div className={styles.progressBar}>
                            <span style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.detailBody}>
                      <aside className={styles.teamColumn}>
                        <div className={styles.infoBlock}>
                          <p className={styles.blockTitle}>Superviseurs</p>
                          {supervisors.length ? (
                            <ul className={styles.supervisorList}>
                              {supervisors.map((name) => (
                                <li key={name}>
                                  <span className={styles.supervisorAvatar}>
                                    {String(name).trim().slice(0, 1).toUpperCase()}
                                  </span>
                                  <span>{name}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={styles.muted}>Non renseigné</p>
                          )}
                        </div>

                        <div className={`${styles.infoBlock} ${styles.membersBlock}`}>
                          <p className={styles.blockTitle}>
                            Membres ({(activeGroup.members || []).length})
                          </p>
                          <div className={styles.memberList}>
                            {(activeGroup.members || []).map((m) => (
                              <button
                                key={m.id || `${m.email}-${m.prenom}`}
                                type="button"
                                className={styles.memberRow}
                                onClick={() =>
                                  setMemberFocus({
                                    ...m,
                                    groupLabel: activeGroup.label,
                                  })
                                }
                              >
                                <span className={styles.memberAvatar}>
                                  {m.photo ? (
                                    <img src={assetUrl(m.photo)} alt="" />
                                  ) : (
                                    <b>{(m.prenom || '?').slice(0, 1)}</b>
                                  )}
                                </span>
                                <span className={styles.memberText}>
                                  <strong>
                                    {m.prenom} {m.nom}
                                  </strong>
                                  <small>{m.filiere || 'Filière non indiquée'}</small>
                                </span>
                                <span className={styles.memberChevron} aria-hidden>
                                  ›
                                </span>
                              </button>
                            ))}
                            {!activeGroup.members?.length && (
                              <p className={styles.muted}>Aucun membre listé.</p>
                            )}
                          </div>
                        </div>
                      </aside>

                      <div className={styles.stepsColumn}>
                        {isArchive ? (
                          <div className={styles.archiveDescription}>
                            <p className={styles.blockTitle}>Description du projet</p>
                            <div className={styles.archiveDescriptionBody}>
                              {project.description}
                            </div>
                          </div>
                        ) : (
                          <>
                            <GroupStepsWorkspace
                              assignmentId={activeGroup.id}
                              canEdit={canWork}
                              onProgress={(pct) =>
                                onGroupProgress?.(project.id, activeGroup.id, pct)
                              }
                            />
                            {!canWork && isMember && (
                              <p className={styles.memberTip}>
                                Vous n’êtes pas dans ce groupe.
                                Voir <Link to="/mes-projets">Mes projets</Link> pour vos étapes.
                              </p>
                            )}
                            {!canWork && !user && (
                              <p className={styles.memberTip}>
                                <Link to="/login">Connectez-vous</Link> avec le compte d’un membre
                                du groupe pour avancer les étapes.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </div>

        {photoFocus && (
          <div
            className={styles.photoLightbox}
            onClick={() => setPhotoFocus(null)}
            role="presentation"
          >
            <div
              className={styles.photoLightboxPanel}
              role="dialog"
              aria-modal="true"
              aria-label={photoFocus.label}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.photoLightboxClose}
                onClick={() => setPhotoFocus(null)}
                aria-label="Fermer"
              >
                ×
              </button>
              <p className={styles.photoLightboxLabel}>{photoFocus.label}</p>
              <div className={styles.photoLightboxMedia}>
                <img src={assetUrl(photoFocus.src)} alt="" className={styles.photoLightboxImg} />
              </div>
            </div>
          </div>
        )}

        {memberFocus && (
          <div
            className={styles.memberOverlay}
            onClick={() => setMemberFocus(null)}
            role="presentation"
          >
            <div
              className={styles.memberSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="member-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.memberSheetClose}
                onClick={() => setMemberFocus(null)}
                aria-label="Fermer"
              >
                ×
              </button>
              <div className={styles.memberSheetPhoto}>
                {memberFocus.photo ? (
                  <img
                    src={assetUrl(memberFocus.photo)}
                    alt={`${memberFocus.prenom} ${memberFocus.nom}`}
                  />
                ) : (
                  <span>{(memberFocus.prenom || '?').slice(0, 1)}</span>
                )}
              </div>
              <p className={styles.memberSheetKicker}>{memberFocus.groupLabel || 'Membre'}</p>
              <h3 id="member-sheet-title">
                {memberFocus.prenom} {memberFocus.nom}
              </h3>
              <div className={styles.memberFacts}>
                <span>Filière</span>
                <strong>{memberFocus.filiere || '—'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function Projects() {
  const { isMember } = useAuth();
  const [items, setItems] = useState([]);
  const [realizations, setRealizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => {
    const tasks = [
      api
        .get('/projects/public/realizations')
        .then((res) => setRealizations(res.data || []))
        .catch(() => setRealizations([])),
    ];
    if (isMember) {
      tasks.push(
        api
          .get('/projects/public')
          .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
          .catch((err) => {
            if (err.response?.status === 403) setItems([]);
            else setError('Impossible de charger le catalogue.');
          })
      );
    } else {
      setItems([]);
    }
    return Promise.all(tasks);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [isMember]);

  useEffect(() => {
    if (loading || window.location.hash !== '#catalogue') return;
    const el = document.getElementById('catalogue');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading]);

  const onGroupProgress = (projectId, groupId, progress) => {
    const published = Number(progress) >= 100;
    setItems((prev) =>
      prev.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              groups: (p.groups || []).map((g) =>
                g.id === groupId ? { ...g, progress, published: published || g.published } : g
              ),
            }
      )
    );
    setSelected((prev) =>
      !prev || prev.id !== projectId
        ? prev
        : {
            ...prev,
            groups: (prev.groups || []).map((g) =>
              g.id === groupId ? { ...g, progress, published: published || g.published } : g
            ),
          }
    );
    if (published) {
      api
        .get('/projects/public/realizations')
        .then((res) => setRealizations(res.data || []))
        .catch(() => {});
    }
  };

  const openRealization = (item) => {
    const catalog = items.find((p) => p.id === item.project_id);
    const mergedGroups = item.groups?.length
      ? item.groups
      : catalog?.groups?.filter((g) => g.published || Number(g.progress) >= 100) || [];

    const project = {
      id: item.project_id,
      titre: item.project_titre || catalog?.titre,
      description: item.project_description || catalog?.description,
      image: item.project_image || catalog?.image,
      gallery: item.project_gallery || catalog?.gallery || [],
      archive_year: item.archive_year ?? catalog?.archive_year ?? null,
      project_lead: resolveProjectLead({
        project_lead: item.project_lead ?? catalog?.project_lead ?? null,
        archive_year: item.archive_year ?? catalog?.archive_year ?? null,
      }),
      groups: mergedGroups,
    };

    setSelected({ ...project, _focusGroup: 0 });
  };

  if (loading) return <Loader />;

  return (
    <div className={`page ${styles.page}`}>
      <div className="container">
        <header className={styles.hero}>
          <p className={styles.kicker}>ENISO Team</p>
          <h1>Projets</h1>
          <p className={styles.lead}>
            {isMember
              ? 'Catalogue réservé aux membres. Les groupes à 100 % sont publiés pour tous ; les documents restent réservés aux membres.'
              : 'Explorez les réalisations du club robotique — prototypes, équipes et projets aboutis.'}
          </p>
          {isMember ? (
            <div className={styles.ctaRow}>
              <Link to="/mes-projets" className="btn btn-primary btn-sm">
                Mes projets / étapes
              </Link>
              <Link to="/selection-projets" className="btn btn-secondary btn-sm">
                Formulaire de sélection
              </Link>
            </div>
          ) : (
            <div className={styles.ctaRow}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Déjà membre ? Connexion
              </Link>
            </div>
          )}
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {realizations.length > 0 && (
          <section className={styles.showcase} aria-labelledby="showcase-title">
            <div className={styles.showcaseHead}>
              <p className={styles.showcaseKicker}>Showroom du club</p>
              <h2 id="showcase-title">Réalisations publiées</h2>
              <p>
                Prototypes et projets aboutis du club — explorez les équipes, photos et détails
                techniques.
              </p>
            </div>

            <div className={styles.showcaseGrid}>
              {realizations.map((r, idx) => {
                const cover = r.project_gallery?.[0] || r.project_image;
                const teamCount = (r.groups || []).length;
                const seasonLabel = realizationSeasonLabel(r);
                const featured = idx === 0 && realizations.length > 2;

                return (
                  <button
                    key={r.project_id || r.id}
                    type="button"
                    className={`${styles.showcaseCard} ${
                      featured ? styles.showcaseCardFeatured : ''
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 0.07}s` }}
                    onClick={() => openRealization(r)}
                    aria-label={`Voir les détails de ${r.project_titre}`}
                  >
                    <div className={styles.showcaseMedia} aria-hidden={!cover}>
                      {cover ? (
                        <img src={assetUrl(cover)} alt="" loading="lazy" />
                      ) : (
                        <div className={styles.showcaseFallback}>
                          <span>{(r.project_titre || '?').slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      <span className={styles.showcaseShade} />
                      <span className={styles.showcaseGlow} aria-hidden />
                    </div>

                    <div className={styles.showcaseBody}>
                      <div className={styles.showcaseMeta}>
                        {seasonLabel ? (
                          <span className={styles.showcaseYear}>Réalisation {seasonLabel}</span>
                        ) : (
                          <span className={styles.showcaseYear}>Publié</span>
                        )}
                        {teamCount > 0 ? (
                          <span className={styles.showcaseTeams}>
                            {teamCount} équipe{teamCount > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                      <strong className={styles.showcaseTitle}>{r.project_titre}</strong>
                      {r.project_description ? (
                        <p className={styles.showcaseExcerpt}>{r.project_description}</p>
                      ) : null}
                      <span className={styles.showcaseCta}>
                        Voir la réalisation
                        <em aria-hidden>→</em>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {isMember ? (
          <section id="catalogue" className={styles.catalogSection}>
            <h2 className={styles.catalogTitle}>Catalogue</h2>
            <p className={styles.catalogLead}>
              Projets en cours. Les réalisations publiées sont affichées dans le showroom ci-dessus.
            </p>

            {!items.length ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyGlow} aria-hidden />
                <h2>Aucun projet en cours</h2>
                <p>
                  Les projets réalisés apparaissent dans le showroom. Les nouveaux projets du
                  catalogue s’afficheront ici.
                </p>
              </div>
            ) : (
              <div className={styles.grid}>
                {items.map((project, idx) => {
                  const groupCount = (project.groups || []).length;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={styles.card}
                      style={{ animationDelay: `${Math.min(idx, 8) * 0.06}s` }}
                      onClick={() => setSelected(project)}
                    >
                      <div className={styles.media}>
                        {project.image ? (
                          <img src={assetUrl(project.image)} alt="" />
                        ) : (
                          <div className={styles.mediaFallback}>
                            <span>{project.titre.slice(0, 1)}</span>
                          </div>
                        )}
                        <div className={styles.mediaShade} />
                        {project.has_published ? (
                          <span className={styles.cardPublished}>Réalisé</span>
                        ) : null}
                        <h2>{project.titre}</h2>
                      </div>
                      <div className={styles.body}>
                        <p className={styles.desc}>{project.description}</p>
                        <p className={styles.cardMeta}>
                          {groupCount
                            ? `${groupCount} groupe${groupCount > 1 ? 's' : ''} attribué${
                                groupCount > 1 ? 's' : ''
                              }`
                            : 'Pas encore d’équipe'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <div className={styles.catalogLocked}>
            <h2>Catalogue réservé aux membres</h2>
            <p>
              Connectez-vous avec un compte membre ENISO Team pour consulter le catalogue et
              suivre les projets en cours.
            </p>
            <Link to="/login" className="btn btn-primary">
              Se connecter
            </Link>
          </div>
        )}
      </div>

      {selected && (
        <ProjectDetailModal
          project={selected}
          initialGroupIndex={selected._focusGroup || 0}
          onClose={() => setSelected(null)}
          onGroupProgress={onGroupProgress}
        />
      )}
    </div>
  );
}
