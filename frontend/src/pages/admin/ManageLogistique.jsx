import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import NewFormLaunch from '../../components/admin/NewFormLaunch';
import { useAuth } from '../../context/AuthContext';
import styles from './ManageLogistique.module.css';

const ETATS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'emprunte', label: 'Emprunté' },
  { value: 'en_reparation', label: 'En réparation' },
  { value: 'hors_service', label: 'Hors service' },
];

const ETAT_LABEL = Object.fromEntries(ETATS.map((e) => [e.value, e.label]));

const empty = {
  nom: '',
  categorie: '',
  description: '',
  quantite_totale: '1',
  quantite_disponible: '1',
  etat: 'disponible',
  emplacement: '',
  responsable: '',
  notes: '',
};

const emptyLoan = {
  materiel_id: '',
  emprunteur_nom: '',
  emprunteur_email: '',
  emprunteur_telephone: '',
  quantite: '1',
  date_emprunt: new Date().toISOString().slice(0, 10),
  date_retour_prevue: '',
  notes: '',
};

function stockRatio(item) {
  const total = Number(item.quantite_totale) || 0;
  const dispo = Number(item.quantite_disponible) || 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((dispo / total) * 100)));
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR');
  } catch {
    return String(value).slice(0, 10);
  }
}

function isOverdue(loan) {
  if (loan.statut !== 'en_cours' || !loan.date_retour_prevue) return false;
  const due = String(loan.date_retour_prevue).slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return due < today;
}

