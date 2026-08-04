import { useEffect, useMemo, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import MailTemplateEditor from '../../components/admin/MailTemplateEditor';
import styles from './ManageRecruitment.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'preselectionne', label: 'Présélectionné' },
  { value: 'entretien_confirme', label: 'Entretien confirmé' },
  { value: 'present_entretien', label: 'Présent à l\'entretien' },
  { value: 'accepte', label: 'Accepté' },
  { value: 'refuse', label: 'Refusé' },
  { value: 'liste_attente', label: 'Liste d\'attente' },
  { value: 'paiement_en_attente', label: 'Paiement en attente' },
  { value: 'paiement_confirme', label: 'Paiement confirmé' },
];

const LABEL = Object.fromEntries(STATUS_OPTIONS.filter((s) => s.value).map((s) => [s.value, s.label]));

const PIPELINE = [
  { id: 'en_attente', tab: 'candidates', label: 'Reçues' },
  { id: 'entretien_confirme', tab: 'interviews', label: 'Entretiens' },
  { id: 'present_entretien', tab: 'presents', label: 'Présents' },
  { id: 'paiement_en_attente', tab: 'candidates', label: 'Paiement' },
  { id: 'paiement_confirme', tab: 'candidates', label: 'Validés' },
];

const MAIL_CONFIRM_PLACEHOLDERS = [
  { key: 'Nom', hint: 'Prénom + nom du candidat' },
  { key: 'Lien', hint: 'Lien calendrier de réservation' },
];

const MAIL_SUCCESS_PLACEHOLDERS = [
  { key: 'Nom', hint: 'Prénom + nom' },
  { key: 'Montant', hint: 'Montant à payer' },
  { key: 'Delai', hint: 'Délai de paiement' },
  { key: 'Tresorier', hint: 'Nom du trésorier' },
  { key: 'Contact', hint: 'Contact trésorier' },
  { key: 'Infos', hint: 'Infos paiement' },
];

