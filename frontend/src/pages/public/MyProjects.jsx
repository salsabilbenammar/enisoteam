import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl, openStepDocument } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import styles from './MyProjects.module.css';

const STATUS_LABEL = {
  locked: 'Verrouillée',
  current: 'À faire',
  submitted: 'En attente',
  validated: 'Validée',
};

export default function MyProjects() {
  const { isAdmin } = useAuth();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pack, setPack] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileByStep, setFileByStep] = useState({});

  const loadList = useCallback(async () => {
    const { data } = await api.get('/projects/my-assignments');
    setList(data || []);
    return data || [];
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setPack(null);
      return;
    }
    const { data } = await api.get(`/projects/my-assignments/${id}/steps`);
    setPack(data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await loadList();
        if (data.length) {
          setSelectedId(data[0].id);
          await loadDetail(data[0].id);
        }
      } catch {
        setError('Impossible de charger vos projets.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadList, loadDetail]);

  const selectAssignment = async (id) => {
    setSelectedId(id);
    setError('');
    setSuccess('');
    setFileByStep({});
    try {
      await loadDetail(id);
    } catch {
      setError('Chargement des étapes impossible.');
    }
  };

  const markDone = async (step) => {
    if (step.requires_document && !fileByStep[step.id]) {
      setError('Choisissez un document à uploader pour cette étape.');
      return;
    }

    const ok = await confirm({
      title: step.requires_document
        ? 'Envoyer le document pour validation ?'
        : 'Marquer cette étape comme terminée ?',
      message: 'L’administrateur devra valider avant de débloquer l’étape suivante.',
      confirmLabel: 'Confirmer',
      tone: 'primary',
    });
    if (!ok) return;

    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      if (fileByStep[step.id]) {
        form.append('document', fileByStep[step.id]);
      }
      const { data } = await api.post(
        `/projects/my-assignments/${selectedId}/steps/${step.id}/submit`,
        form
      );
      setPack(data);
      setFileByStep((prev) => {
        const next = { ...prev };
        delete next[step.id];
        return next;
      });
      setSuccess(
        step.requires_document
          ? 'Document envoyé. En attente de validation admin.'
          : 'Demande envoyée. En attente de validation admin.'
      );
      await loadList();
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const members = pack?.assignment?.members || [];
  const total = pack?.total_steps || 0;
  const done = pack?.validated_count || 0;

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Espace groupe</p>
          <h1>Mes projets</h1>
          <p>
            Parcours d’étapes du groupe : terminez l’étape en cours, l’admin valide, puis
            l’avancement augmente.
          </p>
          {isAdmin ? (
            <p className={styles.adminHint}>
              Connecté en administrateur : si votre email figure dans un groupe attribué, vous
              pouvez avancer les étapes ici comme participant.
            </p>
          ) : null}
        </div>
        <div className={styles.headerActions}>
          <Link to="/projets#catalogue" className="btn btn-secondary">
            Catalogue
          </Link>
          <Link to="/selection-projets" className="btn btn-secondary">
            Sélection
          </Link>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!list.length ? (
        <div className={styles.emptyCard}>
          <h2>Aucun projet attribué</h2>
          <p>Dès qu’un admin vous attribue un projet, les étapes apparaîtront ici.</p>
          <Link to="/projets" className="btn btn-primary">
            Voir les projets
          </Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <p className={styles.sideLabel}>Vos groupes</p>
            {list.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`${styles.projectBtn} ${
                  selectedId === a.id ? styles.projectBtnActive : ''
                }`}
                onClick={() => selectAssignment(a.id)}
              >
                {a.project_image ? (
                  <img src={assetUrl(a.project_image)} alt="" />
                ) : (
                  <span className={styles.thumbFallback} />
                )}
                <span>
                  <strong>{a.project_titre}</strong>
                  <small>
                    {a.label} · {a.progress ?? 0}%
                  </small>
                </span>
              </button>
            ))}
          </aside>

          <section className={styles.workspace}>
            {pack?.assignment && (
              <>
                <div className={styles.heroCard}>
                  <div className={styles.heroCover}>
                    {pack.assignment.project_image ? (
                      <img src={assetUrl(pack.assignment.project_image)} alt="" />
                    ) : (
                      <div className={styles.heroCoverFallback}>
                        {(pack.assignment.project_titre || '?').slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className={styles.heroBody}>
                    <p className={styles.groupChip}>{pack.assignment.label}</p>
                    <h2>{pack.assignment.project_titre}</h2>
                    <div className={styles.progressMeta}>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${pack.progress || 0}%` }}
                        />
                      </div>
                      <div className={styles.progressStats}>
                        <strong>{pack.progress}%</strong>
                        <span>
                          {done}/{total} étapes validées
                        </span>
                      </div>
                    </div>
                    {members.length > 0 && (
                      <div className={styles.teamRow}>
                        <span>Équipe</span>
                        <div className={styles.avatars}>
                          {members.map((m) => (
                            <span
                              key={m.id || m.email}
                              className={styles.avatar}
                              title={`${m.prenom} ${m.nom}`}
                            >
                              {m.photo ? (
                                <img src={assetUrl(m.photo)} alt="" />
                              ) : (
                                (m.prenom || '?').slice(0, 1)
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!pack.steps?.length ? (
                  <p className={styles.muted}>
                    Aucune étape définie pour ce projet pour le moment.
                  </p>
                ) : (
                  <div className={styles.timeline}>
                    <div className={styles.timelineHead}>
                      <h3>Parcours du groupe</h3>
                      <p>Une seule étape active à la fois.</p>
                    </div>
                    <ol className={styles.steps}>
                      {pack.steps.map((step, idx) => (
                        <li key={step.id} data-status={step.status}>
                          <div className={styles.rail}>
                            <div className={styles.stepIndex} aria-hidden>
                              {step.status === 'validated' ? '✓' : idx + 1}
                            </div>
                            {idx < pack.steps.length - 1 ? (
                              <span className={styles.railLine} aria-hidden />
                            ) : null}
                          </div>
                          <article className={styles.stepCard}>
                            <div className={styles.stepTitleRow}>
                              <h4>{step.titre}</h4>
                              <span className={styles.badge} data-status={step.status}>
                                {STATUS_LABEL[step.status] || step.status}
                              </span>
                              {step.requires_document ? (
                                <span className={styles.docTag}>Document</span>
                              ) : null}
                            </div>
                            {step.description ? (
                              <p className={styles.stepDesc}>{step.description}</p>
                            ) : null}

                          {step.document_path &&
                          (step.status === 'submitted' || step.status === 'validated') ? (
                            <button
                              type="button"
                              className={styles.sentDoc}
                              onClick={() =>
                                openStepDocument(step.document_path, step.document_name)
                              }
                            >
                              Document : {step.document_name || 'ouvrir'}
                            </button>
                          ) : null}

                            {step.status === 'current' && (
                              <div className={styles.submitBlock}>
                                {step.requires_document ? (
                                  <label className={styles.fileLabel}>
                                    <span>
                                      {fileByStep[step.id]
                                        ? fileByStep[step.id].name
                                        : 'Choisir un document (PDF, Word, image…)'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.zip,.txt"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setFileByStep((prev) => ({
                                          ...prev,
                                          [step.id]: file,
                                        }));
                                      }}
                                    />
                                  </label>
                                ) : null}
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={submitting}
                                  onClick={() => markDone(step)}
                                >
                                  {step.requires_document
                                    ? 'Envoyer pour validation'
                                    : 'Marquer comme terminée'}
                                </button>
                              </div>
                            )}
                            {step.status === 'submitted' && (
                              <p className={styles.waitNote}>
                                Envoyé — en attente de validation admin.
                              </p>
                            )}
                            {step.status === 'locked' && (
                              <p className={styles.waitNote}>
                                Se débloque après validation de l’étape précédente.
                              </p>
                            )}
                            {step.status === 'validated' && (
                              <p className={styles.okNote}>Étape validée par l’admin.</p>
                            )}
                          </article>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