export default function ManageLogistique() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('logistique');
  const confirm = useConfirm();
  const [tab, setTab] = useState('inventaire');
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [loanForm, setLoanForm] = useState(emptyLoan);
  const [editId, setEditId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterEtat, setFilterEtat] = useState('');
  const [loanFilter, setLoanFilter] = useState('en_cours');
  const [search, setSearch] = useState('');

  const loadAllItems = () =>
    api
      .get('/logistique')
      .then((res) => setAllItems(res.data || []))
      .catch(() => {});

  const loadItems = () =>
    api
      .get('/logistique', {
        params: {
          etat: filterEtat || undefined,
          search: search.trim() || undefined,
        },
      })
      .then((res) => setItems(res.data || []))
      .catch(() => setError('Chargement inventaire impossible.'));

  const loadLoans = () =>
    api
      .get('/logistique/emprunts', {
        params: { statut: loanFilter || undefined },
      })
      .then((res) => setLoans(res.data || []))
      .catch(() => setError('Chargement emprunts impossible.'));

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadAllItems(), loadItems(), loadLoans()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEtat, loanFilter]);

  const stats = useMemo(() => {
    const actifs = loans.filter((l) => l.statut === 'en_cours');
    return {
      total: allItems.length,
      disponible: allItems.filter((i) => Number(i.quantite_disponible) > 0).length,
      empruntsActifs: actifs.length,
      enRetard: actifs.filter(isOverdue).length,
    };
  }, [allItems, loans]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setComposing(false);
  };

  const startNew = () => {
    setForm(empty);
    setEditId(null);
    setTab('inventaire');
    setComposing(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onEdit = (item) => {
    setTab('inventaire');
    setEditId(item.id);
    setComposing(true);
    setForm({
      nom: item.nom || '',
      categorie: item.categorie || '',
      description: item.description || '',
      quantite_totale: String(item.quantite_totale ?? 1),
      quantite_disponible: String(item.quantite_disponible ?? 1),
      etat: item.etat || 'disponible',
      emplacement: item.emplacement || '',
      responsable: item.responsable || '',
      notes: item.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startBorrow = (item) => {
    setTab('emprunts');
    setLoanForm({
      ...emptyLoan,
      materiel_id: String(item.id),
      quantite: '1',
      date_emprunt: new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.nom.trim()) {
      setError('Le nom du matériel est requis.');
      return;
    }
    const payload = {
      nom: form.nom.trim(),
      categorie: form.categorie.trim(),
      description: form.description,
      quantite_totale: Number(form.quantite_totale),
      // À la création : tout disponible. À l’édition : le stock se recalcule via les emprunts.
      quantite_disponible: editId
        ? Number(form.quantite_disponible)
        : Number(form.quantite_totale),
      etat: form.etat,
      emplacement: form.emplacement.trim(),
      responsable: form.responsable.trim(),
      notes: form.notes,
    };
    setSaving(true);
    try {
      if (editId) await api.put(`/logistique/${editId}`, payload);
      else await api.post('/logistique', payload);
      setSuccess(editId ? 'Matériel mis à jour.' : 'Matériel ajouté.');
      reset();
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const onBorrow = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!loanForm.materiel_id || !loanForm.emprunteur_nom.trim()) {
      setError('Matériel et nom de l’emprunteur sont requis.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/logistique/emprunts', {
        materiel_id: Number(loanForm.materiel_id),
        emprunteur_nom: loanForm.emprunteur_nom.trim(),
        emprunteur_email: loanForm.emprunteur_email.trim() || undefined,
        emprunteur_telephone: loanForm.emprunteur_telephone.trim() || undefined,
        quantite: Number(loanForm.quantite) || 1,
        date_emprunt: loanForm.date_emprunt,
        date_retour_prevue: loanForm.date_retour_prevue || undefined,
        notes: loanForm.notes || undefined,
      });
      setSuccess('Emprunt enregistré.');
      setLoanForm(emptyLoan);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Emprunt impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onReturn = async (loan) => {
    const ok = await confirm({
      title: 'Confirmer le retour ?',
      message: `${loan.emprunteur_nom} — ${loan.materiel_nom} (×${loan.quantite})`,
    });
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/logistique/emprunts/${loan.id}/retour`, {
        date_retour_effectif: new Date().toISOString().slice(0, 10),
      });
      setSuccess('Matériel retourné — stock mis à jour.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Retour impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce matériel ?',
      message: 'Cette action est définitive (emprunts liés inclus).',
    });
    if (!ok) return;
    try {
      await api.delete(`/logistique/${id}`);
      setSuccess('Matériel supprimé.');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const onSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  };

  if (loading && !items.length && !loans.length) return <Loader />;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <p className={styles.eyebrow}>Administration · Inventaire</p>
        <h1>Logistique</h1>
        <p>
          Inventaire du matériel ENISO Team, emprunts et retours avec suivi du stock.
        </p>
      </header>

      <ReadOnlyBanner module="logistique" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Références</span>
          <strong>{stats.total}</strong>
        </div>
        <div className={`${styles.stat} ${styles.statOk}`}>
          <span>En stock</span>
          <strong>{stats.disponible}</strong>
        </div>
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <span>Emprunts en cours</span>
          <strong>{stats.empruntsActifs}</strong>
        </div>
        <div className={`${styles.stat} ${styles.statDanger}`}>
          <span>En retard</span>
          <strong>{stats.enRetard}</strong>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'inventaire' ? styles.tabActive : ''}`}
          onClick={() => setTab('inventaire')}
        >
          Inventaire
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'emprunts' ? styles.tabActive : ''}`}
          onClick={() => setTab('emprunts')}
        >
          Emprunts & retours
        </button>
      </div>

      {tab === 'inventaire' && (
        <div className={styles.layout}>
          {!composing ? (
            <NewFormLaunch
              title="Formulaire vierge"
              subtitle="Nouveau matériel inventaire"
              onCreate={startNew}
              disabled={!canEditPage}
            />
          ) : (
            <form className={styles.panel} onSubmit={onSubmit}>
              <div className={styles.panelHead}>
                <h2>{editId ? 'Modifier' : 'Nouveau matériel'}</h2>
                {editId ? <span>#{editId}</span> : <span>Ajout rapide</span>}
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="mat-nom">Nom</label>
                    <input
                      id="mat-nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Ex. Multimètre digital"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mat-categorie">Catégorie</label>
                    <input
                      id="mat-categorie"
                      value={form.categorie}
                      onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                      placeholder="Électronique…"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="mat-desc">Description</label>
                  <textarea
                    id="mat-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Caractéristiques, marque, modèle…"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="mat-qte-total">Quantité totale</label>
                    <input
                      id="mat-qte-total"
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantite_totale}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          quantite_totale: v,
                          ...(!editId ? { quantite_disponible: v } : {}),
                        }));
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mat-etat">État</label>
                    <select
                      id="mat-etat"
                      value={form.etat}
                      onChange={(e) => setForm({ ...form, etat: e.target.value })}
                    >
                      {ETATS.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className="form-group">
                    <label htmlFor="mat-lieu">Emplacement</label>
                    <input
                      id="mat-lieu"
                      value={form.emplacement}
                      onChange={(e) => setForm({ ...form, emplacement: e.target.value })}
                      placeholder="Armoire A2…"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mat-resp">Responsable</label>
                    <input
                      id="mat-resp"
                      value={form.responsable}
                      onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="mat-notes">Notes</label>
                  <textarea
                    id="mat-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observations…"
                  />
                </div>

                <div className={styles.formActions}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={reset}>
                    Fermer
                  </button>
                </div>
              </div>
            </form>
          )}

          <section className={styles.inventory}>
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Inventaire</h2>
                <span>
                  {items.length} article{items.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${!filterEtat ? styles.chipActive : ''}`}
                  onClick={() => setFilterEtat('')}
                >
                  Tous
                </button>
                {ETATS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    className={`${styles.chip} ${filterEtat === e.value ? styles.chipActive : ''}`}
                    onClick={() => setFilterEtat(e.value)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>

              <form className={styles.toolbar} onSubmit={onSearch} style={{ marginTop: '0.85rem' }}>
                <input
                  placeholder="Rechercher nom, catégorie, lieu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  Chercher
                </button>
              </form>
            </div>

            {!items.length ? (
              <div className={styles.empty}>
                <strong>Aucun matériel</strong>
                Ajoutez un premier équipement via le formulaire à gauche.
              </div>
            ) : (
              <div className={styles.grid}>
                {items.map((item, index) => {
                  const ratio = stockRatio(item);
                  const barClass =
                    ratio === 0
                      ? styles.barFillEmpty
                      : ratio <= 30
                        ? styles.barFillLow
                        : styles.barFill;
                  const canBorrow =
                    Number(item.quantite_disponible) > 0 &&
                    item.etat !== 'hors_service' &&
                    item.etat !== 'en_reparation';
                  return (
                    <article
                      key={item.id}
                      className={styles.card}
                      style={{ animationDelay: `${Math.min(index, 10) * 0.04}s` }}
                    >
                      <div className={styles.cardTop}>
                        <div>
                          <h3 className={styles.cardTitle}>{item.nom}</h3>
                          <p className={styles.cardMeta}>{item.categorie || 'Sans catégorie'}</p>
                        </div>
                        <span className={`${styles.badge} ${styles[`badge_${item.etat}`] || ''}`}>
                          {ETAT_LABEL[item.etat] || item.etat}
                        </span>
                      </div>

                      {item.description ? <p className={styles.desc}>{item.description}</p> : null}

                      <div className={styles.stockRow}>
                        <div className={styles.stockLabel}>
                          <span>Disponibles / Total</span>
                          <strong>
                            {item.quantite_disponible}/{item.quantite_totale}
                          </strong>
                        </div>
                        <div className={styles.bar} aria-hidden>
                          <div className={barClass} style={{ width: `${ratio}%` }} />
                        </div>
                      </div>

                      <div className={styles.facts}>
                        <div>
                          Lieu : <strong>{item.emplacement || '—'}</strong>
                        </div>
                        {Number(item.emprunts_en_cours) > 0 ? (
                          <div>
                            Empruntés : <strong>{item.emprunts_en_cours}</strong>
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.cardActions}>
                        {canBorrow && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => startBorrow(item)}
                          >
                            Emprunter
                          </button>
                        )}
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
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'emprunts' && (
        <div className={styles.layout}>
          <form className={styles.panel} onSubmit={onBorrow}>
            <div className={styles.panelHead}>
              <h2>Nouvel emprunt</h2>
              <span>Sortie matériel</span>
            </div>

            <div className={styles.formGrid}>
              <div className="form-group">
                <label htmlFor="loan-mat">Matériel</label>
                <select
                  id="loan-mat"
                  required
                  value={loanForm.materiel_id}
                  onChange={(e) => setLoanForm({ ...loanForm, materiel_id: e.target.value })}
                >
                  <option value="">Choisir…</option>
                  {(allItems.length ? allItems : items).map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={Number(m.quantite_disponible) <= 0}
                    >
                      {m.nom} ({m.quantite_disponible} dispo.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="loan-nom">Emprunteur</label>
                <input
                  id="loan-nom"
                  required
                  value={loanForm.emprunteur_nom}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, emprunteur_nom: e.target.value })
                  }
                  placeholder="Nom complet"
                />
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label htmlFor="loan-email">Email</label>
                  <input
                    id="loan-email"
                    type="email"
                    value={loanForm.emprunteur_email}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, emprunteur_email: e.target.value })
                    }
                    placeholder="optionnel"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="loan-tel">Téléphone</label>
                  <input
                    id="loan-tel"
                    value={loanForm.emprunteur_telephone}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, emprunteur_telephone: e.target.value })
                    }
                    placeholder="optionnel"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label htmlFor="loan-qty">Quantité</label>
                  <input
                    id="loan-qty"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={loanForm.quantite}
                    onChange={(e) => setLoanForm({ ...loanForm, quantite: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="loan-date">Date d’emprunt</label>
                  <input
                    id="loan-date"
                    type="date"
                    required
                    value={loanForm.date_emprunt}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, date_emprunt: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="loan-due">Retour prévu</label>
                <input
                  id="loan-due"
                  type="date"
                  value={loanForm.date_retour_prevue}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, date_retour_prevue: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="loan-notes">Notes</label>
                <textarea
                  id="loan-notes"
                  rows={2}
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  placeholder="Motif, projet…"
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '…' : 'Enregistrer l’emprunt'}
                </button>
              </div>
            </div>
          </form>

          <section className={styles.inventory}>
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <h2>Suivi des emprunts</h2>
                <span>{loans.length}</span>
              </div>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${loanFilter === 'en_cours' ? styles.chipActive : ''}`}
                  onClick={() => setLoanFilter('en_cours')}
                >
                  En cours
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${loanFilter === 'retourne' ? styles.chipActive : ''}`}
                  onClick={() => setLoanFilter('retourne')}
                >
                  Retournés
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${!loanFilter ? styles.chipActive : ''}`}
                  onClick={() => setLoanFilter('')}
                >
                  Tous
                </button>
              </div>
            </div>

            {!loans.length ? (
              <div className={styles.empty}>
                <strong>Aucun emprunt</strong>
                Enregistrez une sortie de matériel via le formulaire.
              </div>
            ) : (
              <div className={styles.loanList}>
                {loans.map((loan) => {
                  const overdue = isOverdue(loan);
                  return (
                    <article key={loan.id} className={styles.loanCard}>
                      <div className={styles.loanTop}>
                        <div>
                          <h3 className={styles.loanTitle}>{loan.materiel_nom}</h3>
                          <p className={styles.loanSub}>
                            {loan.emprunteur_nom}
                            {loan.emprunteur_email ? ` · ${loan.emprunteur_email}` : ''}
                          </p>
                        </div>
                        <span
                          className={`${styles.badge} ${
                            loan.statut === 'en_cours'
                              ? overdue
                                ? styles.badge_hors_service
                                : styles.badge_emprunte
                              : styles.badge_disponible
                          }`}
                        >
                          {loan.statut === 'retourne'
                            ? 'Retourné'
                            : overdue
                              ? 'En retard'
                              : 'En cours'}
                        </span>
                      </div>

                      <div className={styles.loanFacts}>
                        <div>
                          Qté : <strong>×{loan.quantite}</strong>
                        </div>
                        <div>
                          Emprunté le : <strong>{fmtDate(loan.date_emprunt)}</strong>
                        </div>
                        <div className={overdue ? styles.overdue : undefined}>
                          Retour prévu : <strong>{fmtDate(loan.date_retour_prevue)}</strong>
                        </div>
                        {loan.date_retour_effectif ? (
                          <div>
                            Retourné le :{' '}
                            <strong>{fmtDate(loan.date_retour_effectif)}</strong>
                          </div>
                        ) : null}
                        {loan.emprunteur_telephone ? (
                          <div>
                            Tél. : <strong>{loan.emprunteur_telephone}</strong>
                          </div>
                        ) : null}
                      </div>

                      {loan.notes ? <p className={styles.desc}>{loan.notes}</p> : null}

                      {loan.statut === 'en_cours' ? (
                        <div className={styles.loanActions}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={saving}
                            onClick={() => onReturn(loan)}
                          >
                            Marquer comme retourné
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </fieldset>
    </div>
  );
}