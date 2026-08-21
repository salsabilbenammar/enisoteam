import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './Recruitment.module.css';

const TABS = [
  { id: 'merits', label: 'Système de mérites' },
  { id: 'reglement', label: 'Règlement interne' },
  { id: 'reports', label: 'Signaler un problème' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'trainings', label: 'Demander une formation' },
];

const DEFAULT_MERIT_RULES = `3.8 — Le système mérite

Le système mérite est un outil d'évaluation exclusif à l'ENISo Team. Il vise à valoriser le travail des membres à travers des points. Le cumul des points reflète le niveau d'implication et d'engagement du membre.

Chaque membre est soumis à une évaluation mensuelle. Cette évaluation se base sur des critères tels que : la présence aux réunions, l'accomplissement des tâches, la discipline, l'assiduité, le respect, ainsi que d'autres critères définis par le responsable RH.

Barème des points

• Présence aux réunions ordinaires — 2 points
• Présence à l'Assemblée Générale — 6 points
• Participation et le travail continu dans un projet — 5 points
• Proposition d'un projet, avec l'approbation du bureau et le travail continu sur ce projet — 8 points
• Suggestion d'une idée d'un projet réalisable — 1 point
• Participation à une compétition robotique et l'obtention d'un prix — 10 points
• Participation à une compétition robotique — 3 points
• Participation à une compétition robotique et le travail continu sur le projet — 5 points
• Participation aux sorties de sponsoring — 3 points
• Participation au sein d'un comité d'organisation — 3 points
• Décrocher un passage radio — 3 points
• Participation à l'organisation des événements du Club — 4 points
• Proposition d'un événement et le travail continu pour le faire réussir — 8 points
• Participation à une formation — 1 point
• Participation à une visite industrielle — 1 point
• Absentéisme pour trois réunions successives — −6 points

Des points supplémentaires seront attribués selon la motivation et les actions de bénévolat.`;

const DEFAULT_REGLEMENT_INTERNE = `3.2 — Droits et devoirs, comportement des membres

3.2.1. Droits

• Chaque membre a le droit de proposer un projet « innovant » au Bureau Exécutif, présenter son projet, présider son équipe du projet et se bénéficier des formations et matériels exigés après l'approbation du bureau.
• Chaque membre a le droit d'être initié au monde de la robotique et d'avoir le soutien à l'utilisation des matériels.
• Il a le droit de l'utilisation sur place le matériel du club en fonction de sa disponibilité ou l'emprunter après avoir remplir une demande d'emprunt.
• Chaque membre a le droit d'assister aux formations proposées par le responsable formation.
• Chaque membre a le droit de participer aux compétitions nationales de la robotique avec le soutien du club.

3.2.2. Devoirs

• Chaque membre doit impérativement respecter le règlement interne.
• Respecter l'ensemble du matériel du club.
• Veiller à la propreté et à la sécurité du lieu de travail, au rangement du matériel après utilisation.
• Chaque membre doit participer, au moins, à un projet.
• Participer aux activités proposées par le bureau et faire partie du comité organisateur de chaque événement du club, et essentiellement E.S.C.
• Tous les renseignements personnels communiqués au bureau de l'ENISo Team par ses membres restent confidentiels et ne sont en aucun cas communiqués à des tiers.

3.2.3. Comportement des membres

• Chaque membre s'engage à promouvoir la bonne image de l'ENISo Team et il est obligé également par son attitude ou ses déclarations à ne pas nuire à cette image.
• Les membres doivent adopter une attitude sportive et respectueuse envers les autres clubs de notre école ou des autres écoles.
• Tout comportement visant à troubler l'ordre et le bon fonctionnement du club, envers les responsables et/ou les autres adhérents, expose son propriétaire à des sanctions pouvant aller jusqu'à la révocation.
• Le non-respect de la propreté et l'organisation de l'espace du travail et du local expose l'adhérant à des avertissements et des sanctions pouvant aller jusqu'à la révocation.`;

