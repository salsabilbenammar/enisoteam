import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import FormQuestionPicker from '../../components/admin/FormQuestionPicker';
import { toApiFields } from '../../data/formQuestionBank';
import { defaultDateMin, minSelectableDate } from '../../utils/dateLimits';

const empty = {
  titre: '',
  description: '',
  date: '',
  formateur: '',
  niveau: 'debutant',
  lien: '',
  payante: false,
  prix: '',
  fifo_paiement: false,
  champs_personnalises: [],
};

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
  const [firstN, setFirstN] = useState('');
  const [onlyRetained, setOnlyRetained] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [regsSort, setRegsSort] = useState('inscription_asc');
  const [paymentBusyId, setPaymentBusyId] = useState(null);
  const [regsFifoPaiement, setRegsFifoPaiement] = useState(false);

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
      payante: !!item.payante,
      prix: item.prix || '',
      fifo_paiement: !!item.fifo_paiement,
      champs_personnalises: (item.champs_personnalises || []).map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type || 'text',
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options.join(', ') : '',
      })),
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        champs_personnalises: toApiFields(form.champs_personnalises),
      };
      if (editId) await api.put(`/trainings/${editId}`, payload);
      else await api.post('/trainings', payload);
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
    setFirstN('');
    setOnlyRetained(false);
    setPaymentFilter('all');
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

  const retainLimit = useMemo(() => {
    const n = Number(firstN);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.floor(n);
  }, [firstN]);

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

  const retainEligibleCount = useMemo(() => {
    if (!regs) return 0;
    if (rankByPayment) return paidSortedByDate.length;
    return regs.length;
  }, [regs, rankByPayment, paidSortedByDate]);

  const displayedRegs = useMemo(() => {
    let list = rankedRegs;

    if (regsPaid && paymentFilter === 'valide') {
      list = list.filter((r) => !!r.paiement_valide);
    } else if (regsPaid && paymentFilter === 'non_valide') {
      list = list.filter((r) => !r.paiement_valide);
    }
    if (onlyRetained && retainLimit != null) {
      list = list.filter((r) => {
        if (rankByPayment && !r.paiement_valide) return false;
        const rank = rankById.get(r.id);
        return rank != null && rank <= retainLimit;
      });
    }

    const sorted = list.slice();
    if (regsSort === 'paiement_asc') {
      sorted.sort((a, b) => compareByPayment(a, b, 1));
    } else {
      sorted.sort((a, b) => compareByInscription(a, b, 1));
    }
    return sorted;
  }, [
    rankedRegs,
    regsPaid,
    paymentFilter,
    onlyRetained,
    retainLimit,
    rankByPayment,
    rankById,
    regsSort,
  ]);

  const paymentCounts = useMemo(() => {
    if (!regs || !regsPaid) return { valide: 0, non: 0 };
    let valide = 0;
    for (const r of regs) {
      if (r.paiement_valide) valide += 1;
    }
    return { valide, non: regs.length - valide };
  }, [regs, regsPaid]);

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Gérer les formations</h1>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <h3>{editId ? 'Modifier' : 'Nouvelle formation'}</h3>
        <div className="form-row two">
          <div className="form-group">
            <label>Titre</label>
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              min={dateMin}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="form-row two">
          <div className="form-group">
            <label>Formateur</label>
            <input value={form.formateur} onChange={(e) => setForm({ ...form, formateur: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Niveau</label>
            <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
          </div>
        </div>
        <div className="form-row two">
          <div className="form-group">
            <label>Lien ressources (membres)</label>
            <input value={form.lien} onChange={(e) => setForm({ ...form, lien: e.target.value })} />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.payante}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payante: e.target.checked,
                    prix: e.target.checked ? form.prix : '',
                    fifo_paiement: e.target.checked ? form.fifo_paiement : false,
                  })
                }
              />
              Formation payante
            </label>
          </div>
        </div>
        {form.payante && (
          <>
            <div className="form-row two">
              <div className="form-group">
                <label>Montant (ex. 30 DT)</label>
                <input
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                  required
                  placeholder="30 DT"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.fifo_paiement}
                    onChange={(e) => setForm({ ...form, fifo_paiement: e.target.checked })}
                  />
                  Places FIFO par paiement
                </label>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                  Les places sont attribuées aux premiers paiements validés (pas aux premières inscriptions).
                </small>
              </div>
            </div>
          </>
        )}

        <hr style={{ margin: '1rem 0', border: 0, borderTop: '1px solid var(--border, #ddd)' }} />
        <FormQuestionPicker
          value={form.champs_personnalises}
          onChange={(champs_personnalises) => setForm({ ...form, champs_personnalises })}
        />

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Créer'}
          </button>
          {editId && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Titre</th>
              <th>Niveau</th>
              <th>Prix</th>
              <th>Inscrits</th>
              <th>Inscriptions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}</td>
                <td>{item.titre}</td>
                <td>{item.niveau}</td>
                <td>{item.payante ? item.prix || 'Payante' : 'Gratuite'}</td>
                <td>
                  {Number(item.inscriptions_count || 0)}
                  {item.payante && item.fifo_paiement ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>FIFO paiement</div>
                  ) : null}
                </td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${item.inscription_ouverte ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleInscription(item)}
                  >
                    {item.inscription_ouverte ? 'Ouvert' : 'Fermé'}
                  </button>
                </td>
                <td className="actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openRegs(item)}
                    disabled={regsLoading}
                  >
                    Voir les inscrits à cette formation ({Number(item.inscriptions_count || 0)})
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>
                    Éditer
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                setFirstN('');
                setOnlyRetained(false);
                setPaymentFilter('all');
                setRegsSort('inscription_asc');
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
                  <label>
                    {rankByPayment
                      ? 'Retenir les N premiers paiements'
                      : 'Retenir les N premiers inscrits'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={firstN}
                    onChange={(e) => setFirstN(e.target.value)}
                    placeholder={`Ex. ${Math.min(20, Math.max(1, retainEligibleCount || regs.length))}`}
                  />
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                    {rankByPayment
                      ? 'Ordre FIFO sur la date de validation du paiement. Sans paiement validé = liste d’attente.'
                      : 'Ordre d’arrivée (date d’inscription). Les premiers remplissent la formation.'}
                  </small>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={onlyRetained}
                      disabled={retainLimit == null}
                      onChange={(e) => setOnlyRetained(e.target.checked)}
                    />
                    Afficher seulement les retenus
                  </label>
                  {retainLimit != null && (
                    <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {Math.min(retainLimit, retainEligibleCount)} retenu
                      {Math.min(retainLimit, retainEligibleCount) > 1 ? 's' : ''}
                      {retainEligibleCount > retainLimit
                        ? ` · ${retainEligibleCount - retainLimit} en liste d’attente`
                        : ''}
                      {rankByPayment && paymentCounts.non
                        ? ` · ${paymentCounts.non} sans paiement validé`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
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
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Statut</th>
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
                        const canRetain = !rankByPayment || !!r.paiement_valide;
                        const retained =
                          retainLimit == null || !canRetain
                            ? null
                            : Number(rank) <= retainLimit;
                        return (
                          <tr key={r.id}>
                            <td>{rank}</td>
                            <td>
                              {retainLimit == null ? (
                                rankByPayment && !r.paiement_valide ? (
                                  <span className="badge">Sans paiement</span>
                                ) : (
                                  '—'
                                )
                              ) : retained ? (
                                <span className="badge badge-accent">Retenu</span>
                              ) : rankByPayment && !r.paiement_valide ? (
                                <span className="badge">Sans paiement</span>
                              ) : (
                                <span className="badge">Liste d&apos;attente</span>
                              )}
                            </td>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
