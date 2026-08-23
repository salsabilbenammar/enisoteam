import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import styles from './ManageGallery.module.css';

const empty = { titre: '', description: '', ordre_affichage: 0, image: null };

export default function ManageGallery() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('gallery');
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState('image');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/gallery')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setPreview(null);
    setPreviewType('image');
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({
      titre: item.titre,
      description: item.description || '',
      ordre_affichage: item.ordre_affichage ?? 0,
      image: null,
    });
    setPreview(assetUrl(item.image));
    setPreviewType(item.media_type === 'video' ? 'video' : 'image');
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setForm((f) => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
    setPreviewType(isVideo ? 'video' : 'image');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.titre.trim()) {
      setError('Le titre est requis.');
      return;
    }
    if (!editId && !form.image) {
      setError('Ajoutez une photo ou une vidéo.');
      return;
    }

    const data = new FormData();
    data.append('titre', form.titre.trim());
    data.append('description', form.description);
    data.append('ordre_affichage', form.ordre_affichage);
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/gallery/${editId}`, data);
        setSuccess('Média mis à jour.');
      } else {
        await api.post('/gallery', data);
        setSuccess('Média ajouté au slider d\'accueil.');
      }
      reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce média ?',
      message: 'Cette action est définitive. Le média disparaîtra du carrousel d’accueil.',
    });
    if (!ok) return;
    try {
      await api.delete(`/gallery/${id}`);
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
        <h1>Médias accueil</h1>
        <p>
          Photos et vidéos du carrousel à droite sur la page d&apos;accueil (défilement automatique).
        </p>
      </header>

      <ReadOnlyBanner module="gallery" />
      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className={`card form ${styles.form}`} onSubmit={onSubmit}>
        <h3>{editId ? 'Modifier le média' : 'Ajouter une photo ou une vidéo'}</h3>
        <div className={styles.layout}>
          <div className={styles.preview}>
            {preview ? (
              previewType === 'video' ? (
                <video src={preview} controls muted playsInline />
              ) : (
                <img src={preview} alt="Aperçu" />
              )
            ) : (
              <div className={styles.placeholder}>Aperçu</div>
            )}
          </div>
          <div className={styles.fields}>
            <div className="form-group">
              <label>Titre</label>
              <input
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex : Compétition RoboCup"
                required
              />
            </div>
            <div className="form-group">
              <label>Description (optionnel)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Légende courte"
              />
            </div>
            <div className="form-group">
              <label>Ordre d&apos;affichage</label>
              <input
                type="number"
                value={form.ordre_affichage}
                onChange={(e) => setForm({ ...form, ordre_affichage: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Fichier {editId ? '(laisser vide pour conserver)' : ''}</label>
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={onFile} />
              <span className={styles.hint}>Images jusqu&apos;à 5 Mo · Vidéos MP4/WebM jusqu&apos;à 40 Mo</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Ajouter'}
          </button>
          {editId && (
            <button type="button" className="btn btn-secondary" onClick={reset}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={`card ${styles.item}`}>
            {item.media_type === 'video' ? (
              <video src={assetUrl(item.image)} muted playsInline />
            ) : (
              <img src={assetUrl(item.image)} alt={item.titre} />
            )}
            <div className={styles.meta}>
              <span className="badge badge-accent">{item.media_type === 'video' ? 'Vidéo' : 'Photo'}</span>
              <h3>{item.titre}</h3>
            </div>
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
      {items.length === 0 && <div className="empty">Aucun média dans le slider.</div>}
    </fieldset>
    </div>
  );
}