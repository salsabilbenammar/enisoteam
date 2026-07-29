import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './Recruitment.module.css';

const TABS = [
  { id: 'merits', label: 'Système de mérites' },
  { id: 'reports', label: 'Signaler un problème' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'trainings', label: 'Demander une formation' },
];

const DEFAULT_MERIT_RULES = `Comment sont calculés les mérites ?

Les mérites valorisent l'engagement des membres au sein de l'ENISo Team. Ils sont attribués selon les critères suivants :

• Participation active aux réunions et ateliers du club
• Contribution aux projets (robotique, électronique, programmation, mécanique)
• Implication dans l'organisation des événements (notamment l'ESC)
• Aide à la formation et à l'accompagnement des nouveaux membres
• Prospection et partenariats au service du club
• Respect des engagements pris envers l'équipe

Les mérites sont décidés par le bureau (RH) en fonction de la qualité et de la régularité de l'implication — il ne s'agit pas d'un score automatique.`;

export default function Recruitment() {
  const [tab, setTab] = useState('merits');
  const [loading, setLoading] = useState(true);
  const [meritRules, setMeritRules] = useState(DEFAULT_MERIT_RULES);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [report, setReport] = useState({ sujet: '', message: '' });
  const [suggestion, setSuggestion] = useState({ titre: '', message: '' });
  const [training, setTraining] = useState({ theme: '', message: '', niveau: '' });

  useEffect(() => {
    api
      .get('/site-settings')
      .then((res) => setMeritRules(res.data.merit_rules || DEFAULT_MERIT_RULES))
      .catch(() => setMeritRules(DEFAULT_MERIT_RULES))
      .finally(() => setLoading(false));
  }, []);

  const clearFlash = () => {
    setError('');
    setSuccess('');
  };

  const submitReport = async (e) => {
    e.preventDefault();
    clearFlash();
    setSubmitting(true);
    try {
      const { data } = await api.post('/rh/reports', report);
      setSuccess(data.message);
      setReport({ sujet: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitSuggestion = async (e) => {
    e.preventDefault();
    clearFlash();
    setSubmitting(true);
    try {
      const { data } = await api.post('/rh/suggestions', suggestion);
      setSuccess(data.message);
      setSuggestion({ titre: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTraining = async (e) => {
    e.preventDefault();
    clearFlash();
    setSubmitting(true);
    try {
      const { data } = await api.post('/rh/training-requests', training);
      setSuccess(data.message);
      setTraining({ theme: '', message: '', niveau: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Coin RH</h1>
          <p>
            Mérites, signalements anonymes, idées innovantes et demandes de formations — un espace
            réservé aux membres.
          </p>
        </header>

        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => {
                setTab(t.id);
                clearFlash();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {tab === 'merits' && (
          <section className={`card ${styles.card} ${styles.formCard} ${styles.rulesCard}`}>
            <h2>Système de mérites</h2>
            <div className={styles.rulesBody}>
              {meritRules.split('\n').map((line, i) =>
                line.trim() === '' ? <br key={i} /> : <p key={i}>{line}</p>
              )}
            </div>
          </section>
        )}

        {tab === 'reports' && (
          <section className={`card ${styles.card} ${styles.formCard}`}>
            <h2>Signaler un problème</h2>
            <p className={styles.anonNote}>
              Formulaire 100&nbsp;% anonyme — votre identité n&apos;est jamais enregistrée.
            </p>
            <form className="form" onSubmit={submitReport}>
              <div className="form-group">
                <label htmlFor="sujet">Sujet *</label>
                <input
                  id="sujet"
                  value={report.sujet}
                  onChange={(e) => setReport({ ...report, sujet: e.target.value })}
                  placeholder="Ex : Conflit, organisation, matériel…"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="report-msg">Description *</label>
                <textarea
                  id="report-msg"
                  value={report.message}
                  onChange={(e) => setReport({ ...report, message: e.target.value })}
                  placeholder="Décrivez le problème au sein du club…"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Envoi…' : 'Envoyer anonymement'}
              </button>
            </form>
          </section>
        )}

        {tab === 'suggestions' && (
          <section className={`card ${styles.card} ${styles.formCard}`}>
            <h2>Proposer une idée innovante</h2>
            <p className={styles.anonNote}>
              Partagez vos idées pour faire évoluer le club. Votre nom sera associé à la suggestion.
            </p>
            <form className="form" onSubmit={submitSuggestion}>
              <div className="form-group">
                <label htmlFor="titre">Titre de l&apos;idée *</label>
                <input
                  id="titre"
                  value={suggestion.titre}
                  onChange={(e) => setSuggestion({ ...suggestion, titre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sug-msg">Description *</label>
                <textarea
                  id="sug-msg"
                  value={suggestion.message}
                  onChange={(e) => setSuggestion({ ...suggestion, message: e.target.value })}
                  placeholder="Expliquez votre suggestion…"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Envoi…' : 'Envoyer ma suggestion'}
              </button>
            </form>
          </section>
        )}

        {tab === 'trainings' && (
          <section className={`card ${styles.card} ${styles.formCard}`}>
            <h2>Demander une formation</h2>
            <p className={styles.anonNote}>
              Indiquez les formations que vous souhaitez voir organisées au sein du club.
            </p>
            <form className="form" onSubmit={submitTraining}>
              <div className="form-group">
                <label htmlFor="theme">Thème souhaité *</label>
                <input
                  id="theme"
                  value={training.theme}
                  onChange={(e) => setTraining({ ...training, theme: e.target.value })}
                  placeholder="Ex : ROS, électronique analogique, SolidWorks…"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="niveau">Niveau (optionnel)</label>
                <select
                  id="niveau"
                  value={training.niveau}
                  onChange={(e) => setTraining({ ...training, niveau: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="débutant">Débutant</option>
                  <option value="intermédiaire">Intermédiaire</option>
                  <option value="avancé">Avancé</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="train-msg">Précisions *</label>
                <textarea
                  id="train-msg"
                  value={training.message}
                  onChange={(e) => setTraining({ ...training, message: e.target.value })}
                  placeholder="Objectifs, durée souhaitée, prérequis…"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Envoi…' : 'Envoyer ma demande'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
