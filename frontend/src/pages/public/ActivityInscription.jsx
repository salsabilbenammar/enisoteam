import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { isBirthDateField, localToday, minSelectableDate } from '../../utils/dateLimits';
import styles from './Candidature.module.css';

const LEVELS = ['1st year', '2nd year', '3rd year'];

const emptyBase = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  filiere: '',
  annee: '',
  accepte_paiement: false,
};

/**
 * Registration form (same design as Candidature).
 * type: 'events' | 'trainings'
 */
export default function ActivityInscription({ type }) {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyBase);
  const [companions, setCompanions] = useState([]);
  const [customAnswers, setCustomAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEvent = type === 'events';
  const listPath = isEvent ? '/events' : '/trainings';
  const label = isEvent ? 'event' : 'training';
  const isPaidTraining = !isEvent && activity?.payante;
  const isGroupEvent = isEvent && activity?.formulaire_type === 'avec_accompagnants';
  const customFields = activity?.champs_personnalises || [];

  useEffect(() => {
    api
      .get(`/${type}/${id}`)
      .then((res) => {
        const data = res.data;
        setActivity(data);
        if (type === 'events' && data.formulaire_type === 'avec_accompagnants') {
          const min = Number(data.accompagnants_min) || 0;
          const start = Math.max(min, 0);
          setCompanions(
            Array.from({ length: start }, () => ({ prenom: '', nom: '' }))
          );
        } else {
          setCompanions([]);
        }
        const answers = {};
        for (const field of data.champs_personnalises || []) {
          if (field.type === 'checkbox') answers[field.id] = false;
          else if (field.type === 'multiselect') answers[field.id] = [];
          else answers[field.id] = '';
        }
        setCustomAnswers(answers);
      })
      .catch(() => setError(`${label[0].toUpperCase() + label.slice(1)} not found.`))
      .finally(() => setLoading(false));
  }, [type, id, label]);

  const onChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm((f) => ({ ...f, [name]: inputType === 'checkbox' ? checked : value }));
  };

  const setCompanion = (index, patch) => {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCompanion = () => {
    const max = Number(activity?.accompagnants_max) || 0;
    if (companions.length >= max) return;
    setCompanions((prev) => [...prev, { prenom: '', nom: '' }]);
  };

  const removeCompanion = (index) => {
    const min = Number(activity?.accompagnants_min) || 0;
    if (companions.length <= min) return;
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (isPaidTraining && !form.accepte_paiement) {
      setError('Please confirm that you are willing to pay.');
      return;
    }
    if (isGroupEvent) {
      const min = Number(activity.accompagnants_min) || 0;
      const max = Number(activity.accompagnants_max) || 0;
      if (companions.length < min || companions.length > max) {
        setError(`Please add between ${min} and ${max} companion(s).`);
        return;
      }
      for (let i = 0; i < companions.length; i += 1) {
        if (!companions[i].prenom.trim() || !companions[i].nom.trim()) {
          setError(`Companion #${i + 1}: first name and last name are required.`);
          return;
        }
      }
    }
    for (const field of customFields) {
      const value = customAnswers[field.id];
      if (field.type === 'checkbox') {
        if (field.required && !value) {
          setError(`Please complete: ${field.label}`);
          return;
        }
      } else if (field.type === 'multiselect') {
        if (field.required && !(Array.isArray(value) && value.length)) {
          setError(`Please complete: ${field.label}`);
          return;
        }
      } else if (field.required && !String(value || '').trim()) {
        setError(`Please complete: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        filiere: form.filiere,
        annee: form.annee,
      };
      if (isPaidTraining) payload.accepte_paiement = true;
      if (isGroupEvent) payload.accompagnants = companions;
      if (customFields.length) payload.reponses_personnalisees = customAnswers;
      const { data } = await api.post(`/${type}/${id}/register`, payload);
      setSuccess(data.message || 'Registration submitted.');
      setForm(emptyBase);
      if (isGroupEvent) {
        const min = Number(activity.accompagnants_min) || 0;
        setCompanions(Array.from({ length: min }, () => ({ prenom: '', nom: '' })));
      }
      const answers = {};
      for (const field of customFields) {
        if (field.type === 'checkbox') answers[field.id] = false;
        else if (field.type === 'multiselect') answers[field.id] = [];
        else answers[field.id] = '';
      }
      setCustomAnswers(answers);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  if (!activity) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`container ${styles.wrap}`}>
          <section className={styles.introCard}>
            <h1>Not found</h1>
            <hr className={styles.rule} />
            <p>{error || `This ${label} does not exist.`}</p>
            <Link to={listPath} className="btn btn-primary">
              Back
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (!activity.inscription_ouverte) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={`container ${styles.wrap}`}>
          <section className={styles.introCard}>
            <h1>Registration closed</h1>
            <hr className={styles.rule} />
            <p>
              Registration for <strong>{activity.titre}</strong> is not open at the moment.
            </p>
            <Link to={listPath} className="btn btn-secondary">
              Back to list
            </Link>
          </section>
        </div>
      </div>
    );
  }

  const minC = Number(activity.accompagnants_min) || 0;
  const maxC = Number(activity.accompagnants_max) || 0;

  return (
    <div className={`page ${styles.page}`}>
      <div className={`container ${styles.wrap}`}>
        <section className={styles.introCard}>
          <h1>Registration — {activity.titre}</h1>
          <hr className={styles.rule} />
          <p>
            {isEvent
              ? isGroupEvent
                ? `Fill out this form to register for this event with companions (${minC}–${maxC}). We will get back to you by email.`
                : 'Fill out this form to register for this event. We will get back to you by email.'
              : 'Fill out this form to register for this training. We will get back to you by email.'}
          </p>
          <p className={styles.cta}>
            <Link to={listPath}>← Back</Link>
          </p>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.fieldCard}>
            <label>
              First name <span>*</span>
            </label>
            <input name="prenom" value={form.prenom} onChange={onChange} required />
          </div>
          <div className={styles.fieldCard}>
            <label>
              Last name <span>*</span>
            </label>
            <input name="nom" value={form.nom} onChange={onChange} required />
          </div>
          <div className={styles.fieldCard}>
            <label>
              Email <span>*</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </div>
          <div className={styles.fieldCard}>
            <label>
              Phone number <span>*</span>
            </label>
            <input name="telephone" value={form.telephone} onChange={onChange} required />
          </div>
          <div className={styles.fieldCard}>
            <label>Field of study</label>
            <input name="filiere" value={form.filiere} onChange={onChange} />
          </div>
          <div className={styles.fieldCard}>
            <p className={styles.question}>Level of study</p>
            {LEVELS.map((lvl) => (
              <label key={lvl} style={{ display: 'flex', gap: '0.5rem', fontWeight: 500 }}>
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

          {isGroupEvent && (
            <div className={styles.fieldCard}>
              <p className={styles.question}>
                Companions ({minC}–{maxC}) <span>*</span>
              </p>
              {companions.map((c, index) => (
                <div
                  key={`comp-${index}`}
                  style={{
                    display: 'grid',
                    gap: '0.5rem',
                    marginBottom: '0.85rem',
                    paddingBottom: '0.85rem',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <strong style={{ fontWeight: 600 }}>Companion #{index + 1}</strong>
                  <input
                    placeholder="First name"
                    value={c.prenom}
                    onChange={(e) => setCompanion(index, { prenom: e.target.value })}
                    required
                  />
                  <input
                    placeholder="Last name"
                    value={c.nom}
                    onChange={(e) => setCompanion(index, { nom: e.target.value })}
                    required
                  />
                  {companions.length > minC && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeCompanion(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {companions.length < maxC && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addCompanion}>
                  + Add companion
                </button>
              )}
            </div>
          )}

          {customFields.map((field) => (
            <div className={styles.fieldCard} key={field.id}>
              {field.type === 'checkbox' ? (
                <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={!!customAnswers[field.id]}
                    onChange={(e) =>
                      setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.checked }))
                    }
                    required={field.required}
                    style={{ marginTop: '0.25rem' }}
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
                  {(field.options || []).map((opt) => {
                    const selected = Array.isArray(customAnswers[field.id])
                      ? customAnswers[field.id]
                      : [];
                    return (
                      <label
                        key={opt}
                        style={{ display: 'flex', gap: '0.5rem', fontWeight: 500, marginBottom: '0.35rem' }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={(e) => {
                            setCustomAnswers((prev) => {
                              const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
                              const next = e.target.checked
                                ? [...current, opt]
                                : current.filter((x) => x !== opt);
                              return { ...prev, [field.id]: next };
                            });
                          }}
                        />
                        {opt}
                      </label>
                    );
                  })}
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
                      value={customAnswers[field.id] || ''}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      required={field.required}
                      rows={4}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={customAnswers[field.id] || ''}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      required={field.required}
                    >
                      <option value="">Select…</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                      }
                      value={customAnswers[field.id] || ''}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      required={field.required}
                      {...(field.type === 'date'
                        ? isBirthDateField(field)
                          ? { max: localToday() }
                          : { min: minSelectableDate(customAnswers[field.id]) }
                        : {})}
                    />
                  )}
                </>
              )}
            </div>
          ))}

          {isPaidTraining && (
            <div className={styles.fieldCard}>
              <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="accepte_paiement"
                  checked={form.accepte_paiement}
                  onChange={onChange}
                  required
                  style={{ marginTop: '0.25rem' }}
                />
                <span>
                  Are you willing to pay {activity.prix}? <span>*</span>
                </span>
              </label>
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
