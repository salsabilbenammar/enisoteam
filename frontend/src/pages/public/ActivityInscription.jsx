import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { isBirthDateField, localToday, minSelectableDate } from '../../utils/dateLimits';
import styles from './ActivityInscription.module.css';

const LEVELS = ['1ère année', '2ème année', '3ème année', 'Mastère'];

const STUDY_FIELDS = [
  'EI',
  'MECA',
  'IA',
  'GTE',
  'GMP',
  'ASE',
  'Mastère',
];

const DEFAULT_COMPETITOR_FIELDS = [
  { id: 'comp_nom_robot', label: 'Nom du robot', type: 'text', required: true },
  {
    id: 'comp_nombre_membres',
    label: 'Combien de membres de votre groupe vont participer ?',
    type: 'select',
    options: ['1', '2', '3', '4'],
    required: true,
  },
  { id: 'membre_2_prenom', label: 'Prénom du 2ème membre', type: 'text' },
  { id: 'membre_2_nom', label: 'Nom du 2ème membre', type: 'text' },
  { id: 'membre_2_email', label: 'Email du 2ème membre', type: 'text' },
  { id: 'membre_2_telephone', label: 'Numéro de téléphone du 2ème membre', type: 'text' },
  { id: 'membre_2_filiere', label: 'Filière du 2ème membre', type: 'select', options: STUDY_FIELDS },
  { id: 'membre_3_prenom', label: 'Prénom du 3ème membre', type: 'text' },
  { id: 'membre_3_nom', label: 'Nom du 3ème membre', type: 'text' },
  { id: 'membre_3_email', label: 'Email du 3ème membre', type: 'text' },
  { id: 'membre_3_telephone', label: 'Numéro de téléphone du 3ème membre', type: 'text' },
  { id: 'membre_3_filiere', label: 'Filière du 3ème membre', type: 'select', options: STUDY_FIELDS },
  { id: 'membre_4_prenom', label: 'Prénom du 4ème membre', type: 'text' },
  { id: 'membre_4_nom', label: 'Nom du 4ème membre', type: 'text' },
  { id: 'membre_4_email', label: 'Email du 4ème membre', type: 'text' },
  { id: 'membre_4_telephone', label: 'Numéro de téléphone du 4ème membre', type: 'text' },
  { id: 'membre_4_filiere', label: 'Filière du 4ème membre', type: 'select', options: STUDY_FIELDS },
];

const emptyBase = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  filiere: '',
  annee: '',
  role_candidat: '',
  accepte_paiement: '',
  mode_inscription: '',
};

function emptyCompanion(fields) {
  return { prenom: '', nom: '', reponses: buildEmptyAnswers(fields) };
}

function eventAudience(activity) {
  const t = activity?.formulaire_type;
  if (t === 'groupe') return 'groupe';
  if (t === 'les_deux' || t === 'avec_accompagnants') return 'les_deux';
  return 'personne';
}

function buildEmptyAnswers(fields) {
  const answers = {};
  for (const field of fields || []) {
    if (field.type === 'checkbox') answers[field.id] = false;
    else if (field.type === 'multiselect') answers[field.id] = [];
    else answers[field.id] = '';
  }
  return answers;
}

function validateFields(fields, answers) {
  for (const field of fields || []) {
    const value = answers[field.id];
    if (field.type === 'checkbox') {
      if (field.required && !value) return `Veuillez compléter : ${field.label}`;
    } else if (field.type === 'multiselect') {
      if (field.required && !(Array.isArray(value) && value.length)) {
        return `Veuillez compléter : ${field.label}`;
      }
    } else if (field.required && !String(value || '').trim()) {
      return `Veuillez compléter : ${field.label}`;
    }
  }
  return '';
}

/**
 * Formulaire d’inscription (style Google Forms).
 * type: 'events' | 'trainings' | 'deplacements'
 */
