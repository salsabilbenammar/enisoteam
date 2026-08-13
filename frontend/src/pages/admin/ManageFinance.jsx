import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import styles from './ManageFinance.module.css';

const STATUS_LABEL = {
  paye: 'Payé',
  en_attente: 'En attente',
  en_retard: 'En retard',
};

const METHOD_LABEL = {
  especes: 'Espèces',
  cheque: 'Chèque',
  virement: 'Virement',
  carte: 'Carte',
};

const emptyPayment = {
  member_id: '',
  montant: '',
  date_paiement: new Date().toISOString().slice(0, 10),
  methode: 'especes',
  annee_cotisation: String(new Date().getFullYear()),
  cotisation_type: 'recrutement',
  detail_ref_id: '',
  detail_option: '',
  note: '',
};

const PULL_OPTIONS = {
  tshirt: 'T-shirt',
  capuche: 'Capuche',
};

const NEEDS_REF = ['formation', 'evenement', 'pull', 'deplacement', 'robot'];
const OFFER_MANAGED = ['pull', 'deplacement', 'robot'];

function money(n, devise = 'DT') {
  const v = Number(n) || 0;
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise}`;
}

export default function ManageFinance() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('cotisations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState(null);
  const [members, setMembers] = useState([]);
  const [cotTypes, setCotTypes] = useState([]);

  // Cotisations
  const [cotisations, setCotisations] = useState([]);
  const [cotMeta, setCotMeta] = useState({ counts: {}, annee: new Date().getFullYear(), devise: 'DT' });
  const [cotSearch, setCotSearch] = useState('');
  const [cotStatut, setCotStatut] = useState('');
  const [cotAnnee, setCotAnnee] = useState(String(new Date().getFullYear()));
  const [cotType, setCotType] = useState('recrutement');
  const [cotPage, setCotPage] = useState(1);
  const [cotPages, setCotPages] = useState(1);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [formOptions, setFormOptions] = useState([]);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [offerDraft, setOfferDraft] = useState({
    titre: '',
    description: '',
    external_url: '',
    ouvert: true,
  });
  const [offers, setOffers] = useState([]);
  const [pullForms, setPullForms] = useState([]);
  const [pullUrls, setPullUrls] = useState({ tshirt: '', capuche: '' });
  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingPaid, setExportingPaid] = useState(false);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const loadSettings = useCallback(async () => {
    const { data } = await api.get('/finance/settings');
    setSettings(data);
    const types = data.types || [];
    setCotTypes(types.filter((t) => t.actif !== false));
    const first = types.find((t) => t.code === 'recrutement') || types[0];
    setPaymentForm((f) => ({
      ...f,
      annee_cotisation: String(data.cotisation_annee),
      cotisation_type: first?.code || 'recrutement',
      detail_ref_id: '',
      detail_option: '',
      montant: String(first?.montant_defaut ?? data.cotisation_montant ?? ''),
    }));
    setCotAnnee(String(data.cotisation_annee));
    if (first?.code) setCotType(first.code);
  }, []);

  const loadMembers = useCallback(async () => {
    const { data } = await api.get('/finance/members');
    setMembers(data || []);
  }, []);

  const loadCotisations = useCallback(async () => {
    const { data } = await api.get('/finance/cotisations', {
      params: {
        annee: cotAnnee,
        type: cotType,
        statut: cotStatut || undefined,
        search: cotSearch || undefined,
        page: cotPage,
        limit: 15,
      },
    });
    setCotisations(data.items || []);
    setCotMeta(data);
    setCotPages(data.pages || 1);
    if (data.types?.length) {
      setCotTypes(data.types);
    }
  }, [cotAnnee, cotType, cotStatut, cotSearch, cotPage]);

  const loadPullForms = useCallback(async () => {
    const { data } = await api.get('/finance/pull-forms');
    const rows = data || [];
    setPullForms(rows);
    const urls = {};
    for (const f of rows) {
      if (f.detail_option) urls[f.detail_option] = f.external_url || '';
    }
    setPullUrls((prev) => ({ ...prev, ...urls }));
    return rows;
  }, []);

  const loadOffers = useCallback(async (type) => {
    if (!OFFER_MANAGED.includes(type)) {
      setOffers([]);
      return [];
    }
    const { data } = await api.get('/finance/offers', { params: { type } });
    const rows = data || [];
    setOffers(rows);
    return rows;
  }, []);

  const loadFormOptions = useCallback(async (type) => {
    if (!type || type === 'recrutement') {
      setFormOptions([]);
      return [];
    }
    const { data } = await api.get('/finance/form-options', { params: { type } });
    const opts = data.options || [];
    setFormOptions(opts);
    await loadOffers(type);
    return opts;
  }, [loadOffers]);

  const loadEligible = useCallback(async (type, refId) => {
    if (type === 'recrutement') {
      const { data } = await api.get('/finance/eligible-members', {
        params: { type: 'recrutement' },
      });
      setEligibleMembers(data || []);
      return data || [];
    }
    if (!type || !refId || !NEEDS_REF.includes(type)) {
      setEligibleMembers([]);
      return [];
    }
    const { data } = await api.get('/finance/eligible-members', {
      params: { type, ref_id: refId },
    });
    setEligibleMembers(data || []);
    return data || [];
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadMembers(), loadPullForms()])
      .then(async () => {
        try {
          await loadEligible('recrutement');
        } catch {
          /* ignore */
        }
      })
      .catch((err) => setError(err.response?.data?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, [loadSettings, loadMembers, loadEligible, loadPullForms]);

  useEffect(() => {
    if (loading) return;
    if (tab === 'cotisations') {
      loadCotisations().catch((err) => setError(err.response?.data?.message || 'Erreur cotisations.'));
    }
  }, [tab, loading, loadCotisations]);

  const devise = settings?.devise || 'DT';
  const selectedOffer = useMemo(
    () => formOptions.find((o) => String(o.id) === String(paymentForm.detail_ref_id)),
    [formOptions, paymentForm.detail_ref_id]
  );

  const setPullFormOpen = async (variant, open) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/finance/pull-forms/${variant}`, {
        external_url: pullUrls[variant] || '',
        ouvert: open,
      });
      flash(data.message || (open ? 'Formulaire ouvert.' : 'Formulaire fermé.'));
      await loadPullForms();
      if (paymentForm.cotisation_type === 'pull') {
        await loadFormOptions('pull');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action impossible.');
    } finally {
      setSaving(false);
    }
  };

  const savePullFormUrl = async (variant) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/finance/pull-forms/${variant}`, {
        external_url: pullUrls[variant] || '',
      });
      flash(data.message || 'URL enregistrée.');
      await loadPullForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const renderPullFormsPanel = () => (
    <div className={`card ${styles.pullFormsPanel}`}>
      <h3>Formulaires Pull ENISO Team</h3>
      <p className={styles.meta} style={{ marginTop: 0 }}>
        Ouvrez ou fermez les liens affichés dans le menu membre (site officiel).
      </p>
      <div className={styles.pullFormsGrid}>
        {pullForms.map((f) => (
          <article key={f.detail_option} className={styles.pullFormCard}>
            <header className={styles.pullFormHead}>
              <strong>{f.titre}</strong>
              <span className={`${styles.badge} ${f.ouvert ? styles.badgeOk : ''}`}>
                {f.ouvert ? 'Ouvert' : 'Fermé'}
              </span>
            </header>
            <div className="form-group">
              <label>URL du formulaire</label>
              <input
                type="url"
                value={pullUrls[f.detail_option] || ''}
                placeholder="https://…"
                onChange={(e) =>
                  setPullUrls((prev) => ({ ...prev, [f.detail_option]: e.target.value }))
                }
              />
            </div>
            <div className={styles.pullFormActions}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving || f.ouvert || !(pullUrls[f.detail_option] || '').trim()}
                onClick={() => setPullFormOpen(f.detail_option, true)}
              >
                Ouvrir
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving || !f.ouvert}
                onClick={() => setPullFormOpen(f.detail_option, false)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving}
                onClick={() => savePullFormUrl(f.detail_option)}
              >
                Enregistrer l’URL
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/finance/settings', settings);
      setSettings(data);
      setCotTypes((data.types || []).filter((t) => t.actif !== false));
      flash('Paramètres enregistrés.');
      await loadCotisations();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const selectPaymentType = async (code) => {
    const t = cotTypes.find((x) => x.code === code);
    setPaymentForm((f) => ({
      ...f,
      cotisation_type: code,
      detail_ref_id: '',
      detail_option: code === 'pull' ? 'tshirt' : '',
      member_id: '',
      montant:
        t && Number(t.montant_defaut) > 0
          ? String(t.montant_defaut)
          : f.montant,
    }));
    setEligibleMembers([]);
    try {
      await loadFormOptions(code);
      if (code === 'recrutement') await loadEligible('recrutement');
    } catch (err) {
      setError(err.response?.data?.message || 'Options indisponibles.');
    }
  };

  const selectPaymentRef = async (refId) => {
    setPaymentForm((f) => ({ ...f, detail_ref_id: refId, member_id: '' }));
    try {
      await loadEligible(paymentForm.cotisation_type, refId);
    } catch (err) {
      setError(err.response?.data?.message || 'Membres éligibles indisponibles.');
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/finance/payments', {
        ...paymentForm,
        member_id: Number(paymentForm.member_id),
        montant: Number(paymentForm.montant),
        annee_cotisation: Number(paymentForm.annee_cotisation),
        cotisation_type: paymentForm.cotisation_type,
        detail_ref_id: paymentForm.detail_ref_id
          ? Number(paymentForm.detail_ref_id)
          : undefined,
        detail_option: paymentForm.detail_option || undefined,
      });
      flash(data.message || 'Paiement enregistré.');
      const t = cotTypes.find((x) => x.code === paymentForm.cotisation_type);
      setPaymentForm({
        ...emptyPayment,
        annee_cotisation: String(settings?.cotisation_annee || new Date().getFullYear()),
        cotisation_type: paymentForm.cotisation_type,
        detail_option: paymentForm.cotisation_type === 'pull' ? 'tshirt' : '',
        montant: String(t?.montant_defaut || ''),
      });
      setEligibleMembers([]);
      if (paymentForm.cotisation_type === 'recrutement') {
        await loadEligible('recrutement');
      } else if (NEEDS_REF.includes(paymentForm.cotisation_type)) {
        await loadFormOptions(paymentForm.cotisation_type);
      }
      await loadCotisations();
    } catch (err) {
      setError(err.response?.data?.message || 'Paiement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (memberId) => {
    try {
      const { data } = await api.get(`/finance/payments/member/${memberId}`, {
        params: { annee: cotAnnee, type: cotType },
      });
      setHistory(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Historique indisponible.');
    }
  };

  const deletePayment = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce paiement ?',
      message: 'Cette action est définitive.',
    });
    if (!ok) return;
    try {
      await api.delete(`/finance/payments/${id}`);
      flash('Paiement supprimé.');
      if (history) await openHistory(history.member.id);
      await loadCotisations();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const exportPaidList = async () => {
    setExportingPaid(true);
    setError('');
    try {
      const { data } = await api.get('/finance/cotisations', {
        params: {
          annee: cotAnnee,
          type: cotType,
          statut: 'paye',
          page: 1,
          limit: 100000,
        },
      });
      const items = data.items || [];
      if (!items.length) {
        setError('Aucun membre payé pour ce type et cette année.');
        return;
      }

      const typeLabel =
        data.cotisation_label ||
        cotTypes.find((t) => t.code === cotType)?.label ||
        cotType;

      const total = items.reduce((sum, c) => sum + Number(c.paid_total || 0), 0);
      const generatedAt = new Date().toLocaleString('fr-FR');

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(18);
      doc.text('ENISO Team — Cotisations payées', 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Type : ${typeLabel}`, 14, 28);
      doc.text(`Année : ${cotAnnee}`, 14, 34);
      doc.text(`Membres payés : ${items.length}`, 14, 40);
      doc.text(`Total encaissé : ${money(total, devise)}`, 14, 46);
      doc.text(`Généré le ${generatedAt}`, 14, 52);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 58,
        head: [['Nom', 'Type de cotisation', 'Année', `Montant (${devise})`]],
        body: items.map((c) => [
          c.nom,
          c.cotisation_label || typeLabel,
          String(c.annee || cotAnnee),
          money(c.paid_total, devise),
        ]),
        foot: [['', '', 'Total', money(total, devise)]],
        styles: { fontSize: 10, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 76, 129], textColor: 255 },
        footStyles: { fillColor: [240, 244, 248], textColor: [20, 20, 20], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });

      doc.save(`cotisations-payes-${cotType}-${cotAnnee}.pdf`);
      flash(`PDF généré (${items.length} membre(s)).`);
    } catch (err) {
      setError(err.response?.data?.message || 'Export PDF impossible.');
    } finally {
      setExportingPaid(false);
    }
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  if (loading) return <Loader />;

  return (
    <div className={styles.page}>
      <header className="page-header">
        <h1>Finance / Trésorerie</h1>
        <p>Suivi des cotisations membres et paramètres.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.tabs}>
        {[
          ['cotisations', 'Cotisations'],
          ['settings', 'Paramètres'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'cotisations' && (
        <section className={styles.section}>
          {renderPullFormsPanel()}
          <div className={styles.statRow}>
            <div className={styles.statCard}>
              <span>Payés</span>
              <strong>{cotMeta.counts?.paye || 0}</strong>
            </div>
            <div className={styles.statCard}>
              <span>En attente</span>
              <strong>{cotMeta.counts?.en_attente || 0}</strong>
            </div>
            <div className={styles.statCard}>
              <span>En retard</span>
              <strong className={styles.danger}>{cotMeta.counts?.en_retard || 0}</strong>
            </div>
            <div className={styles.statCard}>
              <span>Type</span>
              <strong style={{ fontSize: '1.05rem' }}>
                {cotMeta.cotisation_label || '—'}
              </strong>
            </div>
            <div className={styles.statCard}>
              <span>Montant dû</span>
              <strong>{money(cotMeta.due_amount, devise)}</strong>
            </div>
          </div>

          <div className={styles.split}>
            <div className={styles.panelStack}>
            <form className={`card form ${styles.panel}`} onSubmit={submitPayment}>
              <h3>Enregistrer un paiement</h3>
              <div className="form-group">
                <label>Type de cotisation</label>
                <select
                  required
                  value={paymentForm.cotisation_type}
                  onChange={(e) => selectPaymentType(e.target.value)}
                >
                  {cotTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {NEEDS_REF.includes(paymentForm.cotisation_type) ? (
                <div className="form-group">
                  <label>
                    {paymentForm.cotisation_type === 'formation'
                      ? 'Formation (inscrits uniquement)'
                      : paymentForm.cotisation_type === 'evenement'
                        ? 'Événement (inscrits uniquement)'
                        : 'Formulaire / offre'}
                  </label>
                  <select
                    required
                    value={paymentForm.detail_ref_id}
                    onChange={(e) => selectPaymentRef(e.target.value)}
                  >
                    <option value="">Choisir…</option>
                    {formOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.titre}
                        {o.inscriptions_count != null
                          ? ` (${o.inscriptions_count} inscrits)`
                          : o.interests_count != null
                            ? ` (${o.interests_count} réponses)`
                            : ''}
                      </option>
                    ))}
                  </select>
                  {!formOptions.length ? (
                    <small className={styles.meta}>
                      {OFFER_MANAGED.includes(paymentForm.cotisation_type)
                        ? 'Créez un formulaire externe ci-dessous (lien site officiel).'
                        : 'Aucune option disponible.'}
                    </small>
                  ) : null}
                </div>
              ) : null}
              {paymentForm.cotisation_type === 'pull' ? (
                <div className="form-group">
                  <label>Type de pull</label>
                  <select
                    required
                    value={paymentForm.detail_option || 'tshirt'}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, detail_option: e.target.value })
                    }
                  >
                    <option value="tshirt">T-shirt</option>
                    <option value="capuche">Capuche</option>
                  </select>
                </div>
              ) : null}
              <div className="form-group">
                <label>
                  {selectedOffer?.external_url || OFFER_MANAGED.includes(paymentForm.cotisation_type)
                    ? 'Membre'
                    : 'Membre (ayant rempli le formulaire)'}
                </label>
                <select
                  required
                  value={paymentForm.member_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, member_id: e.target.value })}
                  disabled={
                    NEEDS_REF.includes(paymentForm.cotisation_type) &&
                    !paymentForm.detail_ref_id
                  }
                >
                  <option value="">
                    {eligibleMembers.length
                      ? 'Choisir…'
                      : 'Aucun membre éligible pour cette sélection'}
                  </option>
                  {eligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom} — {m.email}
                      {m.detail_option ? ` (${PULL_OPTIONS[m.detail_option] || m.detail_option})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row two">
                <div className="form-group">
                  <label>Montant ({devise})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={paymentForm.montant}
                    onChange={(e) => setPaymentForm({ ...paymentForm, montant: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date_paiement}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, date_paiement: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row two">
                <div className="form-group">
                  <label>Méthode</label>
                  <select
                    value={paymentForm.methode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, methode: e.target.value })}
                  >
                    {Object.entries(METHOD_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Année cotisation</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.annee_cotisation}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, annee_cotisation: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Note</label>
                <input
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '…' : 'Enregistrer le paiement'}
              </button>
            </form>

            {OFFER_MANAGED.includes(paymentForm.cotisation_type) ? (
              <>
                <form
                  className={`card form ${styles.panel}`}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    setError('');
                    try {
                      await api.post('/finance/offers', {
                        cotisation_type: paymentForm.cotisation_type,
                        titre: offerDraft.titre,
                        description: offerDraft.description,
                        external_url: offerDraft.external_url,
                        ouvert: true,
                      });
                      flash('Formulaire ouvert — lien visible dans le menu membre.');
                      setOfferDraft({
                        titre: '',
                        description: '',
                        external_url: '',
                        ouvert: true,
                      });
                      await loadFormOptions(paymentForm.cotisation_type);
                    } catch (err) {
                      setError(err.response?.data?.message || 'Création impossible.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <h3>Ouvrir un formulaire (site officiel)</h3>
                  <p className={styles.meta} style={{ marginTop: 0 }}>
                    Les membres connectés verront un lien dans la barre de navigation. Fermez-le
                    quand les inscriptions sont terminées.
                  </p>
                  <div className="form-group">
                    <label>Titre (menu membre)</label>
                    <input
                      required
                      value={offerDraft.titre}
                      onChange={(e) => setOfferDraft({ ...offerDraft, titre: e.target.value })}
                      placeholder={
                        paymentForm.cotisation_type === 'pull'
                          ? 'Ex. Pull club 2026'
                          : paymentForm.cotisation_type === 'deplacement'
                            ? 'Ex. Déplacement Eurobot'
                            : 'Ex. Cotisation robot 2026'
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>URL du formulaire (site officiel)</label>
                    <input
                      type="url"
                      required
                      value={offerDraft.external_url}
                      onChange={(e) =>
                        setOfferDraft({ ...offerDraft, external_url: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (optionnel)</label>
                    <textarea
                      rows={2}
                      value={offerDraft.description}
                      onChange={(e) =>
                        setOfferDraft({ ...offerDraft, description: e.target.value })
                      }
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary" disabled={saving}>
                    Ouvrir le formulaire
                  </button>
                </form>

                {offers.length > 0 && (
                  <div className={`card ${styles.panel}`}>
                    <h3>Formulaires {paymentForm.cotisation_type}</h3>
                    <ul className={styles.offerList}>
                      {offers.map((o) => (
                        <li key={o.id} className={styles.offerRow}>
                          <div>
                            <strong>{o.titre}</strong>
                            {o.external_url ? (
                              <a
                                href={o.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.offerLink}
                              >
                                {o.external_url}
                              </a>
                            ) : (
                              <span className={styles.meta}>URL manquante</span>
                            )}
                          </div>
                          <div className={styles.offerActions}>
                            <label className={styles.toggleLabel}>
                              <input
                                type="checkbox"
                                checked={!!o.ouvert}
                                disabled={saving}
                                onChange={async (e) => {
                                  setSaving(true);
                                  setError('');
                                  try {
                                    await api.put(`/finance/offers/${o.id}`, {
                                      ouvert: e.target.checked,
                                    });
                                    flash(e.target.checked ? 'Formulaire ouvert.' : 'Formulaire fermé.');
                                    await loadOffers(paymentForm.cotisation_type);
                                  } catch (err) {
                                    setError(
                                      err.response?.data?.message || 'Mise à jour impossible.'
                                    );
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                              />
                              {o.ouvert ? 'Ouvert' : 'Fermé'}
                            </label>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={saving}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Supprimer ce formulaire ?',
                                  message: 'Le lien disparaîtra du menu membre.',
                                  tone: 'danger',
                                });
                                if (!ok) return;
                                setSaving(true);
                                try {
                                  await api.delete(`/finance/offers/${o.id}`);
                                  flash('Formulaire supprimé.');
                                  await loadFormOptions(paymentForm.cotisation_type);
                                } catch (err) {
                                  setError(err.response?.data?.message || 'Suppression impossible.');
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Supprimer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
            </div>

            <div className={styles.panelGrow}>
              <div className={styles.filters}>
                <select
                  value={cotType}
                  onChange={(e) => {
                    setCotPage(1);
                    setCotType(e.target.value);
                  }}
                >
                  {cotTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Rechercher membre…"
                  value={cotSearch}
                  onChange={(e) => {
                    setCotPage(1);
                    setCotSearch(e.target.value);
                  }}
                />
                <select
                  value={cotStatut}
                  onChange={(e) => {
                    setCotPage(1);
                    setCotStatut(e.target.value);
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="paye">Payé</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_retard">En retard</option>
                </select>
                <select
                  value={cotAnnee}
                  onChange={(e) => {
                    setCotPage(1);
                    setCotAnnee(e.target.value);
                  }}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm ${styles.exportBtn}`}
                  onClick={exportPaidList}
                  disabled={exportingPaid}
                  title="Télécharger la liste des membres payés en PDF"
                >
                  {exportingPaid ? 'PDF…' : 'PDF des payés'}
                </button>
              </div>

              <div className={`card ${styles.tableWrap}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Payé</th>
                      <th>Reste</th>
                      <th>Statut</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {cotisations.map((c) => (
                      <tr key={c.member_id}>
                        <td>
                          <strong>{c.nom}</strong>
                          <div className={styles.meta}>{c.email}</div>
                        </td>
                        <td>{money(c.paid_total, devise)}</td>
                        <td>{money(c.remaining, devise)}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[`st_${c.statut}`]}`}>
                            {STATUS_LABEL[c.statut]}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openHistory(c.member_id)}
                          >
                            Historique
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!cotisations.length && <p className={styles.empty}>Aucun membre trouvé.</p>}
              </div>
              {cotPages > 1 && (
                <div className={styles.pager}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={cotPage <= 1}
                    onClick={() => setCotPage((p) => p - 1)}
                  >
                    ←
                  </button>
                  <span>
                    {cotPage} / {cotPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={cotPage >= cotPages}
                    onClick={() => setCotPage((p) => p + 1)}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'settings' && settings && (
        <>
          {renderPullFormsPanel()}
          <form className={`card form ${styles.settingsCard}`} onSubmit={saveSettings}>
          <h3>Types de cotisation</h3>
          <p className={styles.meta} style={{ marginTop: 0 }}>
            Définissez le montant attendu pour chaque type (0 = suivi libre sans montant fixe).
          </p>
          <div className={styles.typeTable}>
            {(settings.types || []).map((t, idx) => (
              <div key={t.code} className={styles.typeRow}>
                <strong>{t.label}</strong>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={t.montant_defaut}
                  onChange={(e) => {
                    const types = [...settings.types];
                    types[idx] = { ...types[idx], montant_defaut: e.target.value };
                    setSettings({ ...settings, types });
                  }}
                />
                <label className={styles.switchInline}>
                  <input
                    type="checkbox"
                    checked={!!t.actif}
                    onChange={(e) => {
                      const types = [...settings.types];
                      types[idx] = { ...types[idx], actif: e.target.checked };
                      setSettings({ ...settings, types });
                    }}
                  />
                  Actif
                </label>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '1.5rem' }}>Référence générale</h3>
          <div className="form-row two">
            <div className="form-group">
              <label>Année de référence</label>
              <input
                type="number"
                value={settings.cotisation_annee}
                onChange={(e) =>
                  setSettings({ ...settings, cotisation_annee: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Date d’échéance</label>
              <input
                type="date"
                value={String(settings.date_echeance || '').slice(0, 10)}
                onChange={(e) =>
                  setSettings({ ...settings, date_echeance: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label>Devise</label>
            <input
              value={settings.devise}
              onChange={(e) => setSettings({ ...settings, devise: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Enregistrer
          </button>
        </form>
        </>
      )}

      {history && (
        <div className={styles.overlay} onClick={() => setHistory(null)} role="presentation">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog">
            <button type="button" className={styles.close} onClick={() => setHistory(null)}>
              ×
            </button>
            <h2>
              Historique — {history.member.nom}
            </h2>
            <p className={styles.meta}>{history.member.email}</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Détail</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Année</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(history.payments || []).map((p) => (
                  <tr key={p.id}>
                    <td>{String(p.date_paiement).slice(0, 10)}</td>
                    <td>
                      {history.typeLabels?.[p.cotisation_type] ||
                        p.cotisation_type ||
                        '—'}
                    </td>
                    <td>
                      {p.detail_nom
                        ? p.detail_nom
                        : PULL_OPTIONS[p.detail_option] || p.detail_option || '—'}
                    </td>
                    <td>{money(p.montant, devise)}</td>
                    <td>{METHOD_LABEL[p.methode] || p.methode}</td>
                    <td>{p.annee_cotisation}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => deletePayment(p.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!history.payments?.length && <p className={styles.empty}>Aucun paiement.</p>}
          </div>
        </div>
      )}

    </div>
  );
}
