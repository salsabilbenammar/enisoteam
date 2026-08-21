import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import MailTemplateEditor from '../../components/admin/MailTemplateEditor';
import { localToday } from '../../utils/dateLimits';
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

const DEFAULT_MAIL_SUJET = 'Confirmation de paiement — [Type] [Annee]';
const DEFAULT_MAIL_CORPS = `Bonjour [Nom],

Nous confirmons la réception de votre paiement enregistré par le trésorier ENISO Team.

Type de cotisation : [Type]
Année : [Annee]
Montant : [Montant]
Date du paiement : [DatePaiement]
Méthode : [Methode]
Détail : [Detail]
Note : [Note]

Conservez cet email comme justificatif. Pour toute question, contactez le trésorier du club.

— ENISO Team`;

const MAIL_PLACEHOLDERS = [
  { key: 'Nom', hint: 'Nom du membre' },
  { key: 'Type', hint: 'Type de cotisation' },
  { key: 'Annee', hint: 'Année' },
  { key: 'Montant', hint: 'Montant payé' },
  { key: 'Devise', hint: 'Devise' },
  { key: 'DatePaiement', hint: 'Date du paiement' },
  { key: 'Methode', hint: 'Méthode' },
  { key: 'Detail', hint: 'Référence / détail' },
  { key: 'Note', hint: 'Note trésorerie' },
];

const emptyPayment = {
  member_id: '',
  montant: '',
  date_paiement: localToday(),
  methode: 'especes',
  annee_cotisation: String(new Date().getFullYear()),
  cotisation_type: 'recrutement',
  detail_ref_id: '',
  detail_option: '',
  note: '',
};

const PULL_OPTIONS = {
  tshirt: 'T-shirt',
  capuche: 'Hoodie',
};

