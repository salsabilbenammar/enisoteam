import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { defaultDateMin, minSelectableDate } from '../../utils/dateLimits';

const empty = {
  titre: '',
  contenu: '',
  date_publication: '',
  salle: '',
  heure: '',
  lien_formulaire: '',
  image: null,
};

export default function ManageAnnouncements() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [dateMin, setDateMin] = useState(() => defaultDateMin());
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/announcements')
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
    const date_publication = String(item.date_publication).slice(0, 10);
    setDateMin(minSelectableDate(date_publication));
    setForm({
      titre: item.titre,
      contenu: item.contenu,
      date_publication,
      salle: item.salle || '',
      heure: item.heure ? String(item.heure).slice(0, 5) : '',
      lien_formulaire: item.lien_formulaire || '',
      image: null,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.titre || !form.contenu || !form.date_publication) {
      setError('Titre, contenu et date sont requis.');
      return;
    }
    const data = new FormData();
    data.append('titre', form.titre);
    data.append('contenu', form.contenu);
    data.append('date_publication', form.date_publication);
    data.append('salle', form.salle.trim());
    data.append('heure', form.heure.trim());
    data.append('lien_formulaire', form.lien_formulaire.trim());
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) await api.put(`/announcements/${editId}`, data);
      else await api.post('/announcements', data);
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
      title: 'Supprimer cette annonce ?',
      message: 'Cette action est définitive. L’annonce ne sera plus visible sur le site.',
    });
    if (!ok) return;
    try {
      await api.delete(`/announcements/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Gérer les annonces</h1>
      </header>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <h3>{editId ? 'Modifier' : 'Nouvelle annonce'}</h3>
        <div className="form-row two">
          <div className="form-group">
            <label>Titre</label>
            <input
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Date de publication</label>
            <input
              type="date"
              value={form.date_publication}
              onChange={(e) => setForm({ ...form, date_publication: e.target.value })}
              min={dateMin}
              required
            />
          </div>
        </div>
        <div className="form-row two">
          <div className="form-group">
            <label>Salle (optionnel)</label>
            <input
              value={form.salle}
              onChange={(e) => setForm({ ...form, salle: e.target.value })}
              placeholder="Ex. Amphi A"
            />
          </div>
          <div className="form-group">
            <label>Heure (optionnel)</label>
            <input
              type="time"
              value={form.heure}
              onChange={(e) => setForm({ ...form, heure: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Contenu</label>
          <textarea
            value={form.contenu}
            onChange={(e) => setForm({ ...form, contenu: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Image (optionnel)</label>
          <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files[0] })} />
        </div>
        <div className="form-group">
          <label>Lien formulaire Google Docs (optionnel)</label>
          <input
            type="url"
            value={form.lien_formulaire}
            onChange={(e) => setForm({ ...form, lien_formulaire: e.target.value })}
            placeholder="https://docs.google.com/forms/..."
          />
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
              <th>Salle</th>
              <th>Heure</th>
              <th>Image</th>
              <th>Formulaire</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.date_publication).toLocaleDateString('fr-FR')}</td>
                <td>{item.titre}</td>
                <td>{item.salle || '—'}</td>
                <td>
                  {item.heure
                    ? String(item.heure).slice(0, 5)
                    : '—'}
                </td>
                <td>
                  {item.image ? (
                    <img src={assetUrl(item.image)} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {item.lien_formulaire ? (
                    <a href={item.lien_formulaire} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-bright)', fontSize: '0.85rem' }}>
                      Lien
                    </a>
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
        {items.length === 0 && <div className="empty">Aucune annonce.</div>}
      </div>
    </div>
  );
}
