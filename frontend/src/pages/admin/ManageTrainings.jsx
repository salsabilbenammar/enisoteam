import { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';

const empty = {
  titre: '',
  description: '',
  date: '',
  formateur: '',
  niveau: 'debutant',
  lien: '',
};

export default function ManageTrainings() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({
      titre: item.titre,
      description: item.description,
      date: String(item.date).slice(0, 10),
      formateur: item.formateur || '',
      niveau: item.niveau || 'debutant',
      lien: item.lien || '',
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editId) await api.put(`/trainings/${editId}`, form);
      else await api.post('/trainings', form);
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

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Gérer les formations</h1>
      </header>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <h3>{editId ? 'Modifier' : 'Nouvelle formation'}</h3>
        <div className="form-row two">
          <div className="form-group">
            <label>Titre</label>
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
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
          <label>Lien ressources</label>
          <input value={form.lien} onChange={(e) => setForm({ ...form, lien: e.target.value })} />
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
              <th>Niveau</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                <td>{item.titre}</td>
                <td>{item.niveau}</td>
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
