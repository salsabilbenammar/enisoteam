import { useEffect, useRef, useState } from 'react';
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
  champs_personnalises: [],
};

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
  const [regsLoading, setRegsLoading] = useState(false);
  const [regsFields, setRegsFields] = useState([]);

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
    setRegsFields(item.champs_personnalises || []);
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
        <div className="form-group">
          <label>Lien ressources (membres)</label>
          <input value={form.lien} onChange={(e) => setForm({ ...form, lien: e.target.value })} />
        </div>
        <div className="form-row two">
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
                  })
                }
              />
              Formation payante
            </label>
          </div>
          {form.payante && (
            <div className="form-group">
              <label>Montant (ex. 30 DT)</label>
              <input
                value={form.prix}
                onChange={(e) => setForm({ ...form, prix: e.target.value })}
                required
                placeholder="30 DT"
              />
            </div>
          )}
        </div>

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
              <th>Inscriptions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                <td>{item.titre}</td>
                <td>{item.niveau}</td>
                <td>{item.payante ? item.prix || 'Payante' : 'Gratuite'}</td>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Prénom</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Filière</th>
                    <th>Niveau</th>
                    {regsPaid && <th>Accepte paiement</th>}
                    {regsFields.length > 0 && <th>Réponses</th>}
                    <th>Date d&apos;inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <td>{r.prenom}</td>
                      <td>{r.nom}</td>
                      <td>{r.email}</td>
                      <td>{r.telephone}</td>
                      <td>{r.filiere || '—'}</td>
                      <td>{r.annee || '—'}</td>
                      {regsPaid && (
                        <td>
                          {Number(r.accepte_paiement) === 1 || r.accepte_paiement === true
                            ? 'Oui'
                            : 'Non'}
                        </td>
                      )}
                      {regsFields.length > 0 && (
                        <td>{formatAnswers(r.reponses_personnalisees, regsFields)}</td>
                      )}
                      <td>{new Date(r.created_at).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