const MAIL_PAYMENT_PLACEHOLDERS = [
  { key: 'Nom', hint: 'Prénom + nom' },
  { key: 'Email', hint: 'Email du compte membre' },
  { key: 'Password', hint: 'Mot de passe temporaire généré' },
  { key: 'LienConnexion', hint: 'Lien vers la page de connexion membre (/login)' },
  { key: 'Messenger', hint: 'Lien d’invitation Messenger' },
  { key: 'Facebook', hint: 'Lien page / groupe Facebook' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

function formatDay(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

function toDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const emptySlot = { date_slot: '', heure_slot: '', max_places: 10, lieu: '' };

export default function ManageRecruitment() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('candidates');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [detail, setDetail] = useState(null);

  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState(emptySlot);
  const [schedule, setSchedule] = useState([]);
  const [orgDate, setOrgDate] = useState('');
  const [orgTime, setOrgTime] = useState('');
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mailingId, setMailingId] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [settingsPane, setSettingsPane] = useState('general');
  const [ready, setReady] = useState(false);

  const loadCandidates = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.search ?? search;
    const st = opts.statut ?? statut;
    const d = opts.date_slot !== undefined ? opts.date_slot : filterDate;
    const t = opts.heure_slot !== undefined ? opts.heure_slot : filterTime;
    const { data } = await api.get('/recruitment/candidates', {
      params: {
        page: p,
        limit: 10,
        search: s || undefined,
        statut: st || undefined,
        date_slot: d || undefined,
        heure_slot: t || undefined,
      },
    });
    setItems(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPages(data.pages);
  };

  const loadSlots = async () => {
    const { data } = await api.get('/recruitment/slots');
    setSlots(data);
  };

  const loadSchedule = async () => {
    const { data } = await api.get('/recruitment/schedule');
    setSchedule(data);
  };

  const loadSettings = async () => {
    const { data } = await api.get('/recruitment/settings');
    setSettings(data);
  };

  const loadStats = async () => {
    const { data } = await api.get('/recruitment/stats');
    setStats(data);
  };

  useEffect(() => {
    Promise.all([loadCandidates(), loadSlots(), loadSchedule(), loadSettings(), loadStats()])
      .catch((err) => setError(err.response?.data?.message || 'Chargement impossible.'))
      .finally(() => {
        setLoading(false);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!ready || tab !== 'candidates') return undefined;
    const t = setTimeout(() => {
      loadCandidates({ page: 1 }).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [ready, tab, search, statut, filterDate, filterTime]);

  useEffect(() => {
    if (tab === 'schedule') {
      loadSchedule().catch((err) =>
        setError(err.response?.data?.message || 'Chargement du planning impossible.')
      );
    }
    if (tab === 'interviews') {
      setStatut('entretien_confirme');
      Promise.all([
        loadCandidates({ page: 1, statut: 'entretien_confirme' }),
        loadStats(),
      ]).catch(() => {});
    }
    if (tab === 'presents') {
      setStatut('present_entretien');
      Promise.all([
        loadCandidates({ page: 1, statut: 'present_entretien' }),
        loadStats(),
      ]).catch(() => {});
    }
    if (tab === 'candidates' || tab === 'slots' || tab === 'settings') {
      loadStats().catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    const onFocus = () => {
      loadStats().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => {
      loadStats().catch(() => {});
    }, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, []);

  const slotDateOptions = useMemo(() => {
    const keys = new Map();
    for (const s of slots) {
      const key = toDateKey(s.date_slot);
      if (key && !keys.has(key)) keys.set(key, formatDay(s.date_slot));
    }
    return [...keys.entries()].map(([value, label]) => ({ value, label }));
  }, [slots]);

  const candidateTimeOptions = useMemo(() => {
    const times = new Set();
    for (const s of slots) {
      if (filterDate && toDateKey(s.date_slot) !== filterDate) continue;
      times.add(formatTime(s.heure_slot));
    }
    return [...times].filter((t) => t !== '—').sort();
  }, [slots, filterDate]);

  const orgDayOptions = useMemo(() => {
    const keys = new Map();
    for (const s of schedule) {
      const key = toDateKey(s.date_slot);
      if (key && !keys.has(key)) keys.set(key, formatDay(s.date_slot));
    }
    return [...keys.entries()].map(([value, label]) => ({ value, label }));
  }, [schedule]);

  const orgTimeOptions = useMemo(() => {
    const times = new Set();
    for (const s of schedule) {
      if (orgDate && toDateKey(s.date_slot) !== orgDate) continue;
      times.add(formatTime(s.heure_slot));
    }
    return [...times].filter((t) => t !== '—').sort();
  }, [schedule, orgDate]);

  const filteredSchedule = useMemo(() => {
    return schedule.filter((slot) => {
      if (orgDate && toDateKey(slot.date_slot) !== orgDate) return false;
      if (orgTime && formatTime(slot.heure_slot) !== orgTime) return false;
      return true;
    });
  }, [schedule, orgDate, orgTime]);

  const filteredCandidatesFlat = useMemo(() => {
    const rows = [];
    for (const slot of filteredSchedule) {
      for (const c of slot.candidates) {
        rows.push({
          ...c,
          date_slot: slot.date_slot,
          heure_slot: slot.heure_slot,
          lieu: slot.lieu,
          slot_id: slot.slot_id,
        });
      }
    }
    return rows;
  }, [filteredSchedule]);

  const flash = (msg) => {
    setSuccess(msg);
    setError('');
    loadStats().catch(() => {});
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/recruitment/candidates/${id}`);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Détail impossible.');
    }
  };

  const deleteCandidate = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce candidat ?',
      message: 'Cette action est définitive.',
    });
    if (!ok) return;
    try {
      await api.delete(`/recruitment/candidates/${id}`);
      flash('Candidat supprimé.');
      await loadCandidates();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const sendConfirmationMail = async (id) => {
    setMailingId(id);
    setError('');
    try {
      const { data } = await api.post(`/recruitment/candidates/${id}/send-confirmation`);
      flash(data.message || 'Email envoyé.');
    } catch (err) {
      setError(err.response?.data?.message || "Envoi de l'email impossible.");
    } finally {
      setMailingId(null);
    }
  };

  const markPresent = async (id) => {
    setCheckingId(id);
    setError('');
    try {
      const { data } = await api.post(`/recruitment/candidates/${id}/mark-present`);
      flash(data.message || 'Présence enregistrée.');
      await Promise.all([
        loadCandidates({ page: 1, statut: 'entretien_confirme' }),
        loadStats(),
        loadSchedule(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Marquage impossible.');
    } finally {
      setCheckingId(null);
    }
  };

  const sendSuccessPaymentMail = async (id) => {
    setMailingId(id);
    setError('');
    try {
      const { data } = await api.post(`/recruitment/candidates/${id}/send-success-payment`);
      flash(data.message || 'Mail de réussite envoyé.');
      await Promise.all([
        loadCandidates({ page: 1, statut: 'present_entretien' }),
        loadStats(),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Envoi de l'email impossible.");
    } finally {
      setMailingId(null);
    }
  };

  const confirmPayment = async (id) => {
    const ok = await confirm({
      title: 'Confirmer le paiement ?',
      message: 'Le candidat passera en « Paiement confirmé », recevra un email, et sera ajouté au Google Sheet.',
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { data } = await api.post('/recruitment/payment-confirm', { ids: [id] });
      flash(data.message);
      await Promise.all([loadCandidates(), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Confirmation impossible.');
    } finally {
      setSaving(false);
    }
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/recruitment/slots', {
        ...slotForm,
        max_places: Number(slotForm.max_places),
      });
      flash('Créneau créé.');
      setSlotForm(emptySlot);
      await loadSlots();
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.message || 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce créneau ?',
      message: 'Les réservations liées devront être gérées manuellement.',
    });
    if (!ok) return;
    try {
      await api.delete(`/recruitment/slots/${id}`);
      flash('Créneau supprimé.');
      await loadSlots();
      await loadSchedule();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/recruitment/settings', settings);
      setSettings(data);
      flash('Paramètres enregistrés.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const byDate = filteredSchedule.reduce((acc, slot) => {
    const key = formatDay(slot.date_slot);
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const countOf = (statutKey) => Number(stats?.byStatus?.[statutKey] || 0);

  /** Compteur fiable pour l’onglet filtré (évite stats obsolètes). */
  const interviewsCount =
    tab === 'interviews' && statut === 'entretien_confirme'
      ? total
      : countOf('entretien_confirme');
  const presentsCount =
    tab === 'presents' && statut === 'present_entretien'
      ? total
      : countOf('present_entretien');

  const openPipeline = (step) => {
    setTab(step.tab);
    if (step.tab === 'candidates') {
      setStatut(step.id);
      loadCandidates({ page: 1, statut: step.id }).catch(() => {});
    }
  };

  const mailSampleVars = {
    Nom: 'Salsabil Benammar',
    Lien: 'http://localhost:5173/recrutement/reservation/…',
    Montant: settings?.montant_paiement || '30 DT',
    Delai: settings?.delai_paiement || '7 jours',
    Tresorier: settings?.tresorier_nom || 'Trésorier ENISO Team',
    Contact: settings?.tresorier_contact || '—',
    Infos: settings?.infos_paiement || '',
    Messenger: settings?.lien_messenger || 'https://m.me/j/…',
    Facebook: settings?.lien_facebook || 'https://facebook.com/…',
    Email: 'candidat@exemple.com',
    Password: 'Ab3xY9kLm2',
    LienConnexion: 'http://localhost:5173/login',
  };

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Recrutement</h1>
          <p>
            Pipeline candidature → entretien → présence → paiement.{' '}
            <strong>{stats.total}</strong> candidat{stats.total > 1 ? 's' : ''} au total.
          </p>
        </div>
        {settings?.google_sheets_url ? (
          <a
            href={settings.google_sheets_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Voir Google Sheet
          </a>
        ) : null}
      </header>

      <div className={styles.pipeline}>
        {PIPELINE.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            className={`${styles.pipeStep} ${
              (tab === step.tab && (tab !== 'candidates' || statut === step.id)) ||
              (tab === 'interviews' && step.id === 'entretien_confirme') ||
              (tab === 'presents' && step.id === 'present_entretien')
                ? styles.pipeActive
                : ''
            }`}
            onClick={() => openPipeline(step)}
          >
            <span className={styles.pipeIndex}>{idx + 1}</span>
            <span className={styles.pipeLabel}>{step.label}</span>
            <strong className={styles.pipeCount}>
              {step.id === 'entretien_confirme'
                ? interviewsCount
                : step.id === 'present_entretien'
                  ? presentsCount
                  : countOf(step.id)}
            </strong>
          </button>
        ))}
      </div>

      {settings && (
        <div className={`card ${styles.toggleCard}`}>
          <div>
            <strong>Candidatures publiques</strong>
            <p className={styles.meta} style={{ margin: '0.25rem 0 0' }}>
              {settings.candidature_ouverte
                ? 'Ouvertes — la page /candidature est visible sur le site.'
                : 'Fermées — la page n’apparaît pas dans le menu public.'}
            </p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={!!settings.candidature_ouverte}
              onChange={async (e) => {
                const next = e.target.checked;
                setSaving(true);
                try {
                  const { data } = await api.put('/recruitment/settings', {
                    ...settings,
                    candidature_ouverte: next,
                  });
                  setSettings(data);
                  flash(next ? 'Candidatures ouvertes.' : 'Candidatures fermées.');
                } catch (err) {
                  setError(err.response?.data?.message || 'Mise à jour impossible.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            />
            <span>{settings.candidature_ouverte ? 'Ouvert' : 'Fermé'}</span>
          </label>
        </div>
      )}

      <div className={styles.tabs}>
        {[
          ['candidates', 'Candidats', stats.total],
          ['interviews', 'Entretiens', interviewsCount],
          ['presents', 'Présents', presentsCount],
          ['slots', 'Créneaux', slots.length],
          ['schedule', 'Organisation', null],
          ['settings', 'Paramètres', null],
        ].map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.active : ''}`}
            onClick={() => {
              if (id === 'candidates') setStatut('');
              setTab(id);
            }}
          >
            {label}
            {count != null && <span className={styles.tabCount}>{count}</span>}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {tab === 'candidates' && (
        <>
          <div className={`card ${styles.toolbar}`}>
            <input
              placeholder="Rechercher nom, email, téléphone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={statut} onChange={(e) => setStatut(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setFilterTime('');
              }}
              aria-label="Filtrer par jour d'entretien"
            >
              <option value="">Tous les jours</option>
              {slotDateOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <select
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              aria-label="Filtrer par heure d'entretien"
              disabled={!filterDate && candidateTimeOptions.length === 0}
            >
              <option value="">Toutes les heures</option>
              {candidateTimeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadCandidates({ page: 1 }).catch(() => {})}
            >
              Filtrer
            </button>
          </div>

          <div className={`card ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Réponses</th>
                  <th>Entretien</th>
                  <th>Candidature</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.prenom} {c.nom}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.telephone}</td>
                    <td>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openDetail(c.id)}>
                        Voir
                      </button>
                    </td>
                    <td>
                      {c.date_slot
                        ? `${formatDay(c.date_slot)} · ${formatTime(c.heure_slot)}`
                        : '—'}
                    </td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      <span className={styles.badge}>{LABEL[c.statut] || c.statut}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {c.statut === 'paiement_en_attente' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => confirmPayment(c.id)}
                            disabled={saving || mailingId === c.id}
                            title="Confirmer le paiement et exporter vers Google Sheet"
                          >
                            Valider paiement
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => sendConfirmationMail(c.id)}
                          disabled={mailingId === c.id}
                          title="Renvoyer le mail de confirmation + lien calendrier"
                        >
                          {mailingId === c.id ? 'Envoi…' : 'Mail'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => deleteCandidate(c.id)}
                          disabled={mailingId === c.id}
                        >
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <p className={styles.empty}>Aucun candidat.</p>}
          </div>

          <div className={styles.pagination}>
            <span>
              {total} résultat{total > 1 ? 's' : ''} — page {page}/{pages}
            </span>
            <div className={styles.pageBtns}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => loadCandidates({ page: page - 1 })}
              >
                Précédent
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= pages}
                onClick={() => loadCandidates({ page: page + 1 })}
              >
                Suivant
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'interviews' && (
        <>
          <div className={`card ${styles.flowCard}`}>
            <div>
              <h3>Entretiens confirmés</h3>
              <p className={styles.meta}>
                Marquez ✓ Présent à l&apos;arrivée du candidat — il passe automatiquement dans
                Présents.
              </p>
            </div>
            <strong className={styles.flowStat}>{interviewsCount}</strong>
          </div>
          <div className={`card ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Créneau</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.prenom} {c.nom}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.telephone}</td>
                    <td>
                      {c.date_slot
                        ? `${formatDay(c.date_slot)} · ${formatTime(c.heure_slot)}`
                        : '—'}
                    </td>
                    <td>
                      <span className={styles.badge}>{LABEL[c.statut] || c.statut}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-primary btn-sm ${styles.checkBtn}`}
                        onClick={() => markPresent(c.id)}
                        disabled={checkingId === c.id}
                        title="Marquer présent à l'entretien"
                      >
                        {checkingId === c.id ? '…' : '✓ Présent'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <p className={styles.empty}>Aucun entretien confirmé pour le moment.</p>
            )}
          </div>
        </>
      )}

      {tab === 'presents' && (
        <>
          <div className={`card ${styles.flowCard}`}>
            <div>
              <h3>Présents à l&apos;entretien</h3>
              <p className={styles.meta}>
                Envoyez le mail de réussite + paiement (textes modifiables dans Paramètres →
                Emails).
              </p>
            </div>
            <strong className={styles.flowStat}>{presentsCount}</strong>
          </div>
          <div className={`card ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Créneau</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.prenom} {c.nom}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.telephone}</td>
                    <td>
                      {c.date_slot
                        ? `${formatDay(c.date_slot)} · ${formatTime(c.heure_slot)}`
                        : '—'}
                    </td>
                    <td>
                      <span className={styles.badge}>{LABEL[c.statut] || c.statut}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => sendSuccessPaymentMail(c.id)}
                        disabled={mailingId === c.id}
                        title="Envoyer mail réussite + paiement"
                      >
                        {mailingId === c.id ? 'Envoi…' : 'Mail réussite'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <p className={styles.empty}>Aucun candidat marqué présent pour le moment.</p>
            )}
          </div>
        </>
      )}

      {tab === 'slots' && (
        <>
          <form className="card form" onSubmit={saveSlot} style={{ marginBottom: '1.25rem' }}>
            <h3>Nouveau créneau</h3>
            <div className="form-row two">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={slotForm.date_slot} onChange={(e) => setSlotForm({ ...slotForm, date_slot: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Heure *</label>
                <input type="time" value={slotForm.heure_slot} onChange={(e) => setSlotForm({ ...slotForm, heure_slot: e.target.value })} required />
              </div>
            </div>
            <div className="form-row two">
              <div className="form-group">
                <label>Places max *</label>
                <input type="number" min="1" value={slotForm.max_places} onChange={(e) => setSlotForm({ ...slotForm, max_places: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Lieu</label>
                <input value={slotForm.lieu} onChange={(e) => setSlotForm({ ...slotForm, lieu: e.target.value })} placeholder="ENISO — salle…" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Créer le créneau
            </button>
          </form>

          <div className={styles.slotGrid}>
            {slots.map((s) => (
              <article key={s.id} className="card">
                <h3>
                  {formatDay(s.date_slot)} — {formatTime(s.heure_slot)}
                </h3>
                <p>
                  {s.reserved}/{s.max_places} places
                  {!s.disponible && <span className={styles.full}> · Complet</span>}
                </p>
                <p className={styles.meta}>{s.lieu || '—'}</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => deleteSlot(s.id)}>
                  Supprimer
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'schedule' && (
        <div className={styles.schedule}>
          <div className={`card ${styles.toolbar}`}>
            <select
              value={orgDate}
              onChange={(e) => {
                setOrgDate(e.target.value);
                setOrgTime('');
              }}
              aria-label="Filtrer organisation par jour"
            >
              <option value="">Tous les jours</option>
              {orgDayOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <select
              value={orgTime}
              onChange={(e) => setOrgTime(e.target.value)}
              aria-label="Filtrer organisation par heure"
            >
              <option value="">Toutes les heures</option>
              {orgTimeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOrgDate('');
                setOrgTime('');
              }}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                loadSchedule().catch((err) =>
                  setError(err.response?.data?.message || 'Actualisation impossible.')
                )
              }
            >
              Actualiser
            </button>
          </div>

          <div className={`card ${styles.tableWrap}`}>
            <h3 style={{ marginTop: 0 }}>
              Liste filtrée — {filteredCandidatesFlat.length} candidat
              {filteredCandidatesFlat.length > 1 ? 's' : ''}
              {orgDate ? ` · ${formatDay(orgDate)}` : ''}
              {orgTime ? ` · ${orgTime}` : ''}
            </h3>
            {filteredCandidatesFlat.length === 0 ? (
              <p className={styles.empty}>Aucun candidat réservé pour ce filtre.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Jour</th>
                    <th>Heure</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Lieu</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidatesFlat.map((c) => (
                    <tr key={`${c.slot_id}-${c.id}`}>
                      <td>{formatDay(c.date_slot)}</td>
                      <td>{formatTime(c.heure_slot)}</td>
                      <td>
                        {c.prenom} {c.nom}
                      </td>
                      <td>{c.email}</td>
                      <td>{c.telephone}</td>
                      <td>{c.lieu || '—'}</td>
                      <td>
                        <span className={styles.badge}>{LABEL[c.statut] || c.statut}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {Object.keys(byDate).length === 0 && (
            <div className="empty">Aucun créneau pour le moment.</div>
          )}
          {Object.entries(byDate).map(([date, daySlots]) => (
            <section key={date} className="card">
              <h2>{date}</h2>
              {daySlots.map((slot) => (
                <div key={slot.slot_id} className={styles.slotBlock}>
                  <h3>
                    {formatTime(slot.heure_slot)}{' '}
                    <span className={styles.meta}>
                      ({slot.candidates.length}/{slot.max_places})
                    </span>
                  </h3>
                  {slot.candidates.length === 0 ? (
                    <p className={styles.meta}>Aucun candidat</p>
                  ) : (
                    <ul>
                      {slot.candidates.map((c) => (
                        <li key={c.id}>
                          {c.prenom} {c.nom}{' '}
                          <span className={styles.meta}>({LABEL[c.statut] || c.statut})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {tab === 'settings' && settings && (
        <form className={`card form ${styles.settingsCard}`} onSubmit={saveSettings}>
          <div className={styles.settingsNav}>
            <button
              type="button"
              className={`${styles.settingsTab} ${settingsPane === 'general' ? styles.settingsTabActive : ''}`}
              onClick={() => setSettingsPane('general')}
            >
              Général
            </button>
            <button
              type="button"
              className={`${styles.settingsTab} ${settingsPane === 'emails' ? styles.settingsTabActive : ''}`}
              onClick={() => setSettingsPane('emails')}
            >
              Emails
            </button>
          </div>

          {settingsPane === 'general' && (
            <>
              <h3>Ouverture des candidatures</h3>
              <label className={styles.switch} style={{ marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  checked={!!settings.candidature_ouverte}
                  onChange={(e) =>
                    setSettings({ ...settings, candidature_ouverte: e.target.checked })
                  }
                />
                <span>
                  {settings.candidature_ouverte
                    ? 'Page candidature ouverte sur le site'
                    : 'Page candidature fermée (masquée)'}
                </span>
              </label>

              <h3>Paiement & entretien</h3>
              <div className="form-row two">
                <div className="form-group">
                  <label>Montant</label>
                  <input
                    value={settings.montant_paiement}
                    onChange={(e) =>
                      setSettings({ ...settings, montant_paiement: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Délai</label>
                  <input
                    value={settings.delai_paiement}
                    onChange={(e) =>
                      setSettings({ ...settings, delai_paiement: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row two">
                <div className="form-group">
                  <label>Trésorier</label>
                  <input
                    value={settings.tresorier_nom}
                    onChange={(e) =>
                      setSettings({ ...settings, tresorier_nom: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Contact trésorier</label>
                  <input
                    value={settings.tresorier_contact}
                    onChange={(e) =>
                      setSettings({ ...settings, tresorier_contact: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Lieu par défaut</label>
                <input
                  value={settings.lieu_defaut}
                  onChange={(e) => setSettings({ ...settings, lieu_defaut: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Infos paiement</label>
                <textarea
                  rows={3}
                  value={settings.infos_paiement || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, infos_paiement: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Infos entretien</label>
                <textarea
                  rows={3}
                  value={settings.infos_entretien || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, infos_entretien: e.target.value })
                  }
                />
              </div>

              <h3>Liens communautaires (mail paiement confirmé)</h3>
              <div className="form-group">
                <label>Lien invitation Messenger</label>
                <input
                  type="url"
                  placeholder="https://m.me/j/…"
                  value={settings.lien_messenger || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, lien_messenger: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Lien Facebook (page / groupe)</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/…"
                  value={settings.lien_facebook || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, lien_facebook: e.target.value })
                  }
                />
              </div>

              <div className={styles.sheetsHint}>
                <strong>Google Sheet</strong>
                <p className={styles.meta}>
                  À chaque confirmation de paiement, les infos essentielles du candidat sont
                  ajoutées automatiquement au spreadsheet (si{' '}
                  <code>GOOGLE_SHEETS_*</code> est configuré dans le <code>.env</code> backend).
                </p>
                {settings.google_sheets_url ? (
                  <a
                    href={settings.google_sheets_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.75rem' }}
                  >
                    Voir Google Sheet
                  </a>
                ) : (
                  <p className={styles.meta}>
                    Configurez <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> (ou{' '}
                    <code>GOOGLE_SHEETS_URL</code>) dans le <code>.env</code> pour activer le
                    bouton.
                  </p>
                )}
              </div>
            </>
          )}

          {settingsPane === 'emails' && (
            <>
              <p className={styles.meta} style={{ marginTop: 0 }}>
                Éditez les textes, cliquez un jeton pour l’insérer, et vérifiez l’aperçu à droite.
                Les valeurs montant / délai / trésorier viennent de l’onglet Général.
              </p>

              <MailTemplateEditor
                title="1 — Confirmation + lien calendrier"
                description="Envoyé après candidature, ou via le bouton Mail sur un candidat."
                placeholders={MAIL_CONFIRM_PLACEHOLDERS}
                sampleVars={mailSampleVars}
                subject={settings.mail_confirmation_sujet || ''}
                body={settings.mail_confirmation_corps || ''}
                onSubjectChange={(v) =>
                  setSettings({ ...settings, mail_confirmation_sujet: v })
                }
                onBodyChange={(v) =>
                  setSettings({ ...settings, mail_confirmation_corps: v })
                }
              />

              <MailTemplateEditor
                title="2 — Réussite entretien + paiement"
                description="Envoyé depuis l’onglet Présents (mail de réussite)."
                placeholders={MAIL_SUCCESS_PLACEHOLDERS}
                sampleVars={mailSampleVars}
                subject={settings.mail_reussite_sujet || ''}
                body={settings.mail_reussite_corps || ''}
                onSubjectChange={(v) => setSettings({ ...settings, mail_reussite_sujet: v })}
                onBodyChange={(v) => setSettings({ ...settings, mail_reussite_corps: v })}
              />

              <MailTemplateEditor
                title="3 — Paiement confirmé + accès membre"
                description="Envoyé au clic « Valider paiement ». Utilise les liens de l’onglet Général."
                placeholders={MAIL_PAYMENT_PLACEHOLDERS}
                sampleVars={mailSampleVars}
                subject={settings.mail_paiement_sujet || ''}
                body={settings.mail_paiement_corps || ''}
                onSubjectChange={(v) => setSettings({ ...settings, mail_paiement_sujet: v })}
                onBodyChange={(v) => setSettings({ ...settings, mail_paiement_corps: v })}
              />
            </>
          )}

          <div className={styles.settingsActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      )}

      {detail && (
        <div className={styles.overlay} onClick={() => setDetail(null)} role="presentation">
          <div className={styles.detail} onClick={(e) => e.stopPropagation()} role="dialog">
            <button type="button" className={styles.close} onClick={() => setDetail(null)}>
              ×
            </button>
            <h2>
              {detail.prenom} {detail.nom}
            </h2>
            <p className={styles.meta}>
              {detail.email} · {detail.telephone}
            </p>
            {detail.photo_path && (
              <img
                src={assetUrl(detail.photo_path)}
                alt=""
                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%', marginBottom: '0.75rem' }}
              />
            )}
            <p>
              <strong>Facebook :</strong>{' '}
              {detail.facebook_link ? (
                <a href={detail.facebook_link} target="_blank" rel="noreferrer">
                  {detail.facebook_link}
                </a>
              ) : (
                '—'
              )}
              <br />
              <strong>Field of study :</strong> {detail.filiere || '—'}
              <br />
              <strong>Level of study :</strong> {detail.annee || '—'}
              <br />
              <strong>Address :</strong> {detail.adresse || '—'}
              <br />
              <strong>Area of interest :</strong> {detail.domaine_interet || '—'}
            </p>
            <h3>Why join ENISo Team?</h3>
            <p>{detail.motivation}</p>
            <h3>Motivation about robotics</h3>
            <p>{detail.motivation_robotics || '—'}</p>
            <h3>Something unique</h3>
            <p>{detail.unique_about || '—'}</p>
            {detail.piece_jointe_path && (
              <p>
                <a href={assetUrl(detail.piece_jointe_path)} target="_blank" rel="noreferrer">
                  Voir la pièce jointe
                </a>
              </p>
            )}
            <h3>Historique</h3>
            <ul className={styles.history}>
              {(detail.history || []).map((h) => (
                <li key={h.id}>
                  {LABEL[h.new_statut] || h.new_statut} — {formatDate(h.created_at)}
                  {h.note ? ` (${h.note})` : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