export default function Recruitment() {
  const { isClubMemberOnly } = useAuth();
  const [tab, setTab] = useState('merits');
  const [loading, setLoading] = useState(true);
  const [meritRules, setMeritRules] = useState(DEFAULT_MERIT_RULES);
  const [reglementInterne, setReglementInterne] = useState(DEFAULT_REGLEMENT_INTERNE);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [report, setReport] = useState({ sujet: '', message: '' });
  const [suggestion, setSuggestion] = useState({ titre: '', message: '' });
  const [training, setTraining] = useState({ theme: '', message: '', niveau: '' });

  const [myMerits, setMyMerits] = useState({ total_points: 0, entries: [], catalog: [] });
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const tasks = [
      api.get('/site-settings').catch(() => ({ data: {} })),
    ];
    if (isClubMemberOnly) {
      tasks.push(
        api.get('/rh/merits/me').catch(() => ({ data: { total_points: 0, entries: [], catalog: [] } })),
        api.get('/rh/merits/leaderboard').catch(() => ({ data: [] }))
      );
    }
    Promise.all(tasks)
      .then(([settingsRes, meritsRes, boardRes]) => {
        setMeritRules(settingsRes.data.merit_rules || DEFAULT_MERIT_RULES);
        setReglementInterne(settingsRes.data.reglement_interne || DEFAULT_REGLEMENT_INTERNE);
        if (meritsRes) setMyMerits(meritsRes.data || { total_points: 0, entries: [], catalog: [] });
        if (boardRes) setLeaderboard(Array.isArray(boardRes.data) ? boardRes.data : []);
      })
      .finally(() => setLoading(false));
  }, [isClubMemberOnly]);

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
            Mérites, règlement interne, signalements anonymes, idées innovantes et demandes de
            formations — un espace réservé aux membres.
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
          <div className={styles.meritLayout}>
            {isClubMemberOnly && (
              <>
                <section className={`card ${styles.card} ${styles.meritHero}`}>
                  <p className={styles.meritLabel}>Mon score mérite</p>
                  <p className={styles.meritScore}>{Number(myMerits.total_points || 0)}</p>
                  <p className={styles.meritHint}>points cumulés selon le barème officiel</p>
                </section>

                <div className={styles.gridTwo}>
                  <section className={`card ${styles.card}`}>
                    <h2>Mon historique</h2>
                    {!myMerits.entries?.length ? (
                      <p className={styles.anonNote}>Aucune attribution pour le moment.</p>
                    ) : (
                      <ul className={styles.list}>
                        {myMerits.entries.map((e) => (
                          <li key={e.id}>
                            <span>
                              {Number(e.points) > 0 ? '+' : ''}
                              {e.points}
                            </span>
                            <div>
                              <strong>{e.motif}</strong>
                              <time dateTime={e.created_at}>
                                {new Date(e.created_at).toLocaleString('fr-FR')}
                              </time>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className={`card ${styles.card}`}>
                    <h2>Classement</h2>
                    {!leaderboard.length ? (
                      <p className={styles.anonNote}>Pas encore de classement.</p>
                    ) : (
                      <ol className={styles.leaderboard}>
                        {leaderboard.slice(0, 15).map((row, idx) => (
                          <li key={row.id}>
                            <span>{idx + 1}</span>
                            <div>
                              <strong>{row.nom}</strong>
                              <span className={styles.meta}>{row.filiere || '—'}</span>
                            </div>
                            <strong>{Number(row.total_points || 0)} pts</strong>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              </>
            )}

            {(myMerits.catalog?.length > 0 || true) && (
              <section className={`card ${styles.card} ${styles.formCard} ${styles.rulesCard}`}>
                <h2>Barème des points</h2>
                <div className={styles.baremeTableWrap}>
                  <table className={styles.baremeTable}>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(myMerits.catalog?.length
                        ? myMerits.catalog.filter((a) => !a.customPoints)
                        : []
                      ).map((a) => (
                        <tr key={a.code}>
                          <td>{a.label}</td>
                          <td>
                            {a.points > 0 ? '+' : ''}
                            {a.points}
                          </td>
                        </tr>
                      ))}
                      {!myMerits.catalog?.length &&
                        meritRules
                          .split('\n')
                          .filter((l) => l.trim().startsWith('•'))
                          .map((line, i) => (
                            <tr key={i}>
                              <td colSpan={2}>{line.trim()}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.meritHint} style={{ marginTop: '1rem' }}>
                  Des points supplémentaires seront attribués selon la motivation et les actions de
                  bénévolat.
                </p>
              </section>
            )}
          </div>
        )}

        {tab === 'reglement' && (
          <section className={`card ${styles.card} ${styles.formCard} ${styles.rulesCard}`}>
            <h2>Règlement interne</h2>
            <div className={styles.rulesBody}>
              {reglementInterne.split('\n').map((line, i) => {
                const text = line.trim();
                if (!text) return <br key={i} />;
                if (/^\d+(\.\d+)*\s*[.—-]/.test(text) || /^\d+\.\d+\./.test(text)) {
                  return (
                    <h3 key={i} className={styles.rulesHeading}>
                      {text}
                    </h3>
                  );
                }
                if (text.startsWith('•')) {
                  return (
                    <p key={i} className={styles.rulesBullet}>
                      {text}
                    </p>
                  );
                }
                return <p key={i}>{text}</p>;
              })}
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