export default function ActivityInscription({ type }) {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyBase);
  const [companions, setCompanions] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({});
  const [competitorAnswers, setCompetitorAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dateMin = useMemo(() => minSelectableDate(), []);
  const dateMax = useMemo(() => localToday(), []);

  const isEvent = type === 'events';
  const isTrip = type === 'deplacements';
  const listPath = isEvent ? '/events' : isTrip ? '/deplacements' : '/trainings';
  const label = isEvent ? 'événement' : isTrip ? 'déplacement' : 'formation';
  const isPaid =
    (isEvent && activity?.payant) ||
    (!isEvent && !isTrip && activity?.payante) ||
    (isTrip && activity?.payant);
  const isPaidActivity = isPaid;
  const audience = isEvent ? eventAudience(activity) : null;
  const showAudienceChoice = isEvent && audience === 'les_deux';
  const isGroupEvent =
    isEvent && (form.mode_inscription === 'groupe' || audience === 'groupe');
  const groupMin = Math.max(1, Number(activity?.accompagnants_min) || 1);
  const groupMax =
    Number(activity?.accompagnants_max) > 0 ? Number(activity.accompagnants_max) : 10;
  const chefFields = isTrip ? [] : activity?.champs_chef || [];
  const memberOnlyFields = isTrip ? [] : activity?.champs_membres || [];
  const commonFields = isTrip ? [] : activity?.champs_communs || [];
  const customFields = isTrip
    ? []
    : chefFields.length || memberOnlyFields.length || commonFields.length
      ? [...chefFields, ...commonFields]
      : activity?.champs_personnalises || [];
  const memberFormFields = [...memberOnlyFields, ...commonFields];
  const IDENTITY_IDS = ['prenom', 'nom', 'email', 'telephone', 'filiere', 'annee'];
  const useAdminEventForm = isEvent && customFields.length > 0;
  const hideDefaultIdentity =
    useAdminEventForm && customFields.some((f) => IDENTITY_IDS.includes(f.id));
  const competitorFields = useMemo(() => {
    if (!isTrip) return [];
    return DEFAULT_COMPETITOR_FIELDS;
  }, [isTrip]);
  const isCompetitor = isTrip && form.role_candidat === 'competiteur';
  const teamSize = Math.max(
    1,
    Math.min(4, Number(competitorAnswers.comp_nombre_membres) || 1)
  );
  const visibleCompetitorFields = competitorFields.filter((field) => {
    const memberMatch = /^membre_(\d+)_/.exec(field.id);
    return !memberMatch || Number(memberMatch[1]) <= teamSize;
  });

  useEffect(() => {
    api
      .get(`/${type}/${id}`)
      .then((res) => {
        const data = res.data;
        setActivity(data);
        if (type === 'events') {
          const a = eventAudience(data);
          if (a === 'groupe') {
            setForm((f) => ({ ...f, mode_inscription: 'groupe' }));
            const memberQs = [
              ...(data.champs_membres || []),
              ...(data.champs_communs || []),
            ];
            setCompanions([emptyCompanion(memberQs)]);
          } else if (a === 'personne') {
            setForm((f) => ({ ...f, mode_inscription: 'personne' }));
            setCompanions([]);
          } else {
            setCompanions([]);
          }
        } else {
          setCompanions([]);
        }
        const leaderQs = [
          ...(data.champs_chef || []),
          ...(data.champs_communs || []),
        ];
        setCustomAnswers(
          buildEmptyAnswers(leaderQs.length ? leaderQs : data.champs_personnalises)
        );
        const compFields = type === 'deplacements'
          ? DEFAULT_COMPETITOR_FIELDS
          : data.champs_competiteur || [];
        setCompetitorAnswers(buildEmptyAnswers(compFields));
      })
      .catch(() => setError(`${label[0].toUpperCase() + label.slice(1)} introuvable.`))
      .finally(() => setLoading(false));
  }, [type, id, label]);

  const onChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm((f) => ({ ...f, [name]: inputType === 'checkbox' ? checked : value }));
  };

  const chooseRole = (role) => {
    setForm((f) => ({ ...f, role_candidat: role }));
    if (role !== 'competiteur') {
      setCompetitorAnswers(buildEmptyAnswers(competitorFields));
    }
  };

  const chooseInscriptionMode = (mode) => {
    setForm((f) => ({ ...f, mode_inscription: mode }));
    if (mode === 'groupe') {
      setCompanions((prev) =>
        prev.length ? prev : [emptyCompanion(memberFormFields)]
      );
    } else {
      setCompanions([]);
    }
  };

  const setCompanion = (index, patch) => {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCompanion = () => {
    if (companions.length >= groupMax) return;
    setCompanions((prev) => [...prev, emptyCompanion(memberFormFields)]);
  };

  const removeCompanion = (index) => {
    if (companions.length <= groupMin) return;
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAnswers = (setter) => (field, value) => {
    setter((prev) => ({ ...prev, [field.id]: value }));
  };

  const resetForm = () => {
    const a = eventAudience(activity);
    const mode = a === 'groupe' ? 'groupe' : a === 'personne' ? 'personne' : '';
    setForm({ ...emptyBase, mode_inscription: mode });
    setCustomAnswers(buildEmptyAnswers(customFields));
    setCompetitorAnswers(buildEmptyAnswers(competitorFields));
    setCompanions(mode === 'groupe' ? [emptyCompanion(memberFormFields)] : []);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isPaidActivity && form.accepte_paiement !== true) {
      setError('Veuillez confirmer que vous êtes prêt(e) à payer.');
      return;
    }
    if (isTrip && form.role_candidat !== 'spectateur' && form.role_candidat !== 'competiteur') {
      setError('Choisissez spectateur ou compétiteur.');
      return;
    }
    if (isEvent) {
      const mode =
        audience === 'groupe'
          ? 'groupe'
          : audience === 'personne'
            ? 'personne'
            : form.mode_inscription;
      if (audience === 'les_deux' && mode !== 'personne' && mode !== 'groupe') {
        setError('Choisissez si vous vous inscrivez seul(e) ou en groupe.');
        return;
      }
      if (mode === 'groupe') {
        if (companions.length < groupMin || companions.length > groupMax) {
          setError(`Ajoutez entre ${groupMin} et ${groupMax} membre(s) du groupe (en plus de vous).`);
          return;
        }
        for (let i = 0; i < companions.length; i += 1) {
          if (!companions[i].prenom.trim() || !companions[i].nom.trim()) {
            setError(`Membre du groupe #${i + 1} : prénom et nom obligatoires.`);
            return;
          }
          const memberErr = validateFields(memberFormFields, companions[i].reponses || {});
          if (memberErr) {
            setError(`Membre #${i + 1} — ${memberErr}`);
            return;
          }
        }
      }
    }
    const commonError = validateFields(customFields, customAnswers);
    if (commonError) {
      setError(commonError);
      return;
    }
    if (isCompetitor) {
      const competitorError = validateFields(competitorFields, competitorAnswers);
      if (competitorError) {
        setError(competitorError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = hideDefaultIdentity
        ? {
            prenom: customAnswers.prenom || form.prenom,
            nom: customAnswers.nom || form.nom,
            email: customAnswers.email || form.email,
            telephone: customAnswers.telephone || form.telephone,
            filiere: customAnswers.filiere || form.filiere,
            annee: customAnswers.annee || form.annee,
          }
        : {
            prenom: form.prenom,
            nom: form.nom,
            email: form.email,
            telephone: form.telephone,
            filiere: form.filiere,
            annee: form.annee,
          };
      if (isPaidActivity) payload.accepte_paiement = true;
      if (isTrip) payload.role_candidat = form.role_candidat;
      if (isEvent) {
        const mode =
          audience === 'groupe'
            ? 'groupe'
            : audience === 'personne'
              ? 'personne'
              : form.mode_inscription;
        payload.mode_inscription = mode;
        payload.accompagnants = mode === 'groupe' ? companions : [];
      }
      if (customFields.length || isEvent) {
        payload.reponses_personnalisees = {
          ...(payload.reponses_personnalisees || {}),
          ...customAnswers,
          ...(isEvent ? { mode_inscription: payload.mode_inscription } : {}),
        };
      }
      if (isCompetitor) {
        payload.reponses_competiteur = competitorAnswers;
        payload.reponses_personnalisees = {
          ...(payload.reponses_personnalisees || {}),
          ...competitorAnswers,
        };
      }
      const { data } = await api.post(`/${type}/${id}/register`, payload);
      setSuccess(data.message || 'Inscription envoyée.');
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Inscription impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field, answers, setAnswers) => {
    const setValue = updateAnswers(setAnswers);
    return (
      <div className={styles.fieldCard} key={field.id}>
        {field.type === 'checkbox' ? (
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={!!answers[field.id]}
              onChange={(e) => setValue(field, e.target.checked)}
              required={field.required}
            />
            <span>
              {field.label}
              {field.required ? ' *' : ''}
            </span>
          </label>
        ) : field.type === 'multiselect' ? (
          <>
            <p className={styles.question}>
              {field.label}
              {field.required ? (
                <>
                  {' '}
                  <span>*</span>
                </>
              ) : null}
            </p>
            <div className={styles.choices}>
              {(field.options || []).map((opt) => {
                const selected = Array.isArray(answers[field.id]) ? answers[field.id] : [];
                return (
                  <label key={opt} className={styles.choice}>
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={(e) => {
                        const current = Array.isArray(answers[field.id])
                          ? answers[field.id]
                          : [];
                        const next = e.target.checked
                          ? [...current, opt]
                          : current.filter((x) => x !== opt);
                        setValue(field, next);
                      }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </>
        ) : field.type === 'select' ? (
          <>
            <p className={styles.question}>
              {field.label}
              {field.required ? (
                <>
                  {' '}
                  <span>*</span>
                </>
              ) : null}
            </p>
            <div className={styles.choices}>
              {(field.options || []).map((opt) => (
                <label key={opt} className={styles.choice}>
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    checked={answers[field.id] === opt}
                    onChange={() => setValue(field, opt)}
                    required={field.required}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <label>
              {field.label}
              {field.required ? (
                <>
                  {' '}
                  <span>*</span>
                </>
              ) : null}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={answers[field.id] || ''}
                onChange={(e) => setValue(field, e.target.value)}
                required={field.required}
                rows={4}
                placeholder="Réponse longue"
              />
            ) : (
              <input
                type={
                  field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                }
                value={answers[field.id] || ''}
                onChange={(e) => setValue(field, e.target.value)}
                required={field.required}
                placeholder={field.type === 'date' ? undefined : 'Réponse courte'}
                {...(field.type === 'date'
                  ? isBirthDateField(field)
                    ? { max: dateMax }
                    : { min: dateMin }
                  : {})}
              />
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) return <Loader />;

  if (!activity) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`container ${styles.wrap}`}>
          <section className={styles.introCard}>
            <h1>Introuvable</h1>
            <p>{error || `Ce ${label} n’existe pas.`}</p>
            <p className={styles.cta}>
              <Link to={listPath}>← Retour</Link>
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (!(activity.inscription_ouverte || activity.inscription_ouverte)) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`container ${styles.wrap}`}>
          <section className={styles.introCard}>
            <h1>Inscriptions fermées</h1>
            <p>
              Les inscriptions pour <strong>{activity.titre}</strong> ne sont pas ouvertes
              pour le moment.
            </p>
            <p className={styles.cta}>
              <Link to={listPath}>← Retour à la liste</Link>
            </p>
          </section>
        </div>
      </div>
    );
  }

  const minC = groupMin;
  const maxC = groupMax;
  const identityFieldIds = ['prenom', 'nom', 'email', 'telephone'];
  const identityCustomFields = identityFieldIds
    .map((fid) => customFields.find((f) => f.id === fid))
    .filter(Boolean);
  const otherCustomFields = customFields.filter((f) => !identityFieldIds.includes(f.id));
  const groupMembersBlock = isGroupEvent ? (
            <div className={styles.fieldCard}>
              <p className={styles.question}>
                Membres du groupe (en plus de vous) — {minC} à {maxC} <span>*</span>
              </p>
              {companions.map((c, index) => (
                <div
                  key={`comp-${index}`}
                  style={{
                    display: 'grid',
                    gap: '0.55rem',
                    marginBottom: '0.85rem',
                    paddingBottom: '0.85rem',
                    borderBottom: '1px solid #e8eaed',
                  }}
                >
                  <strong style={{ fontWeight: 500 }}>Membre #{index + 1}</strong>
                  <input
                    placeholder="Prénom — Réponse courte"
                    value={c.prenom}
                    onChange={(e) => setCompanion(index, { prenom: e.target.value })}
                    required
                  />
                  <input
                    placeholder="Nom — Réponse courte"
                    value={c.nom}
                    onChange={(e) => setCompanion(index, { nom: e.target.value })}
                    required
                  />
                  {memberFormFields.map((field) =>
                    renderField(field, c.reponses || {}, (updater) => {
                      setCompanions((prev) =>
                        prev.map((m, i) =>
                          i === index
                            ? { ...m, reponses: updater(m.reponses || {}) }
                            : m
                        )
                      );
                    })
                  )}
                  {companions.length > minC && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => removeCompanion(index)}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              ))}
              {companions.length < maxC && (
                <button type="button" className={styles.clearBtn} onClick={addCompanion}>
                  + Ajouter un membre
                </button>
              )}
            </div>
  ) : null;
  const dateLabel = activity.date_competition
    ? String(activity.date_competition).slice(0, 10)
    : activity.date
      ? String(activity.date).slice(0, 10)
      : '';

  return (
    <div className={`page ${styles.page}`}>
      <div className={`container ${styles.wrap}`}>
        <section className={styles.introCard}>
          <h1>
            {isTrip
              ? activity.titre
              : `Inscription — ${activity.titre}`}
          </h1>
          {isTrip && (activity.destination || dateLabel || activity.competition) && (
            <p className={styles.introMeta}>
              {[activity.competition, activity.destination, dateLabel]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <p>
            {isEvent
              ? audience === 'groupe'
                ? 'Remplissez ce formulaire pour inscrire un groupe à cet événement.'
                : audience === 'personne'
                  ? 'Remplissez ce formulaire pour vous inscrire à cet événement.'
                  : 'Remplissez ce formulaire pour vous inscrire à cet événement, seul(e) ou en groupe.'
              : isTrip
                ? `Inscription d’une équipe au déplacement pour la compétition externe${
                    activity.competition ? ` « ${activity.competition} »` : ''
                  }. Le chef d’équipe remplit une seule réponse pour toute son équipe.`
                : 'Remplissez ce formulaire pour vous inscrire à cette formation.'}
          </p>
          {isTrip && (
            <p className={styles.introNote}>
              <strong>Attention :</strong> pas besoin de surcharger le formulaire. Une seule
              inscription par personne suffit pour garantir votre place.
            </p>
          )}
          <p className={styles.cta}>
            <Link to={listPath}>← Retour</Link>
          </p>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          {showAudienceChoice && (
            <div className={styles.fieldCard}>
              <p className={styles.question}>
                Vous vous inscrivez : <span>*</span>
              </p>
              <div className={styles.choices}>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="mode_inscription"
                    value="personne"
                    checked={form.mode_inscription === 'personne'}
                    onChange={() => chooseInscriptionMode('personne')}
                    required
                  />
                  Une personne (seul(e))
                </label>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="mode_inscription"
                    value="groupe"
                    checked={form.mode_inscription === 'groupe'}
                    onChange={() => chooseInscriptionMode('groupe')}
                    required
                  />
                  Un groupe
                </label>
              </div>
              {!form.mode_inscription && (
                <p className={styles.roleHint}>Sélectionnez une option pour continuer.</p>
              )}
            </div>
          )}

          {isTrip && (
            <div className={styles.fieldCard}>
              <p className={styles.question}>
                Vous êtes : <span>*</span>
              </p>
              <div className={styles.choices}>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="role_candidat"
                    value="competiteur"
                    checked={form.role_candidat === 'competiteur'}
                    onChange={() => chooseRole('competiteur')}
                    required
                  />
                  Compétiteur
                </label>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="role_candidat"
                    value="spectateur"
                    checked={form.role_candidat === 'spectateur'}
                    onChange={() => chooseRole('spectateur')}
                    required
                  />
                  Spectateur
                </label>
              </div>
              {!form.role_candidat && (
                <p className={styles.roleHint}>Sélectionnez une option pour continuer.</p>
              )}
            </div>
          )}

          {!hideDefaultIdentity && (
          <>
          <div className={styles.fieldCard}>
            <label>
              {isCompetitor ? 'Prénom du chef d’équipe' : 'Prénom'} <span>*</span>
            </label>
            <input
              name="prenom"
              value={form.prenom}
              onChange={onChange}
              required
              placeholder="Réponse courte"
            />
          </div>
          <div className={styles.fieldCard}>
            <label>
              {isCompetitor ? 'Nom du chef d’équipe' : 'Nom'} <span>*</span>
            </label>
            <input
              name="nom"
              value={form.nom}
              onChange={onChange}
              required
              placeholder="Réponse courte"
            />
          </div>
          <div className={styles.fieldCard}>
            <label>
              {isCompetitor ? 'Email du chef d’équipe' : 'Email'} <span>*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              placeholder="Réponse courte"
            />
          </div>
          <div className={styles.fieldCard}>
            <label>
              {isCompetitor ? 'Numéro de téléphone du chef d’équipe' : 'Numéro de téléphone'}{' '}
              <span>*</span>
            </label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={onChange}
              required
              placeholder="Réponse courte"
            />
          </div>
          {isGroupEvent && groupMembersBlock}
          <div className={styles.fieldCard}>
            <p className={styles.question}>
              {isCompetitor ? 'Filière du chef d’équipe' : 'Quelle filière ?'} <span>*</span>
            </p>
            <div className={styles.choices}>
              {STUDY_FIELDS.map((opt) => (
                <label key={opt} className={styles.choice}>
                  <input
                    type="radio"
                    name="filiere"
                    value={opt}
                    checked={form.filiere === opt}
                    onChange={onChange}
                    required
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className={styles.fieldCard}>
            <p className={styles.question}>Niveau d’études</p>
            <div className={styles.choices}>
              {LEVELS.map((lvl) => (
                <label key={lvl} className={styles.choice}>
                  <input
                    type="radio"
                    name="annee"
                    value={lvl}
                    checked={form.annee === lvl}
                    onChange={onChange}
                  />
                  {lvl}
                </label>
              ))}
            </div>
          </div>
          </>
          )}

          {isCompetitor && (
            <>
              {visibleCompetitorFields
                .filter((field) => field.id === 'comp_nom_robot')
                .map((field) =>
                  renderField(field, competitorAnswers, setCompetitorAnswers)
                )}
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Membres de l’équipe</h2>
                <p>
                  Indiquez le nombre de participants. Les champs des membres
                  supplémentaires s’affichent selon le nombre choisi.
                </p>
              </div>
              {visibleCompetitorFields
                .filter((field) => field.id !== 'comp_nom_robot')
                .map((field) =>
                  renderField(field, competitorAnswers, setCompetitorAnswers)
                )}
            </>
          )}

          {hideDefaultIdentity && (
            <>
              {identityCustomFields.map((field) =>
                renderField(field, customAnswers, setCustomAnswers)
              )}
              {groupMembersBlock}
              {otherCustomFields.map((field) =>
                renderField(field, customAnswers, setCustomAnswers)
              )}
            </>
          )}
          {!hideDefaultIdentity &&
            customFields.map((field) => renderField(field, customAnswers, setCustomAnswers))}

          {isPaidActivity && (
            <div className={styles.fieldCard}>
              <p className={styles.question}>
                {isEvent
                  ? `Acceptez-vous de payer ${activity.prix} DT pour vous inscrire ?`
                  : `Acceptez-vous de payer ${activity.prix} DT ?`}{' '}
                <span>*</span>
              </p>
              <div className={styles.choices}>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="accepte_paiement"
                    checked={form.accepte_paiement === true}
                    onChange={() =>
                      setForm((f) => ({ ...f, accepte_paiement: true }))
                    }
                    required
                  />
                  Oui
                </label>
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="accepte_paiement"
                    checked={form.accepte_paiement === false}
                    onChange={() =>
                      setForm((f) => ({ ...f, accepte_paiement: false }))
                    }
                  />
                  Non
                </label>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.clearBtn} onClick={resetForm}>
              Effacer le formulaire
            </button>
            <button
              type="submit"
              className={styles.submit}
              disabled={submitting || (isTrip && !form.role_candidat)}
            >
              {submitting ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
