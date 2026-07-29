import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';

const empty = {
  titre: '',
  description: '',
  date: '',
  lieu: '',
  statut: 'a_venir',
  image: null,
};

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManageEvents() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) await api.put(`/events/${editId}`, data);
      else await api.post('/events', data);
      reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
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

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Gérer les événements</h1>
      </header>
      {error && <div className="alert alert-error">{error}</div>}

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
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
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
              <th>Statut</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleString('fr-FR')}</td>
                <td>{item.titre}</td>
                <td>{item.statut}</td>
                <td>
                  {item.image ? (
                    <img src={assetUrl(item.image)} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="actions">
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
    </div>
  );
}
