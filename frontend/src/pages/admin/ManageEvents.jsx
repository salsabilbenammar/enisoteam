import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import FormQuestionPicker from '../../components/admin/FormQuestionPicker';
import { toApiFields } from '../../data/formQuestionBank';
import { minSelectableDateTime } from '../../utils/dateLimits';

const empty = {
  titre: '',
  description: '',
  date: '',
  lieu: '',
  statut: 'a_venir',
  image: null,
  formulaire_type: 'individuel',
  accompagnants_min: 1,
  accompagnants_max: 3,
  champs_personnalises: [],
};

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formTypeLabel(type) {
  return type === 'avec_accompagnants' ? 'Avec accompagnants' : 'Individuel';
}

function formatCompanions(list) {
  if (!Array.isArray(list) || !list.length) return '—';
  return list.map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim()).join(', ');
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

export default function ManageEvents() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [regs, setRegs] = useState(null);
  const [regsTitle, setRegsTitle] = useState('');
  const [regsMeta, setRegsMeta] = useState({ type: 'individuel', fields: [] });

  const load = () =>
    api
      .get('/events')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditId(null);
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({
      titre: item.titre,
      description: item.description,
      date: toLocalInput(item.date),
      lieu: item.lieu || '',
      statut: item.statut || 'a_venir',
      image: null,
      formulaire_type: item.formulaire_type || 'individuel',
      accompagnants_min: item.accompagnants_min ?? 1,
      accompagnants_max: item.accompagnants_max ?? 3,
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
    const data = new FormData();
    data.append('titre', form.titre);
    data.append('description', form.description);
    data.append('date', form.date.replace('T', ' ') + ':00');
    data.append('lieu', form.lieu);
    data.append('statut', form.statut);
    data.append('formulaire_type', form.formulaire_type);
    data.append('accompagnants_min', String(form.accompagnants_min));
    data.append('accompagnants_max', String(form.accompagnants_max));
    data.append('champs_personnalises', JSON.stringify(toApiFields(form.champs_personnalises)));
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) await api.put(`/events/${editId}`, data);
      else await api.post('/events', data);
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
      title: 'Supprimer cet événement ?',
      message: 'Cette action est définitive. L’événement ne sera plus visible sur le site.',
    });
    if (!ok) return;
    try {
      await api.delete(`/events/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  const toggleInscription = async (item) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/events/${item.id}/inscription`, {
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
    try {
      const { data } = await api.get(`/events/${item.id}/registrations`);
      setRegs(data);
      setRegsTitle(item.titre);
      setRegsMeta({
        type: item.formulaire_type || 'individuel',
        fields: item.champs_personnalises || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement des inscrits impossible.');
    }
  };

  if (loading) return <Loader />;

  const isGroup = form.formulaire_type === 'avec_accompagnants';

  return (
    <div>
      <header className="page-header">
        <h1>Gérer les événements</h1>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <h3>{editId ? 'Modifier' : 'Nouvel événement'}</h3>
        <div className="form-row two">
          <div className="form-group">
            <label>Titre</label>
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Date & heure</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              min={minSelectableDateTime(form.date)}
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
            <label>Lieu</label>
            <input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Statut</label>
            <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              <option value="a_venir">À venir</option>
              <option value="passe">Passé</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Image</label>
          <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
        </div>

        <hr style={{ margin: '1rem 0', border: 0, borderTop: '1px solid var(--border, #ddd)' }} />
        <h4 style={{ marginTop: 0 }}>Formulaire d&apos;inscription</h4>
        <div className="form-group">
          <label>Type de formulaire</label>
          <select
            value={form.formulaire_type}
            onChange={(e) => setForm({ ...form, formulaire_type: e.target.value })}
          >
            <option value="individuel">Individuel (1 personne)</option>
            <option value="avec_accompagnants">Avec accompagnants / groupe</option>
          </select>
        </div>
        {isGroup && (
          <div className="form-row two">
            <div className="form-group">
              <label>Nombre min. d&apos;accompagnants</label>
              <input
                type="number"
                min={0}
                value={form.accompagnants_min}
                onChange={(e) =>
                  setForm({ ...form, accompagnants_min: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Nombre max. d&apos;accompagnants</label>
              <input
                type="number"
                min={1}
                value={form.accompagnants_max}
                onChange={(e) =>
                  setForm({ ...form, accompagnants_max: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>
        )}

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
              <th>Formulaire</th>
              <th>Statut</th>
              <th>Inscriptions</th>
              <th>Inscrits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleString('fr-FR')}</td>
                <td>{item.titre}</td>
                <td>
                  {formTypeLabel(item.formulaire_type)}
                  {item.formulaire_type === 'avec_accompagnants'
                    ? ` (${item.accompagnants_min}–${item.accompagnants_max})`
                    : ''}
                  {(item.champs_personnalises || []).length
                    ? ` · ${item.champs_personnalises.length} champ(s)`
                    : ''}
                </td>
                <td>{item.statut}</td>
                <td>
                  <button
                    type="button"
                    className={`btn btn-sm ${item.inscription_ouverte ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleInscription(item)}
                  >
                    {item.inscription_ouverte ? 'Ouvert' : 'Fermé'}
                  </button>
                </td>
                <td>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openRegs(item)}>
                    Voir les inscrits ({Number(item.inscriptions_count || 0)})
                  </button>
                </td>
                <td className="actions">
                  {item.image ? (
                    <img
                      src={assetUrl(item.image)}
                      alt=""
                      style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
                    />
                  ) : null}
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

      {regs && (
        <div
          className="card"
          style={{ marginTop: '1.25rem' }}
          role="dialog"
          aria-label={`Inscrits — ${regsTitle}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Inscrits — {regsTitle}</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRegs(null)}>
              Fermer
            </button>
          </div>
          {!regs.length ? (
            <p className="empty">Aucune inscription.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Filière</th>
                    {regsMeta.type === 'avec_accompagnants' && <th>Accompagnants</th>}
                    {(regsMeta.fields || []).length > 0 && <th>Réponses</th>}
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.prenom} {r.nom}
                      </td>
                      <td>{r.email}</td>
                      <td>{r.telephone}</td>
                      <td>{r.filiere || '—'}</td>
                      {regsMeta.type === 'avec_accompagnants' && (
                        <td>{formatCompanions(r.accompagnants)}</td>
                      )}
                      {(regsMeta.fields || []).length > 0 && (
                        <td>{formatAnswers(r.reponses_personnalisees, regsMeta.fields)}</td>
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
