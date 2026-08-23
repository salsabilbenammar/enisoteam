import { useEffect, useMemo, useRef, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import GoogleFormBuilder, { createBlankQuestion } from '../../components/admin/GoogleFormBuilder';
import { toApiFields } from '../../data/formQuestionBank';
import { defaultDateMin, minSelectableDate } from '../../utils/dateLimits';
import styles from './ManageDeplacements.module.css';

const empty = {
  titre: '',
  description: '',
  date: '',
  formateur: '',
  niveau: 'debutant',
  lien: '',
  image: null,
  image_url: '',
  payante: false,
  prix: '',
  fifo_paiement: false,
  champs_personnalises: [],
};

function mapAdminFields(list) {
  return (list || []).map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type || 'text',
    required: !!f.required,
    options: Array.isArray(f.options)
      ? f.options
      : String(f.options || '')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
  }));
}

function paymentTime(r) {
  if (!r?.paiement_at) return Number.POSITIVE_INFINITY;
  const t = new Date(r.paiement_at).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function inscriptionTime(r) {
  const t = new Date(r?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatPaymentDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '—';
    const [y, m, day] = raw.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('fr-FR');
  }
  const hasTime =
    d.getHours() !== 0 ||
    d.getMinutes() !== 0 ||
    d.getSeconds() !== 0 ||
    String(value).includes('T') ||
    String(value).includes(' ');
  return hasTime
    ? d.toLocaleString('fr-FR')
    : d.toLocaleDateString('fr-FR');
}

function compareByInscription(a, b, dir = 1) {
  const d = (inscriptionTime(a) - inscriptionTime(b)) * dir;
  if (d !== 0) return d;
  return (Number(a.id) - Number(b.id)) * dir;
}

function compareByPayment(a, b, dir = 1) {
  const aPaid = !!a.paiement_valide;
  const bPaid = !!b.paiement_valide;
  if (aPaid !== bPaid) return aPaid ? -1 : 1;
  if (!aPaid) return compareByInscription(a, b, 1);
  const ta = paymentTime(a);
  const tb = paymentTime(b);
  if (ta !== tb) return (ta - tb) * dir;
  return compareByInscription(a, b, dir);
}

function formatAnswers(answers, fields) {
  if (!answers || typeof answers !== 'object') return '—';
  const entries = Object.entries(answers);
  if (!entries.length) return '—';
  return entries
    .map(([id, value]) => {
      const label = fields?.find((f) => f.id === id)?.label || id;
      const display = Array.isArray(value)
        ? value.join(', ')
        : value === true
          ? 'Oui'
          : value === false || value === ''
            ? 'Non'
            : String(value);
      return `${label}: ${display}`;
    })
    .join(' · ');
}

export default function ManageTrainings() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('trainings');
  const confirm = useConfirm();
  const regsRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [dateMin, setDateMin] = useState(() => defaultDateMin());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [regs, setRegs] = useState(null);
  const [regsTitle, setRegsTitle] = useState('');
  const [regsPaid, setRegsPaid] = useState(false);
  const [regsTrainingId, setRegsTrainingId] = useState(null);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regsFields, setRegsFields] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [regsSort, setRegsSort] = useState('inscription_asc');
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [regsFifoPaiement, setRegsFifoPaiement] = useState(false);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState(() => new Set());
  const [showChosenList, setShowChosenList] = useState(false);
  const [downloadingList, setDownloadingList] = useState(false);

  const load = () =>
    api
      .get('/trainings')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setDateMin(defaultDateMin());
  };

  const onEdit = (item) => {
    setEditId(item.id);
    const date = String(item.date).slice(0, 10);
    setDateMin(minSelectableDate(date));
    setForm({
      titre: item.titre,
      description: item.description,
      date,
      formateur: item.formateur || '',
      niveau: item.niveau || 'debutant',
      lien: item.lien || '',
      image: null,
      image_url: item.image || '',
      payante: !!item.payante,
      prix: item.prix || '',
      fifo_paiement: !!item.fifo_paiement,
      champs_personnalises: mapAdminFields(item.champs_personnalises),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addQuestion = () => {
    setForm((f) => ({
      ...f,
      champs_personnalises: [...(f.champs_personnalises || []), createBlankQuestion()],
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = new FormData();
      data.append('titre', form.titre);
      data.append('description', form.description);
      data.append('date', form.date);
      data.append('formateur', form.formateur || '');
      data.append('niveau', form.niveau || 'debutant');
      data.append('lien', form.lien || '');
      data.append('payante', form.payante ? '1' : '0');
      data.append('prix', form.prix || '');
      data.append('fifo_paiement', form.fifo_paiement ? '1' : '0');
      data.append(
        'champs_personnalises',
        JSON.stringify(toApiFields(form.champs_personnalises))
      );
      if (form.image) data.append('image', form.image);

      if (editId) await api.put(`/trainings/${editId}`, data);
      else await api.post('/trainings', data);
      reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette formation ?',
      message: 'Cette action est définitive. La formation disparaîtra de la page Formations.',
    });
    if (!ok) return;
    try {
      await api.delete(`/trainings/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const toggleInscription = async (item) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/trainings/${item.id}/inscription`, {
        inscription_ouverte: !item.inscription_ouverte,
      });
      setItems((prev) => prev.map((x) => (x.id === item.id ? data : x)));
      setSuccess(
        data.inscription_ouverte
          ? `Inscriptions ouvertes pour « ${item.titre} ».`
          : `Inscriptions fermées pour « ${item.titre} ».`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour impossible.');
    }
  };

  const openRegs = async (item) => {
    setError('');
    setRegsLoading(true);
    setRegsTitle(item.titre);
    setRegsPaid(!!item.payante);
    setRegsFifoPaiement(!!item.payante && !!item.fifo_paiement);
    setRegsTrainingId(item.id);
    setRegsFields(item.champs_personnalises || []);
    setPaymentFilter('all');
    setSelectedRegistrationIds(new Set());
    setShowChosenList(false);
    setRegsSort(
      item.payante && item.fifo_paiement ? 'paiement_asc' : 'inscription_asc'
    );
    try {
      const { data } = await api.get(`/trainings/${item.id}/registrations`);
      setRegs(data);
      setItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, inscriptions_count: data.length } : x
        )
      );
      requestAnimationFrame(() => {
        regsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setRegs(null);
      setError(err.response?.data?.message || 'Chargement des inscrits impossible.');
    } finally {
      setRegsLoading(false);
    }
  };

  const togglePayment = async (registration) => {
    if (!regsTrainingId || !regsPaid) return;
    setError('');
    setPaymentBusyId(registration.id);
    try {
      const { data } = await api.patch(
        `/trainings/${regsTrainingId}/registrations/${registration.id}/paiement`,
        { paiement_valide: !registration.paiement_valide }
      );
      setRegs((prev) => (prev || []).map((r) => (r.id === data.id ? data : r)));
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour du paiement impossible.');
    } finally {
      setPaymentBusyId(null);
    }
  };

  const paidSortedByDate = useMemo(() => {
    if (!regs) return [];
    return regs
      .filter((r) => !!r.paiement_valide)
      .slice()
      .sort((a, b) => {
        const d = paymentTime(a) - paymentTime(b);
        if (d !== 0) return d;
        return inscriptionTime(a) - inscriptionTime(b);
      });
  }, [regs]);

  const rankByPayment = regsPaid && regsFifoPaiement;

  const rankedRegs = useMemo(() => {
    if (!regs) return [];
    if (rankByPayment) {
      const unpaid = regs
        .filter((r) => !r.paiement_valide)
        .slice()
        .sort((a, b) => inscriptionTime(a) - inscriptionTime(b));
      return [...paidSortedByDate, ...unpaid];
    }
    return regs.slice().sort((a, b) => inscriptionTime(a) - inscriptionTime(b));
  }, [regs, rankByPayment, paidSortedByDate]);

  const rankById = useMemo(() => {
    const map = new Map();
    rankedRegs.forEach((r, idx) => map.set(r.id, idx + 1));
    return map;
  }, [rankedRegs]);

  const displayedRegs = useMemo(() => {
    let list = rankedRegs;

    if (regsPaid && paymentFilter === 'valide') {
      list = list.filter((r) => !!r.paiement_valide);
    } else if (regsPaid && paymentFilter === 'non_valide') {
      list = list.filter((r) => !r.paiement_valide);
    }

    const sorted = list.slice();
    if (regsSort === 'paiement_asc') {
      sorted.sort((a, b) => compareByPayment(a, b, 1));
    } else {
      sorted.sort((a, b) => compareByInscription(a, b, 1));
    }
    return sorted;
  }, [rankedRegs, regsPaid, paymentFilter, regsSort]);

  const paymentCounts = useMemo(() => {
    if (!regs || !regsPaid) return { valide: 0, non: 0 };
    let valide = 0;
    for (const r of regs) {
      if (r.paiement_valide) valide += 1;
    }
    return { valide, non: regs.length - valide };
  }, [regs, regsPaid]);

  const chosenRegs = useMemo(() => {
    if (!regs?.length) return [];
    return regs.filter((r) => selectedRegistrationIds.has(Number(r.id)));
  }, [regs, selectedRegistrationIds]);

  const toggleRegistration = (id) => {
    const numId = Number(id);
    setSelectedRegistrationIds((prev) => {
      const next = new Set(prev);
      if (next.has(numId)) next.delete(numId);
      else next.add(numId);
      return next;
    });
  };

  const selectAllDisplayed = () => {
    setSelectedRegistrationIds(new Set(displayedRegs.map((r) => Number(r.id))));
  };

  const clearRegistrationSelection = () => {
    setSelectedRegistrationIds(new Set());
  };

  const downloadChosenListPdf = async () => {
    if (!chosenRegs.length) {
      setError('Aucun candidat choisi à télécharger.');
      return;
    }
    setDownloadingList(true);
    setError('');
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.text('ENISO Team — Liste des candidats choisis', 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Formation : ${regsTitle || '—'}`, 14, 28);
      doc.text(`Candidats : ${chosenRegs.length}`, 14, 34);
      doc.setTextColor(0, 0, 0);

      const head = [['#', 'Prénom', 'Nom']];
      const body = chosenRegs.map((r, idx) => [
        String(idx + 1),
        r.prenom || '—',
        r.nom || '—',
      ]);

      autoTable(doc, {
        startY: 40,
        head,
        body,
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [22, 57, 107], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 252] },
        margin: { left: 14, right: 14 },
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const safeTitle = String(regsTitle || 'formation')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40);
      doc.save(`candidats_choisis_${safeTitle}_${stamp}.pdf`);
      setSuccess('Liste PDF téléchargée.');
    } catch {
      setError('Téléchargement PDF impossible.');
    } finally {
      setDownloadingList(false);
    }
  };

  const overview = useMemo(() => {
    const open = items.filter((i) => i.inscription_ouverte).length;
    const candidates = items.reduce((sum, i) => sum + Number(i.inscriptions_count || 0), 0);
    return { total: items.length, open, candidates };
  }, [items]);

  if (loading) return <Loader />;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>Secrétariat</p>
        <h1>Formations</h1>
        <p>Créez des formulaires d&apos;inscription au style Google Forms.</p>
      </header>

      <ReadOnlyBanner module="trainings" />

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Formations</span>
          <strong>{overview.total}</strong>
        </div>
        <div className={styles.stat}>
          <span>Inscriptions ouvertes</span>
          <strong>{overview.open}</strong>
        </div>
        <div className={styles.stat}>
          <span>Inscrits au total</span>
          <strong>{overview.candidates}</strong>
        </div>
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <div className={styles.gformBanner}>
          <p className={styles.gformBannerEyebrow}>ENISO Team · Admin</p>
          <h2>{editId ? 'Modifier la formation' : 'Nouvelle formation'}</h2>
          <p>
            {editId
              ? 'Mettez à jour les informations et les questions du formulaire.'
              : 'Créez un formulaire d’inscription au style Google Forms.'}
          </p>
          {editId && <span className={styles.editBadge}>Mode édition</span>}
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-titre">
            Titre de la formation <span>*</span>
          </label>
          <input
            id="trn-titre"
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            required
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-description">
            Description <span>*</span>
          </label>
          <textarea
            id="trn-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            placeholder="Réponse longue"
            rows={4}
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-affiche">Affiche de la formation</label>
          {(form.image || form.image_url) && (
            <img
              src={form.image ? URL.createObjectURL(form.image) : assetUrl(form.image_url)}
              alt="Aperçu affiche"
              className={styles.affichePreview}
            />
          )}
          <input
            id="trn-affiche"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) =>
              setForm({
                ...form,
                image: e.target.files?.[0] || null,
              })
            }
          />
          <p className={styles.afficheHint}>JPG, PNG, WebP ou GIF — affichée sur la page Formations.</p>
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-date">
            Date <span>*</span>
          </label>
          <input
            id="trn-date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            min={dateMin}
            required
          />
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-formateur">Formateur</label>
          <input
            id="trn-formateur"
            value={form.formateur}
            onChange={(e) => setForm({ ...form, formateur: e.target.value })}
            placeholder="Réponse courte"
          />
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>Niveau</p>
          <div className={styles.gformChoices}>
            {[
              { value: 'debutant', label: 'Débutant' },
              { value: 'intermediaire', label: 'Intermédiaire' },
              { value: 'avance', label: 'Avancé' },
            ].map((opt) => (
              <label key={opt.value} className={styles.gformChoice}>
                <input
                  type="radio"
                  name="trn-niveau"
                  checked={form.niveau === opt.value}
                  onChange={() => setForm({ ...form, niveau: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.gformCard}>
          <label htmlFor="trn-lien">Lien ressources (membres)</label>
          <input
            id="trn-lien"
            value={form.lien}
            onChange={(e) => setForm({ ...form, lien: e.target.value })}
            placeholder="https://…"
          />
        </div>

        <div className={styles.gformCard}>
          <p className={styles.gformQuestion}>Formation payante ?</p>
          <div className={styles.gformChoices}>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="trn-payante"
                checked={form.payante === true}
                onChange={() => setForm({ ...form, payante: true })}
              />
              Payante
            </label>
            <label className={styles.gformChoice}>
              <input
                type="radio"
                name="trn-payante"
                checked={form.payante === false}
                onChange={() =>
                  setForm({ ...form, payante: false, prix: '', fifo_paiement: false })
                }
              />
              Gratuite
            </label>
          </div>
        </div>

        {form.payante && (
          <>
            <div className={styles.gformCard}>
              <label htmlFor="trn-prix">
                Montant (DT) <span>*</span>
              </label>
              <input
                id="trn-prix"
                value={form.prix}
                onChange={(e) => setForm({ ...form, prix: e.target.value })}
                placeholder="Ex. 30"
                required
              />
            </div>
            <div className={styles.gformCard}>
              <p className={styles.gformQuestion}>Places FIFO par paiement ?</p>
              <div className={styles.gformChoices}>
                <label className={styles.gformChoice}>
                  <input
                    type="radio"
                    name="trn-fifo"
                    checked={form.fifo_paiement === true}
                    onChange={() => setForm({ ...form, fifo_paiement: true })}
                  />
                  Oui — premiers paiements validés
                </label>
                <label className={styles.gformChoice}>
                  <input
                    type="radio"
                    name="trn-fifo"
                    checked={form.fifo_paiement === false}
                    onChange={() => setForm({ ...form, fifo_paiement: false })}
                  />
                  Non
                </label>
              </div>
              <p className={styles.afficheHint}>
                Les places sont attribuées aux premiers paiements validés (pas aux premières
                inscriptions).
              </p>
            </div>
          </>
        )}

        <div className={styles.gformSection}>
          <div className={styles.gformSectionHead}>
            <div>
              <h3>Questions du formulaire</h3>
              <p>Ajoutez les questions que les candidats devront remplir à l’inscription.</p>
            </div>
            <button
              type="button"
              className={styles.gformAddBtn}
              onClick={addQuestion}
              aria-label="Ajouter une question"
            >
              +
            </button>
          </div>
          <GoogleFormBuilder
            value={form.champs_personnalises}
            onChange={(champs_personnalises) => setForm((f) => ({ ...f, champs_personnalises }))}
          />
        </div>

        <div className={styles.gformActions}>
          {editId && (
            <button type="button" className={styles.gformClear} onClick={reset}>
              Annuler
            </button>
          )}
          <div className={styles.gformActionsRight}>
            <button type="submit" className={styles.gformSubmit} disabled={saving}>
              {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer le formulaire'}
            </button>
          </div>
        </div>
      </form>

      <section className={styles.listPanel}>
        <div className={styles.listHead}>
          <h2>Formations publiées</h2>
          <span className={`${styles.chip} ${styles.chipMuted}`}>
            {items.length} au total
          </span>
        </div>
        {!items.length ? (
          <p className={styles.empty}>Aucune formation pour le moment.</p>
        ) : (
          <div className={styles.tripGrid}>
            {items.map((item) => (
              <article key={item.id} className={styles.tripCard}>
                {item.image ? (
                  <img
                    src={assetUrl(item.image)}
                    alt=""
                    className={styles.affichePreview}
                    style={{ maxHeight: 160, marginBottom: '0.75rem' }}
                  />
                ) : null}
                <div className={styles.tripTop}>
                  <div>
                    <div className={styles.tripMeta}>
                      <span className={styles.chip}>{item.niveau || '—'}</span>
                      <span
                        className={`${styles.chip} ${
                          item.inscription_ouverte ? styles.chipOk : styles.chipClosed
                        }`}
                      >
                        {item.inscription_ouverte ? 'Ouvert' : 'Fermé'}
                      </span>
                      {item.payante && item.fifo_paiement ? (
                        <span className={`${styles.chip} ${styles.chipMuted}`}>FIFO paiement</span>
                      ) : null}
                    </div>
                    <h3>{item.titre}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.tripFacts}>
                  <span>
                    Date{' '}
                    <strong>
                      {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}
                    </strong>
                  </span>
                  <span>
                    Prix{' '}
                    <strong>
                      {item.payante
                        ? `${item.prix || '—'}${item.prix && !/dt/i.test(String(item.prix)) ? ' DT' : ''}`
                        : 'Gratuit'}
                    </strong>
                  </span>
                  <span>
                    Questions <strong>{(item.champs_personnalises || []).length}</strong>
                  </span>
                  <span>
                    Inscrits <strong>{Number(item.inscriptions_count || 0)}</strong>
                  </span>
                </div>
                <div className={styles.tripActions}>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      item.inscription_ouverte ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => toggleInscription(item)}
                  >
                    {item.inscription_ouverte ? 'Fermer inscriptions' : 'Ouvrir inscriptions'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openRegs(item)}
                    disabled={regsLoading}
                  >
                    Inscrits ({Number(item.inscriptions_count || 0)})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEdit(item)}
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(item.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {(regs || regsLoading) && (
        <div
          className="card"
          ref={regsRef}
          style={{ marginTop: '1.25rem' }}
          aria-label={`Inscrits — ${regsTitle}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>
              Inscrits à la formation — {regsTitle}
              {regs ? ` (${regs.length})` : ''}
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRegs(null);
                setRegsTitle('');
                setRegsTrainingId(null);
                setRegsFifoPaiement(false);
                setPaymentFilter('all');
                setRegsSort('inscription_asc');
                setSelectedRegistrationIds(new Set());
                setShowChosenList(false);
              }}
            >
              Fermer
            </button>
          </div>
          {regsLoading ? (
            <p className="empty">Chargement des inscrits…</p>
          ) : !regs.length ? (
            <p className="empty">Aucune inscription pour le moment. Les personnes qui remplissent le formulaire apparaîtront ici.</p>
          ) : (
            <>
              <div
                className="form-row two"
                style={{ marginBottom: '0.85rem', alignItems: 'end' }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Trier par</label>
                  <select value={regsSort} onChange={(e) => setRegsSort(e.target.value)}>
                    <option value="inscription_asc">
                      Date &amp; heure d&apos;inscription (ancien → récent)
                    </option>
                    {regsPaid && (
                      <option value="paiement_asc">
                        Date &amp; heure de paiement (ancien → récent)
                      </option>
                    )}
                  </select>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                    {regsPaid
                      ? 'Sans paiement validé, le tri par paiement place ces inscrits après les payés.'
                      : 'Tri sur la date et l’heure d’inscription.'}
                  </small>
                </div>
                {regsPaid ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Filtrer par paiement</label>
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="all">Tous ({regs.length})</option>
                      <option value="valide">Paiement validé ({paymentCounts.valide})</option>
                      <option value="non_valide">Paiement non validé ({paymentCounts.non})</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }} />
                )}
              </div>
              <div className={styles.filters} style={{ marginBottom: '0.85rem' }}>
                <div className={styles.listActions}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={selectAllDisplayed}
                  >
                    Tout sélectionner
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearRegistrationSelection}
                  >
                    Tout désélectionner
                  </button>
                  <span className={styles.selectionCount}>
                    {selectedRegistrationIds.size} sélectionné
                    {selectedRegistrationIds.size > 1 ? 's' : ''}
                    {' · '}
                    {displayedRegs.length} affiché{displayedRegs.length > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${showChosenList ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowChosenList((v) => !v)}
                  >
                    Liste des candidats choisis ({chosenRegs.length})
                  </button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className={styles.checkCol} aria-label="Sélection" />
                      <th>#</th>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Filière</th>
                      <th>Niveau</th>
                      {regsPaid && <th>Paiement</th>}
                      {regsPaid && <th>Date &amp; heure paiement</th>}
                      {regsFields.length > 0 && <th>Réponses</th>}
                      <th>Date &amp; heure d&apos;inscription</th>
                      {regsPaid && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {!displayedRegs.length ? (
                      <tr>
                        <td colSpan={regsPaid ? 12 : 9}>
                          <p className="empty" style={{ margin: '0.75rem 0' }}>
                            Aucun inscrit pour ce filtre.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      displayedRegs.map((r) => {
                        const rank = rankById.get(r.id) || '—';
                        return (
                          <tr key={r.id}>
                            <td className={styles.checkCol}>
                              <input
                                type="checkbox"
                                checked={selectedRegistrationIds.has(Number(r.id))}
                                onChange={() => toggleRegistration(r.id)}
                                aria-label={`Sélectionner ${r.prenom} ${r.nom}`}
                              />
                            </td>
                            <td>{rank}</td>
                            <td>{r.prenom}</td>
                            <td>{r.nom}</td>
                            <td>{r.email}</td>
                            <td>{r.telephone}</td>
                            <td>{r.filiere || '—'}</td>
                            <td>{r.annee || '—'}</td>
                            {regsPaid && (
                              <td>
                                {r.paiement_valide ? (
                                  <span className="badge badge-accent">
                                    Validé{r.paiement_via_finance ? ' (Finance)' : ''}
                                  </span>
                                ) : (
                                  <span className="badge">Non validé</span>
                                )}
                              </td>
                            )}
                            {regsPaid && <td>{formatPaymentDateTime(r.paiement_at)}</td>}
                            {regsFields.length > 0 && (
                              <td>{formatAnswers(r.reponses_personnalisees, regsFields)}</td>
                            )}
                            <td>{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                            {regsPaid && (
                              <td>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${
                                    r.paiement_valide ? 'btn-secondary' : 'btn-primary'
                                  }`}
                                  disabled={paymentBusyId === r.id || !!r.paiement_via_finance}
                                  title={
                                    r.paiement_via_finance
                                      ? 'Validé via un paiement Finance — non modifiable ici'
                                      : undefined
                                  }
                                  onClick={() => togglePayment(r)}
                                >
                                  {paymentBusyId === r.id
                                    ? '…'
                                    : r.paiement_valide
                                      ? 'Annuler validation'
                                      : 'Valider paiement'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {showChosenList && (
                <div className={styles.listBlock} style={{ marginTop: '1rem' }}>
                  <div className={styles.listHead}>
                    <div className={styles.listHeadRow}>
                      <div>
                        <h3>Liste des candidats choisis ({chosenRegs.length})</h3>
                        <p>
                          Cochez les inscrits dans le tableau, puis téléchargez la liste en PDF.
                        </p>
                      </div>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={downloadChosenListPdf}
                          disabled={downloadingList || !chosenRegs.length}
                        >
                          {downloadingList ? 'Export…' : 'Télécharger PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {chosenRegs.length ? (
                    <div className={styles.tableWrap}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Prénom</th>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Téléphone</th>
                            <th>Filière</th>
                            <th>Niveau</th>
                            {regsPaid && <th>Paiement</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {chosenRegs.map((r, idx) => (
                            <tr key={r.id}>
                              <td>{idx + 1}</td>
                              <td>{r.prenom || '—'}</td>
                              <td>
                                <strong>{r.nom || '—'}</strong>
                              </td>
                              <td>{r.email || '—'}</td>
                              <td>{r.telephone || '—'}</td>
                              <td>{r.filiere || '—'}</td>
                              <td>{r.annee || '—'}</td>
                              {regsPaid && (
                                <td>{r.paiement_valide ? 'Validé' : 'Non validé'}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className={styles.empty}>Aucun candidat sélectionné pour le moment.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      </fieldset>
    </div>
  );
}