const MERCH_STATUS = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  livree: 'Livrée',
  annulee: 'Annulée',
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
  const [memberQuery, setMemberQuery] = useState('');
  const [offers, setOffers] = useState([]);
  const [pullForms, setPullForms] = useState([]);
  const [merchDrafts, setMerchDrafts] = useState({});
  const [merchOrders, setMerchOrders] = useState([]);
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
      montant: '',
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
    setMerchDrafts(
      Object.fromEntries(
        rows.map((row) => [
          row.detail_option,
          { prix_total: String(row.prix_total ?? 40), photo: null, photo_back: null },
        ])
      )
    );
    return rows;
  }, []);

  const loadMerchOrders = useCallback(async () => {
    const { data } = await api.get('/finance/merchandise-orders');
    setMerchOrders(data || []);
    return data || [];
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
    Promise.all([loadSettings(), loadMembers(), loadPullForms(), loadMerchOrders()])
      .catch((err) => setError(err.response?.data?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, [loadSettings, loadMembers, loadPullForms, loadMerchOrders]);

  useEffect(() => {
    if (loading) return;
    if (tab === 'cotisations') {
      loadCotisations().catch((err) => setError(err.response?.data?.message || 'Erreur cotisations.'));
    }
    if (tab === 'boutique') {
      Promise.all([loadPullForms(), loadMerchOrders()]).catch((err) =>
        setError(err.response?.data?.message || 'Erreur boutique.')
      );
    }
  }, [tab, loading, loadCotisations, loadPullForms, loadMerchOrders]);

  const devise = settings?.devise || 'DT';

  // Pour recrutement / formation / pull / etc. : uniquement les inscrits au formulaire
  // (jamais la liste complète des membres).
  const membersForPayment = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const type = paymentForm.cotisation_type;
    const restrictToForm =
      type === 'recrutement' || NEEDS_REF.includes(type);
    const list = restrictToForm ? eligibleMembers : members || [];
    if (!q) return list;
    return list.filter(
      (m) =>
        String(m.nom || '')
          .toLowerCase()
          .includes(q) ||
        String(m.email || '')
          .toLowerCase()
          .includes(q)
    );
  }, [members, eligibleMembers, memberQuery, paymentForm.cotisation_type]);

  const usingEligible =
    paymentForm.cotisation_type === 'recrutement' ||
    NEEDS_REF.includes(paymentForm.cotisation_type);

  // Aligner le formulaire paiement sur les filtres type / année de la liste
  useEffect(() => {
    let cancelled = false;
    setPaymentForm((f) => ({
      ...f,
      cotisation_type: cotType || f.cotisation_type,
      annee_cotisation: cotAnnee || f.annee_cotisation,
      detail_option: (cotType || f.cotisation_type) === 'pull' ? f.detail_option || 'tshirt' : '',
      member_id: '',
      detail_ref_id: '',
    }));
    setMemberQuery('');
    setEligibleMembers([]);
    (async () => {
      if (!cotType || cotType === 'recrutement') {
        setFormOptions([]);
        if (cotType === 'recrutement') {
          try {
            await loadEligible('recrutement');
          } catch {
            if (!cancelled) setEligibleMembers([]);
          }
        }
        return;
      }
      try {
        const opts = await loadFormOptions(cotType);
        if (cancelled) return;
        if (cotType === 'pull') {
          const variant = 'tshirt';
          const offer = opts.find((o) => o.detail_option === variant);
          const price = Number(offer?.prix_total ?? 40);
          setPaymentForm((f) => ({
            ...f,
            detail_option: variant,
            detail_ref_id: offer?.id ? String(offer.id) : '',
            detail_nom: offer?.titre || '',
            montant: Number.isFinite(price) && price > 0 ? String(price) : '',
          }));
          if (offer?.id) await loadEligible('pull', offer.id);
        }
      } catch {
        if (!cancelled) setEligibleMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on type/year filters
  }, [cotType, cotAnnee]);

  const setPullFormOpen = async (variant, open) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/finance/pull-forms/${variant}`, {
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

  const updateMerchStatus = async (id, statut) => {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/finance/merchandise-orders/${id}/status`, { statut });
      await loadMerchOrders();
      flash('Statut de la commande mis à jour.');
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  const saveMerchCatalog = async (variant) => {
    const draft = merchDrafts[variant];
    if (!draft) return;
    const formData = new FormData();
    formData.append('prix_total', draft.prix_total);
    if (draft.photo) formData.append('photo', draft.photo);
    if (draft.photo_back) formData.append('photo_back', draft.photo_back);
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/finance/pull-forms/${variant}`, formData);
      flash(data.message || 'Produit mis à jour.');
      await loadPullForms();
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    } finally {
      setSaving(false);
    }
  };

  const renderPullFormsPanel = () => (
    <div className={`card ${styles.pullFormsPanel}`}>
      <h3>Boutique — Hoodie &amp; T-shirt</h3>
      <p className={styles.meta} style={{ marginTop: 0 }}>
        Prix, photos et ouverture des commandes membres. Les paiements encaissés se saisissent dans
        l&apos;onglet Cotisations (type pull).
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
            <p className={styles.meta}>{f.description}</p>
            <div className={styles.merchPreviewRow}>
              <img
                src={
                  assetUrl(f.photo_url) ||
                  (f.detail_option === 'capuche'
                    ? '/merch/hoodie-front.png'
                    : '/merch/tshirt-front.png')
                }
                alt={`Avant ${f.titre}`}
                className={styles.merchPreview}
              />
              <img
                src={
                  assetUrl(f.photo_back_url) ||
                  (f.detail_option === 'capuche'
                    ? '/merch/hoodie-back.png'
                    : '/merch/tshirt-back.png')
                }
                alt={`Arrière ${f.titre}`}
                className={styles.merchPreview}
              />
            </div>
            <div className={styles.merchCatalogFields}>
              <label>
                Prix (DT)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={merchDrafts[f.detail_option]?.prix_total ?? ''}
                  onChange={(e) =>
                    setMerchDrafts((current) => ({
                      ...current,
                      [f.detail_option]: {
                        ...(current[f.detail_option] || {}),
                        prix_total: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label>
                Photo avant
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) =>
                    setMerchDrafts((current) => ({
                      ...current,
                      [f.detail_option]: {
                        ...(current[f.detail_option] || {}),
                        photo: e.target.files?.[0] || null,
                      },
                    }))
                  }
                />
              </label>
              <label>
                Photo arrière
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) =>
                    setMerchDrafts((current) => ({
                      ...current,
                      [f.detail_option]: {
                        ...(current[f.detail_option] || {}),
                        photo_back: e.target.files?.[0] || null,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <p className={styles.meta}>
              {merchOrders.filter((o) => o.produit === f.detail_option).length} commande(s)
            </p>
            <div className={styles.pullFormActions}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving}
                onClick={() => saveMerchCatalog(f.detail_option)}
              >
                Enregistrer
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving || f.ouvert}
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
              <a
                className="btn btn-secondary btn-sm"
                href={`/boutique/${f.detail_option}`}
                target="_blank"
                rel="noreferrer"
              >
                Aperçu
              </a>
            </div>
          </article>
        ))}
      </div>
      {merchOrders.length > 0 && (
        <div className={styles.merchOrders}>
          <h4>Commandes reçues ({merchOrders.length})</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Membre</th>
                  <th>Contact</th>
                  <th>Filière</th>
                  <th>Taille</th>
                  <th>Prix</th>
                    <th>Accepte de payer</th>
                    <th>Statut commande</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{PULL_OPTIONS[order.produit] || order.titre}</td>
                    <td>{`${order.prenom} ${order.nom}`.trim()}</td>
                    <td>
                      {order.telephone || '—'}
                      <br />
                      <small>{order.email}</small>
                    </td>
                    <td>{order.filiere || '—'}</td>
                    <td><strong>{order.taille || '—'}</strong></td>
                    <td>{money(order.prix_total, devise)}</td>
                    <td>{Number(order.accepte_paiement) === 1 ? 'Oui' : 'Non'}</td>
                    <td>
                      <select
                        value={order.statut_commande || 'en_attente'}
                        disabled={saving}
                        onChange={(e) => updateMerchStatus(order.id, e.target.value)}
                      >
                        {Object.entries(MERCH_STATUS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={saving}
                        onClick={() => deleteMerchOrder(order.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const saveMailTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/finance/settings', {
        mail_paiement_sujet: settings.mail_paiement_sujet,
        mail_paiement_corps: settings.mail_paiement_corps,
      });
      setSettings(data);
      flash('Modèle de mail enregistré.');
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const selectPaymentType = async (code) => {
    const t = cotTypes.find((x) => x.code === code);
    setCotPage(1);
    setCotType(code);
    setPaymentForm((f) => ({
      ...f,
      cotisation_type: code,
      detail_ref_id: '',
      detail_option: code === 'pull' ? 'tshirt' : '',
      member_id: '',
      montant: '',
    }));
    setMemberQuery('');
    setEligibleMembers([]);
    try {
      const opts = await loadFormOptions(code);
      if (code === 'pull') {
        applyPullPrice(opts, 'tshirt');
      }
      if (code === 'recrutement') {
        await loadEligible('recrutement');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Options indisponibles.');
    }
  };

  const applyPullPrice = async (opts, variant) => {
    const list = opts || formOptions;
    const offer =
      list.find((o) => o.detail_option === variant) ||
      list.find((o) => String(o.id) === String(paymentForm.detail_ref_id));
    const price = Number(offer?.prix_total ?? 40);
    setPaymentForm((f) => ({
      ...f,
      detail_option: variant,
      detail_ref_id: offer?.id ? String(offer.id) : f.detail_ref_id,
      detail_nom: offer?.titre || f.detail_nom,
      member_id: '',
      montant: Number.isFinite(price) && price > 0 ? String(price) : '',
    }));
    setMemberQuery('');
    if (offer?.id) {
      try {
        await loadEligible('pull', offer.id);
      } catch {
        setEligibleMembers([]);
      }
    } else {
      setEligibleMembers([]);
    }
  };

  const selectPaymentRef = async (refId) => {
    const offer = formOptions.find((o) => String(o.id) === String(refId));
    setPaymentForm((f) => {
      const next = { ...f, detail_ref_id: refId, member_id: '' };
      if (f.cotisation_type === 'pull' && offer) {
        next.detail_option = offer.detail_option || f.detail_option;
        next.detail_nom = offer.titre || f.detail_nom;
        const price = Number(offer.prix_total);
        next.montant = Number.isFinite(price) && price > 0 ? String(price) : '';
      }
      return next;
    });
    setMemberQuery('');
    try {
      if (refId) {
        await loadEligible(paymentForm.cotisation_type, refId);
      } else {
        setEligibleMembers([]);
      }
    } catch {
      setEligibleMembers([]);
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
      const typeCode = paymentForm.cotisation_type || cotType;
      setPaymentForm({
        ...emptyPayment,
        annee_cotisation: String(cotAnnee || settings?.cotisation_annee || new Date().getFullYear()),
        cotisation_type: typeCode,
        detail_option: typeCode === 'pull' ? 'tshirt' : '',
        montant: '',
      });
      setMemberQuery('');
      setEligibleMembers([]);
      if (NEEDS_REF.includes(typeCode)) {
        const opts = await loadFormOptions(typeCode);
        if (typeCode === 'pull') applyPullPrice(opts, 'tshirt');
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
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/finance/payments/${id}`);
      setHistory((prev) => {
        if (!prev) return prev;
        const payments = (prev.payments || []).filter((p) => Number(p.id) !== Number(id));
        if (!payments.length) return null;
        return { ...prev, payments };
      });
      flash('Paiement supprimé.');
      await loadCotisations();
    } catch (err) {
      const message = err.response?.data?.message || 'Suppression impossible.';
      setError(message);
      window.alert(message);
    }
  };

  const removeMemberFromCotisations = async (memberId, nom) => {
    const ok = await confirm({
      title: 'Retirer ce membre ?',
      message: `Supprimer tous les paiements de ${nom || 'ce membre'} pour ce type et cette année. Il disparaîtra de la liste.`,
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/finance/payments/member/${memberId}`, {
        params: { annee: cotAnnee, type: cotType },
      });
      setCotisations((prev) => prev.filter((c) => Number(c.member_id) !== Number(memberId)));
      setHistory((prev) =>
        prev && Number(prev.member?.id) === Number(memberId) ? null : prev
      );
      flash('Membre retiré de la liste.');
      await loadCotisations();
    } catch (err) {
      const message = err.response?.data?.message || 'Suppression impossible.';
      setError(message);
      window.alert(message);
    }
  };

  const deleteMerchOrder = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette commande ?',
      message: 'Cette action est définitive.',
      tone: 'danger',
    });
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/finance/merchandise-orders/${id}`);
      setMerchOrders((prev) => prev.filter((o) => Number(o.id) !== Number(id)));
      flash('Commande supprimée.');
    } catch (err) {
      const message = err.response?.data?.message || 'Suppression impossible.';
      setError(message);
      window.alert(message);
    } finally {
      setSaving(false);
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
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 52,
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
        <p>Cotisations et paiements · boutique pull · mail de confirmation.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.tabs}>
        {[
          ['cotisations', 'Cotisations'],
          ['boutique', 'Boutique'],
          ['mails', 'Mails'],
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

      {tab === 'boutique' && <section className={styles.section}>{renderPullFormsPanel()}</section>}

      {tab === 'cotisations' && (
        <section className={styles.section}>
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
              <span>Total encaissé</span>
              <strong>{money(cotMeta.total_encaisse ?? 0, devise)}</strong>
            </div>
          </div>

          <div className={styles.split}>
            <div className={styles.panelStack}>
            <form className={`card form ${styles.panel}`} onSubmit={submitPayment}>
              <h3>Enregistrer un paiement reçu</h3>
              <p className={styles.meta} style={{ marginTop: 0 }}>
                Saisie trésorerie : recrutement, formation, car, pull, robot, événement.
              </p>
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
                      ? 'Formation (optionnel)'
                      : paymentForm.cotisation_type === 'evenement'
                        ? 'Événement (optionnel)'
                        : 'Formulaire / offre (optionnel)'}
                  </label>
                  <select
                    value={paymentForm.detail_ref_id}
                    onChange={(e) => selectPaymentRef(e.target.value)}
                  >
                    <option value="">—</option>
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
                </div>
              ) : null}
              {paymentForm.cotisation_type === 'pull' ? (
                <div className="form-group">
                  <label>Type de pull</label>
                  <select
                    required
                    value={paymentForm.detail_option || 'tshirt'}
                    onChange={(e) => applyPullPrice(formOptions, e.target.value)}
                  >
                    <option value="tshirt">T-shirt</option>
                    <option value="capuche">Hoodie</option>
                  </select>
                </div>
              ) : null}
              <div className="form-group">
                <label>
                  {usingEligible
                    ? 'Membre ayant rempli le formulaire'
                    : 'Membre (taper le nom pour filtrer)'}
                </label>
                <input
                  type="search"
                  placeholder="Rechercher par nom ou email…"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  autoComplete="off"
                />
                {usingEligible ? (
                  <small className={styles.meta}>
                    {NEEDS_REF.includes(paymentForm.cotisation_type) &&
                    !paymentForm.detail_ref_id &&
                    paymentForm.cotisation_type !== 'pull'
                      ? 'Choisissez d’abord le formulaire / l’offre ci-dessus.'
                      : 'Uniquement les personnes qui ont soumis le formulaire.'}
                  </small>
                ) : null}
                <select
                  required
                  value={paymentForm.member_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, member_id: e.target.value })}
                  style={{ marginTop: '0.5rem' }}
                >
                  <option value="">
                    {membersForPayment.length
                      ? 'Choisir le membre…'
                      : usingEligible
                        ? 'Aucun inscrit au formulaire'
                        : 'Aucun membre trouvé'}
                  </option>
                  {membersForPayment.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom} — {m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row two">
                <div className="form-group">
                  <label>Montant reçu ({devise})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={paymentForm.montant}
                    onChange={(e) => setPaymentForm({ ...paymentForm, montant: e.target.value })}
                    placeholder="Montant du formulaire"
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
                        <td>
                          {money(c.paid_total, devise)}
                          {c.payments_count > 1 && c.payments_breakdown ? (
                            <div className={styles.meta}>{c.payments_breakdown}</div>
                          ) : c.last_detail ? (
                            <div className={styles.meta}>
                              {c.last_detail === 'tshirt'
                                ? 'T-shirt'
                                : c.last_detail === 'capuche'
                                  ? 'Hoodie'
                                  : c.last_detail}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${styles[`st_${c.statut}`]}`}>
                            {STATUS_LABEL[c.statut]}
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openHistory(c.member_id)}
                            >
                              Historique
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeMemberFromCotisations(c.member_id, c.nom)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!cotisations.length && (
                  <p className={styles.empty}>
                    Aucun membre avec un paiement pour ce type. Enregistrez un paiement à gauche pour
                    le voir ici.
                  </p>
                )}
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

      {tab === 'mails' && settings && (
        <section className={styles.section}>
          <form onSubmit={saveMailTemplate}>
            <MailTemplateEditor
              title="Confirmation de paiement"
              description="Envoyé automatiquement au membre quand le trésorier enregistre un paiement dans Cotisations."
              placeholders={MAIL_PLACEHOLDERS}
              sampleVars={{
                Nom: 'Salsabil Ben Ammar',
                Type: 'Cotisation recrutement',
                Annee: String(new Date().getFullYear()),
                Montant: '30,00 DT',
                Devise: 'DT',
                DatePaiement: new Date().toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }),
                Methode: 'Espèces',
                Detail: '—',
                Note: '—',
              }}
              subject={settings.mail_paiement_sujet || DEFAULT_MAIL_SUJET}
              body={settings.mail_paiement_corps || DEFAULT_MAIL_CORPS}
              onSubjectChange={(v) => setSettings({ ...settings, mail_paiement_sujet: v })}
              onBodyChange={(v) => setSettings({ ...settings, mail_paiement_corps: v })}
            />
            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer le mail'}
              </button>
            </div>
          </form>
        </section>
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
                  <th>Actions</th>
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
                        className="btn btn-danger btn-sm"
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
