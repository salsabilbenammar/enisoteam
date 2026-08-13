import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import styles from './ProjectSelection.module.css';

export default function ProjectSelection() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [teamSize, setTeamSize] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [memberPhotos, setMemberPhotos] = useState({}); // idx -> File
  const [memberPreviews, setMemberPreviews] = useState({});
  const [selected, setSelected] = useState({});

  const nameParts = String(user?.nom || '').trim().split(/\s+/);
  const selfPrenom = nameParts[0] || '';
  const selfNom = nameParts.slice(1).join(' ') || selfPrenom;

  const emptyMember = () => ({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    filiere: '',
  });

  const selfMember = () => ({
    prenom: selfPrenom,
    nom: selfNom,
    email: user?.email || '',
    telephone: '',
    filiere: user?.filiere || '',
  });

  const buildParticipants = (size, previous = []) => {
    const n = Math.max(1, Number(size) || 1);
    return Array.from({ length: n }, (_, i) => {
      if (i === 0) {
        return {
          ...selfMember(),
          telephone: previous[0]?.telephone || '',
          filiere: previous[0]?.filiere || user?.filiere || '',
        };
      }
      return previous[i] || emptyMember();
    });
  };

  const resizeTeam = (size) => {
    const n = Math.max(1, Number(size) || 1);
    setTeamSize(n);
    setParticipants((prev) => buildParticipants(n, prev));
    setMemberPhotos((prev) => {
      const next = {};
      for (let i = 0; i < n; i += 1) {
        if (prev[i]) next[i] = prev[i];
      }
      return next;
    });
    setMemberPreviews((prev) => {
      const next = {};
      Object.keys(prev).forEach((key) => {
        const idx = Number(key);
        if (idx >= n && prev[key]?.startsWith?.('blob:')) {
          URL.revokeObjectURL(prev[key]);
        } else if (idx < n) {
          next[key] = prev[key];
        }
      });
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        const [statusRes, mineRes] = await Promise.allSettled([
          api.get('/projects/form-status'),
          api.get('/projects/my-submission'),
        ]);

        if (cancelled) return;

        if (statusRes.status === 'fulfilled') {
          setStatus(statusRes.value.data);
        } else {
          setError(
            statusRes.reason?.response?.data?.message ||
              'Impossible de charger le statut du formulaire.'
          );
        }

        if (mineRes.status === 'fulfilled') {
          const mineData = mineRes.value.data;
          setMine(mineData);
          if (!mineData?.submitted) {
            const initialSize = 1;
            setTeamSize(initialSize);
            setParticipants(buildParticipants(initialSize));
          }
        } else if (statusRes.status === 'fulfilled') {
          setError(
            (prev) =>
              prev ||
              mineRes.reason?.response?.data?.message ||
              'Impossible de vérifier votre soumission.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const maxTeamSize = Math.max(1, Number(status?.group_size) || 3);
  const choicesCount = Number(status?.choices_count) || 3;
  const projects = status?.projects || [];

  const ranksUsed = useMemo(() => {
    return new Set(
      Object.values(selected)
        .map(Number)
        .filter((n) => n >= 1)
    );
  }, [selected]);

  const rankedPreview = useMemo(() => {
    return Object.entries(selected)
      .filter(([, rank]) => Number(rank) >= 1)
      .map(([project_id, preference_rank]) => {
        const p = projects.find((x) => Number(x.id) === Number(project_id));
        return {
          project_id: Number(project_id),
          preference_rank: Number(preference_rank),
          titre: p?.titre || 'Projet',
        };
      })
      .sort((a, b) => a.preference_rank - b.preference_rank);
  }, [selected, projects]);

  const onToggleProject = (projectId, checked) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[projectId];
        return next;
      }
      if (Object.keys(next).length >= choicesCount) return prev;
      const used = new Set(Object.values(next).map(Number));
      let rank = 1;
      while (used.has(rank)) rank += 1;
      next[projectId] = String(rank);
      return next;
    });
  };

  const onRankChange = (projectId, rank) => {
    setSelected((prev) => {
      const next = { ...prev };
      const r = Number(rank);
      for (const [pid, val] of Object.entries(next)) {
        if (Number(val) === r && Number(pid) !== Number(projectId)) {
          next[pid] = '';
        }
      }
      next[projectId] = rank;
      return next;
    });
  };

  const setMemberPhoto = (idx, file) => {
    setMemberPhotos((prev) => ({ ...prev, [idx]: file || null }));
    setMemberPreviews((prev) => {
      const next = { ...prev };
      if (prev[idx]?.startsWith?.('blob:')) URL.revokeObjectURL(prev[idx]);
      if (file) next[idx] = URL.createObjectURL(file);
      else delete next[idx];
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const choices = Object.entries(selected)
      .filter(([, rank]) => Number(rank) >= 1)
      .map(([project_id, preference_rank]) => ({
        project_id: Number(project_id),
        preference_rank: Number(preference_rank),
      }));

    if (choices.length !== choicesCount) {
      setError(`Classez exactement ${choicesCount} projet(s).`);
      return;
    }

    for (let i = 0; i < participants.length; i += 1) {
      if (!memberPhotos[i]) {
        setError(`Ajoutez la photo du membre ${i + 1}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('type', 'group');
      data.append('choices', JSON.stringify(choices));
      data.append(
        'participants',
        JSON.stringify(
          participants.map(({ prenom, nom, email, telephone, filiere }) => ({
            prenom,
            nom,
            email,
            telephone,
            filiere,
          }))
        )
      );
      participants.forEach((_, idx) => {
        if (memberPhotos[idx]) data.append(`photo_${idx}`, memberPhotos[idx]);
      });
      const res = await api.post('/projects/submit', data);
      const { data: freshMine } = await api.get('/projects/my-submission');
      setMine(freshMine);
      setSuccess(res.data.message || 'Formulaire envoyé.');
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteSubmission = async () => {
    const ok = await confirm({
      title: 'Supprimer votre soumission ?',
      message:
        'Vos choix de projets et les informations du groupe seront effacés. Vous pourrez renvoyer le formulaire tant qu’il reste ouvert et que rien n’a été attribué.',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      tone: 'danger',
    });
    if (!ok) return;
    setError('');
    setSuccess('');
    setDeleting(true);
    try {
      const { data } = await api.delete('/projects/my-submission');
      setMine({ submitted: false, submission: null, can_delete: false, assigned: false });
      setSelected({});
      setSuccess(data.message || 'Soumission supprimée. Vous pouvez renvoyer le formulaire.');
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={`page ${styles.page}`}>
      <div className="container">
        <header className={styles.hero}>
          <p className={styles.kicker}>ENISO Team</p>
          <h1>Sélection des projets</h1>
          <p className={styles.lead}>
            Cochez vos projets préférés et classez-les — {choicesCount} choix requis.
          </p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {mine?.submitted ? (
          <section className={styles.stateCard}>
            <h2>Votre soumission est enregistrée</h2>
            <p>
              Votre formulaire (
              {(mine.submission?.participants || []).length || 1} membre
              {(mine.submission?.participants || []).length > 1 ? 's' : ''}) a été enregistré le{' '}
              {mine.submission?.submitted_at
                ? new Date(mine.submission.submitted_at).toLocaleString('fr-FR')
                : '—'}
              .
            </p>
            <p className={styles.hint}>
              Le bureau examinera vos choix et vous attribuera un projet. Vous serez notifié via{' '}
              <Link to="/mes-projets">Mes projets</Link> dès qu’une attribution sera faite.
            </p>
            {mine.assigned && (
              <p className={styles.hint}>
                Cette soumission a déjà été attribuée — suppression impossible.
              </p>
            )}
            <h3 className={styles.recapTitle}>Vos choix classés</h3>
            <ol className={styles.submittedList}>
              {(mine.submission?.choices || []).map((c) => (
                <li key={c.id || `${c.project_id}-${c.preference_rank}`}>
                  <span>{c.preference_rank}</span>
                  {c.project_titre}
                </li>
              ))}
            </ol>
            {!mine.submission?.choices?.length && (
              <p className={styles.hint}>Aucun choix enregistré — contactez le bureau si besoin.</p>
            )}
            <h3 className={styles.recapTitle}>Membres du groupe</h3>
            {(mine.submission?.participants || []).length > 0 && (
              <ul className={styles.peopleList}>
                {(mine.submission.participants || []).map((p) => (
                  <li key={p.id || `${p.email}-${p.prenom}`}>
                    {p.photo ? (
                      <img src={assetUrl(p.photo)} alt="" className={styles.personThumb} />
                    ) : (
                      <span className={styles.personThumbFallback}>
                        {(p.prenom || '?').slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <strong>
                        {p.prenom} {p.nom}
                      </strong>
                      <span>
                        {[p.telephone, p.filiere].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.stateActions}>
              <Link to="/projets" className="btn btn-secondary">
                Page Projets
              </Link>
              {mine.can_delete !== false && !mine.assigned && (
                <button
                  type="button"
                  className={`btn btn-secondary ${styles.deleteBtn}`}
                  disabled={deleting}
                  onClick={onDeleteSubmission}
                >
                  {deleting ? 'Suppression…' : 'Supprimer ma soumission'}
                </button>
              )}
            </div>
          </section>
        ) : !status?.form_open ? (
          <section className={styles.stateCard}>
            <h2>Formulaire fermé</h2>
            <p>L&apos;administration n&apos;a pas encore ouvert la sélection de projets.</p>
            <p className={styles.hint}>
              Si vous aviez déjà envoyé le formulaire, rechargez la page ou reconnectez-vous pour
              retrouver votre soumission.
            </p>
            <Link to="/projets" className="btn btn-secondary">
              Voir les projets attribués
            </Link>
          </section>
        ) : (
          <form className={styles.formShell} onSubmit={onSubmit}>
            <section className={styles.section}>
                <h2>Taille du groupe</h2>
                <p className={styles.hint}>
                  Choisissez le nombre de membres (de 1 à {maxTeamSize}, maximum défini par
                  l’admin).
                </p>
                <div className={styles.sizePicker} role="group" aria-label="Nombre de membres">
                  {Array.from({ length: maxTeamSize }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.sizeBtn} ${teamSize === n ? styles.sizeBtnActive : ''}`}
                      onClick={() => resizeTeam(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <h2>Membres ({teamSize}/{maxTeamSize})</h2>
                <p className={styles.hint}>
                  Le premier membre est vous (compte connecté). Une photo est obligatoire pour chaque
                  membre.
                  {teamSize < maxTeamSize
                    ? ' Groupe incomplet — l’admin pourra le compléter plus tard.'
                    : ' Groupe complet.'}
                </p>
                <div className={styles.membersGrid}>
                  {participants.map((p, idx) => (
                    <div key={idx} className={styles.memberCard}>
                      <h3>
                        Membre {idx + 1}
                        {idx === 0 ? ' · vous' : ''}
                      </h3>
                      <div className={styles.photoField}>
                        {memberPreviews[idx] ? (
                          <img src={memberPreviews[idx]} alt="" className={styles.photoPreview} />
                        ) : (
                          <div className={styles.photoPlaceholder}>Photo *</div>
                        )}
                        <label className={styles.fileBtn}>
                          Choisir une photo
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            required
                            onChange={(e) => setMemberPhoto(idx, e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <div className="form-row two">
                        <div className="form-group">
                          <label>Prénom</label>
                          <input
                            value={p.prenom}
                            disabled={idx === 0}
                            onChange={(e) => {
                              const next = [...participants];
                              next[idx] = { ...next[idx], prenom: e.target.value };
                              setParticipants(next);
                            }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Nom</label>
                          <input
                            value={p.nom}
                            disabled={idx === 0}
                            onChange={(e) => {
                              const next = [...participants];
                              next[idx] = { ...next[idx], nom: e.target.value };
                              setParticipants(next);
                            }}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={p.email}
                          disabled={idx === 0}
                          onChange={(e) => {
                            const next = [...participants];
                            next[idx] = { ...next[idx], email: e.target.value };
                            setParticipants(next);
                          }}
                          required
                        />
                      </div>
                      <div className="form-row two">
                        <div className="form-group">
                          <label>Téléphone</label>
                          <input
                            type="tel"
                            value={p.telephone}
                            onChange={(e) => {
                              const next = [...participants];
                              next[idx] = { ...next[idx], telephone: e.target.value };
                              setParticipants(next);
                            }}
                            placeholder="Ex. 20 123 456"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Filière</label>
                          <input
                            value={p.filiere}
                            onChange={(e) => {
                              const next = [...participants];
                              next[idx] = { ...next[idx], filiere: e.target.value };
                              setParticipants(next);
                            }}
                            placeholder="Ex. Informatique"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>Catalogue</h2>
                  <p className={styles.hint}>
                    {Object.keys(selected).length}/{choicesCount} sélectionné
                    {choicesCount > 1 ? 's' : ''}
                  </p>
                </div>
                {rankedPreview.length > 0 && (
                  <div className={styles.rankSummary}>
                    {rankedPreview.map((c) => (
                      <span key={c.project_id}>
                        {c.preference_rank}. {c.titre}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {!projects.length && <p className={styles.hint}>Aucun projet disponible.</p>}

              <div className={styles.projectGrid}>
                {projects.map((p) => {
                  const checked = selected[p.id] !== undefined;
                  const rank = selected[p.id];
                  const locked = !checked && Object.keys(selected).length >= choicesCount;
                  return (
                    <article
                      key={p.id}
                      className={`${styles.projectCard} ${checked ? styles.projectSelected : ''} ${
                        locked ? styles.projectLocked : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={styles.projectMedia}
                        disabled={locked && !checked}
                        onClick={() => onToggleProject(p.id, !checked)}
                        aria-pressed={checked}
                        aria-label={`${checked ? 'Retirer' : 'Sélectionner'} ${p.titre}`}
                      >
                        {p.image ? (
                          <img src={assetUrl(p.image)} alt="" />
                        ) : (
                          <div className={styles.mediaFallback}>{p.titre.slice(0, 1)}</div>
                        )}
                        {checked && rank && (
                          <span className={styles.rankBadge}>
                            {rank}
                            {Number(rank) === 1 ? 'er' : 'e'}
                          </span>
                        )}
                      </button>
                      <div className={styles.projectBody}>
                        <div className={styles.projectTop}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={(e) => onToggleProject(p.id, e.target.checked)}
                          />
                          <strong>{p.titre}</strong>
                        </div>
                        <p>{p.description}</p>
                        <select
                          value={rank || ''}
                          disabled={!checked}
                          onChange={(e) => onRankChange(p.id, e.target.value)}
                          required={checked}
                        >
                          <option value="">Rang…</option>
                          {Array.from({ length: choicesCount }, (_, i) => i + 1).map((r) => (
                            <option
                              key={r}
                              value={r}
                              disabled={ranksUsed.has(r) && Number(selected[p.id]) !== r}
                            >
                              {r}
                              {r === 1 ? 'er' : 'e'} choix
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className={styles.submitBar}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Envoi…' : 'Envoyer le formulaire'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
