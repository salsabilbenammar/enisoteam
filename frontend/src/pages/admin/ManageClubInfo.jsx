import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import {
  DEFAULT_AXES,
  isAxesSection,
  parseAxes,
  serializeAxes,
} from '../../utils/clubAxes';

const empty = { titre: '', contenu: '', image: null, existingMedia: null };

export default function ManageClubInfo() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [axes, setAxes] = useState([...DEFAULT_AXES]);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const editingAxes = isAxesSection(form.titre);

  const load = () =>
    api
      .get('/club-info')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setAxes([...DEFAULT_AXES]);
    setEditId(null);
    setShowForm(false);
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({ titre: item.titre, contenu: item.contenu, image: null, existingMedia: item.image || null });
    if (isAxesSection(item.titre)) {
      setAxes(parseAxes(item.contenu));
    }
    setShowForm(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onNew = () => {
    setEditId(null);
    setForm({ ...empty, existingMedia: null });
    setAxes([{ titre: '', description: '' }]);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const updateAxe = (index, field, value) => {
    setAxes((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const addAxe = () => setAxes((prev) => [...prev, { titre: '', description: '' }]);

  const removeAxe = (index) => {
    setAxes((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let contenu = form.contenu;
    if (isAxesSection(form.titre)) {
      const cleaned = axes.filter((a) => a.titre.trim() || a.description.trim());
      if (!cleaned.length) {
        setError('Ajoutez au moins un axe.');
        return;
      }
      contenu = serializeAxes(cleaned);
    }

    const data = new FormData();
    data.append('titre', form.titre);
    data.append('contenu', contenu);
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId != null) {
        await api.put(`/club-info/${editId}`, data);
        setSuccess('Section mise à jour.');
      } else {
        await api.post('/club-info', data);
        setSuccess('Section ajoutée.');
      }
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
      title: 'Supprimer cette section ?',
      message: 'Cette action est définitive. La section disparaîtra de la page À propos.',
    });
    if (!ok) return;
    try {
      await api.delete(`/club-info/${id}`);
      if (editId === id) reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Contenu « À propos »</h1>
        <p>Modifiez Histoire, Mission et Nos Axes affichés sur le site public.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="actions" style={{ marginBottom: '1.25rem' }}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Nouvelle section
        </button>
      </div>

      {showForm && (
        <form className="card form" onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
          <h3>{editId ? 'Modifier la section' : 'Nouvelle section'}</h3>
          <div className="form-group">
            <label>Titre</label>
            <input
              value={form.titre}
              onChange={(e) => {
                const titre = e.target.value;
                setForm({ ...form, titre });
                if (isAxesSection(titre) && !isAxesSection(form.titre)) {
                  setAxes(parseAxes(form.contenu));
                }
              }}
              required
            />
          </div>

          {editingAxes ? (
            <div className="form-group">
              <label>Axes (points cliquables)</label>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {axes.map((axe, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{ padding: '1rem', margin: 0, boxShadow: 'none' }}
                  >
                    <div className="form-group">
                      <label>Nom de l&apos;axe {i + 1}</label>
                      <input
                        value={axe.titre}
                        onChange={(e) => updateAxe(i, 'titre', e.target.value)}
                        placeholder="Ex : Travail d'équipe"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={axe.description}
                        onChange={(e) => updateAxe(i, 'description', e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    {axes.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeAxe(i)}
                      >
                        Supprimer cet axe
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addAxe}>
                  + Ajouter un axe
                </button>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Paragraphe</label>
              <textarea
                value={form.contenu}
                onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                required
                rows={10}
                style={{ minHeight: 220 }}
              />
            </div>
          )}

          {!editingAxes && (
            <div className="form-group">
              <label>Photo ou vidéo</label>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Pour Histoire et Mission : ajoutez une image (JPG/PNG) ou une vidéo (MP4/WebM, max 40 Mo).
              </p>
              {form.existingMedia && !form.image && (
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
                  Média actuel : <code>{form.existingMedia}</code>
                </p>
              )}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
              />
            </div>
          )}

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Créer'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid" style={{ gap: '1rem' }}>
        {items
          .filter((item) => !(showForm && editId != null && Number(item.id) === Number(editId)))
          .map((item) => (
            <article key={item.id} className="card">
              <h3>{isAxesSection(item.titre) ? 'Nos Axes' : item.titre}</h3>
              {item.image && (
                <img
                  src={assetUrl(item.image)}
                  alt=""
                  style={{ maxHeight: 120, borderRadius: 8, marginBottom: '0.75rem' }}
                />
              )}
              {isAxesSection(item.titre) ? (
                <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
                  {parseAxes(item.contenu).map((a, i) => (
                    <li key={i}>{a.titre}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{item.contenu}</p>
              )}
              <div className="actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
