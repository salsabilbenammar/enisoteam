import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
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

export default function ManageRH() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('rh');
  const confirm = useConfirm();
  const [tab, setTab] = useState('merits');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [forms, setForms] = useState([]);
  const [formTab, setFormTab] = useState('reports');
  const [meritRules, setMeritRules] = useState(DEFAULT_MERIT_RULES);
  const [reglementInterne, setReglementInterne] = useState(DEFAULT_REGLEMENT_INTERNE);
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [scores, setScores] = useState([]);
  const [meritEntries, setMeritEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [award, setAward] = useState({ member_id: '', action_code: '', points: '', motif: '' });
  const [awarding, setAwarding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadForms = async (type = formTab) => {
    const { data } = await api.get(`/rh/forms/${type}`);
    setForms(data);
  };

  const loadMeritData = async () => {
    const [catRes, scoreRes, entriesRes, memRes] = await Promise.all([
      api.get('/rh/merits/catalog').catch(() => ({ data: [] })),
      api.get('/rh/merits/scores').catch(() => ({ data: [] })),
      api.get('/rh/merits').catch(() => ({ data: [] })),
      api.get('/finance/members').catch(() => ({ data: [] })),
    ]);
    setCatalog(Array.isArray(catRes.data) ? catRes.data : []);
    setScores(Array.isArray(scoreRes.data) ? scoreRes.data : []);
    setMeritEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
    setMembers(Array.isArray(memRes.data) ? memRes.data : []);
  };

  useEffect(() => {
    Promise.all([
      api.get('/site-settings'),
      loadMeritData().catch(() => {}),
    ])
      .then(([settingsRes]) => {
        setMeritRules(settingsRes.data.merit_rules || DEFAULT_MERIT_RULES);
        setReglementInterne(settingsRes.data.reglement_interne || DEFAULT_REGLEMENT_INTERNE);
      })
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

  const saveReglement = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await api.put('/site-settings', {
        reglement_interne: reglementInterne,
      });
      setReglementInterne(data.reglement_interne || reglementInterne);
      setSuccess('Règlement interne mis à jour.');
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

  const selectedAction = catalog.find((a) => a.code === award.action_code);

  const onAward = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!award.member_id || !award.action_code) {
      setError('Choisissez un membre et une action du barème.');
      return;
    }
    setAwarding(true);
    try {
      const body = {
        member_id: Number(award.member_id),
        action_code: award.action_code,
        motif: award.motif.trim() || undefined,
      };
      if (selectedAction?.customPoints) {
        body.points = Number(award.points);
      }
      await api.post('/rh/merits', body);
      setSuccess('Points attribués.');
      setAward({ member_id: award.member_id, action_code: '', points: '', motif: '' });
      await loadMeritData();
    } catch (err) {
      setError(err.response?.data?.message || 'Attribution impossible.');
    } finally {
      setAwarding(false);
    }
  };

  const onSync = async () => {
    setError('');
    setSuccess('');
    setSyncing(true);
    try {
      const { data } = await api.post('/rh/merits/sync');
      setSuccess(data.message || 'Synchronisation terminée.');
      await loadMeritData();
    } catch (err) {
      setError(err.response?.data?.message || 'Synchronisation impossible.');
    } finally {
      setSyncing(false);
    }
  };

  const onDeleteMerit = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette attribution ?',
      message: 'Les points seront retirés du total du membre.',
    });
    if (!ok) return;
    try {
      await api.delete(`/rh/merits/${id}`);
      setSuccess('Attribution supprimée.');
      await loadMeritData();
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
        <p>Mérites automatiques, règlement interne et formulaires des membres.</p>
      </header>

      <ReadOnlyBanner module="rh" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>
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
          className={`${styles.tab} ${tab === 'reglement' ? styles.active : ''}`}
          onClick={() => setTab('reglement')}
        >
          Règlement interne
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
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.35rem' }}>Calcul automatique</h3>
                <p className={styles.empty} style={{ margin: 0 }}>
                  Présences (réunions +2, AG +6, formations +1), listes finales car &amp;
                  compétitions (+3) et absentéisme (−6) sont calculés automatiquement. Les autres
                  actions du barème s&apos;attribuent ici.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={onSync} disabled={syncing}>
                {syncing ? 'Synchronisation…' : 'Recalculer depuis les présences'}
              </button>
            </div>
          </div>

          <form className="card form" onSubmit={onAward} style={{ marginBottom: '1.25rem' }}>
            <h3>Attribuer des points</h3>
            <div className="form-row two">
              <div className="form-group">
                <label htmlFor="merit-member">Membre *</label>
                <select
                  id="merit-member"
                  value={award.member_id}
                  onChange={(e) => setAward({ ...award, member_id: e.target.value })}
                  required
                >
                  <option value="">— Choisir —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="merit-action">Action (barème) *</label>
                <select
                  id="merit-action"
                  value={award.action_code}
                  onChange={(e) => setAward({ ...award, action_code: e.target.value })}
                  required
                >
                  <option value="">— Choisir —</option>
                  {catalog.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label}
                      {a.customPoints ? '' : ` (${a.points > 0 ? '+' : ''}${a.points})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedAction?.customPoints && (
              <div className="form-group">
                <label htmlFor="merit-points">Points *</label>
                <input
                  id="merit-points"
                  type="number"
                  value={award.points}
                  onChange={(e) => setAward({ ...award, points: e.target.value })}
                  placeholder="Ex. 2"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="merit-motif">Précision (optionnel)</label>
              <input
                id="merit-motif"
                value={award.motif}
                onChange={(e) => setAward({ ...award, motif: e.target.value })}
                placeholder="Ex. ESC 2026, projet drone…"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={awarding}>
              {awarding ? 'Attribution…' : 'Attribuer'}
            </button>
          </form>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3>Scores des membres</h3>
            {!scores.length ? (
              <p className="empty">Aucun membre actif.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Membre</th>
                      <th>Filière</th>
                      <th>Points</th>
                      <th>Entrées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{s.nom}</strong>
                        </td>
                        <td>{s.filiere || '—'}</td>
                        <td>
                          <strong>{Number(s.total_points || 0)}</strong>
                        </td>
                        <td>{Number(s.nb_entrees || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3>Historique récent</h3>
            {!meritEntries.length ? (
              <p className="empty">Aucune attribution pour le moment.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Membre</th>
                      <th>Motif</th>
                      <th>Points</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {meritEntries.slice(0, 40).map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.created_at).toLocaleString('fr-FR')}</td>
                        <td>{e.member_nom || '—'}</td>
                        <td>{e.motif}</td>
                        <td>
                          {Number(e.points) > 0 ? '+' : ''}
                          {e.points}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => onDeleteMerit(e.id)}
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form className="card form" onSubmit={saveRules}>
            <h3>Texte d&apos;explication (Coin RH)</h3>
            <div className="form-group">
              <label htmlFor="merit_rules">Explication</label>
              <textarea
                id="merit_rules"
                rows={10}
                value={meritRules}
                onChange={(e) => setMeritRules(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer le texte'}
            </button>
          </form>
        </>
      )}

      {tab === 'reglement' && (
        <form className="card form" onSubmit={saveReglement}>
          <h3>Règlement interne</h3>
          <p className={styles.empty} style={{ marginBottom: '1rem' }}>
            Ce texte s&apos;affiche dans le Coin RH des membres (droits, devoirs et comportement).
          </p>
          <div className="form-group">
            <label htmlFor="reglement_interne">Contenu *</label>
            <textarea
              id="reglement_interne"
              rows={18}
              value={reglementInterne}
              onChange={(e) => setReglementInterne(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le règlement'}
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
      </fieldset>
    </div>
  );
}
