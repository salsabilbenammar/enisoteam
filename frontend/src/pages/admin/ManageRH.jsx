import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import styles from './ManageRH.module.css';

const FORM_TABS = [
  { id: 'reports', label: 'Signalements', titleKey: 'sujet' },
  { id: 'suggestions', label: 'Suggestions', titleKey: 'titre' },
  { id: 'training_requests', label: 'Demandes formations', titleKey: 'theme' },
];

const STATUS_LABELS = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  traite: 'Traité',
};

const DEFAULT_MERIT_RULES = `Comment sont calculés les mérites ?

Les mérites valorisent l'engagement des membres au sein de l'ENISo Team. Ils sont attribués selon les critères suivants :

• Participation active aux réunions et ateliers du club
• Contribution aux projets (robotique, électronique, programmation, mécanique)
• Implication dans l'organisation des événements (notamment l'ESC)
• Aide à la formation et à l'accompagnement des nouveaux membres
• Prospection et partenariats au service du club
• Respect des engagements pris envers l'équipe

Les mérites sont décidés par le bureau (RH) en fonction de la qualité et de la régularité de l'implication — il ne s'agit pas d'un score automatique.`;

export default function ManageRH() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('merits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [forms, setForms] = useState([]);
  const [formTab, setFormTab] = useState('reports');
  const [meritRules, setMeritRules] = useState(DEFAULT_MERIT_RULES);
  const [saving, setSaving] = useState(false);

  const loadForms = async (type = formTab) => {
    const { data } = await api.get(`/rh/forms/${type}`);
    setForms(data);
  };

  useEffect(() => {
    api
      .get('/site-settings')
      .then((res) => setMeritRules(res.data.merit_rules || DEFAULT_MERIT_RULES))
      .catch((err) => setError(err.response?.data?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'forms') return;
    setError('');
    loadForms(formTab).catch((err) =>
      setError(err.response?.data?.message || 'Chargement des formulaires impossible.')
    );
  }, [tab, formTab]);

  const saveRules = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await api.put('/site-settings', { merit_rules: meritRules });
      setMeritRules(data.merit_rules || meritRules);
      setSuccess('Explication du système de mérites mise à jour.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, statut) => {
    try {
      await api.patch(`/rh/forms/${formTab}/${id}`, { statut });
      await loadForms(formTab);
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    }
  };

  const deleteForm = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette entrée ?',
      message: 'Cette action est définitive. Le formulaire sera définitivement retiré.',
    });
    if (!ok) return;
    try {
      await api.delete(`/rh/forms/${formTab}/${id}`);
      setSuccess('Entrée supprimée.');
      await loadForms(formTab);
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  if (loading) return <Loader />;

  const currentFormMeta = FORM_TABS.find((t) => t.id === formTab);

  return (
    <div>
      <header className="page-header">
        <h1>Coin RH</h1>
        <p>Expliquez le système de mérites et consultez les formulaires des membres.</p>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'merits' ? styles.active : ''}`}
          onClick={() => setTab('merits')}
        >
          Mérites
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'forms' ? styles.active : ''}`}
          onClick={() => setTab('forms')}
        >
          Formulaires
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {tab === 'merits' && (
        <form className="card form" onSubmit={saveRules}>
          <h3>Comment sont calculés les mérites</h3>
          <p className={styles.empty} style={{ marginBottom: '1rem' }}>
            Ce texte s&apos;affiche dans le Coin RH des membres. Aucun calcul de points n&apos;est
            effectué.
          </p>
          <div className="form-group">
            <label htmlFor="merit_rules">Explication *</label>
            <textarea
              id="merit_rules"
              rows={14}
              value={meritRules}
              onChange={(e) => setMeritRules(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer l\'explication'}
          </button>
        </form>
      )}

      {tab === 'forms' && (
        <>
          <div className={styles.tabs}>
            {FORM_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tab} ${formTab === t.id ? styles.active : ''}`}
                onClick={() => setFormTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {forms.length === 0 ? (
            <div className="empty">Aucune entrée.</div>
          ) : (
            <div className={styles.cards}>
              {forms.map((item) => (
                <article key={item.id} className={`card ${styles.formItem}`}>
                  <div className={styles.formHead}>
                    <h3>{item[currentFormMeta.titleKey]}</h3>
                    <span className={`badge ${item.statut === 'nouveau' ? 'badge-accent' : ''}`}>
                      {STATUS_LABELS[item.statut] || item.statut}
                    </span>
                  </div>
                  {item.niveau && <p className={styles.meta}>Niveau : {item.niveau}</p>}
                  <p>{item.message}</p>
                  <p className={styles.meta}>
                    {new Date(item.created_at).toLocaleString('fr-FR')}
                    {formTab === 'suggestions'
                      ? item.member_nom
                        ? ` · ${item.member_nom}${item.member_email ? ` (${item.member_email})` : ''}`
                        : ' · membre'
                      : ' · anonyme'}
                  </p>
                  <div className={styles.actions}>
                    <select
                      value={item.statut}
                      onChange={(e) => setStatus(item.id, e.target.value)}
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="traite">Traité</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => deleteForm(item.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
