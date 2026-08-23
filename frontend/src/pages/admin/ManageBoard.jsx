import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { BOARD_ROLES, mergeBoardMembers } from '../../data/boardRoles';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import styles from './ManageBoard.module.css';

function getPhotoPreview(photoConfig) {
  if (!photoConfig) return null;
  return photoConfig.fromApi ? assetUrl(photoConfig.src) : photoConfig.src;
}

const emptyForm = () => ({
  nom: '',
  poste: BOARD_ROLES[0].label,
  description: BOARD_ROLES[0].description,
  email: '',
  telephone: '',
  facebook: '',
  ordre_affichage: BOARD_ROLES[0].ordre,
  photo: null,
  photoPreview: null,
  dbId: null,
});

export default function ManageBoard() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('board');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [boardTitle, setBoardTitle] = useState('Bureau Exécutif 2026/2027');
  const [savingTitle, setSavingTitle] = useState(false);

  const load = () =>
    Promise.all([
      api.get('/board').then((res) => setItems(mergeBoardMembers(res.data))),
      api
        .get('/site-settings')
        .then((res) => setBoardTitle(res.data.board_title || 'Bureau Exécutif 2026/2027'))
        .catch(() => {}),
    ])
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const saveTitle = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const title = boardTitle.trim();
    if (!title) {
      setError('Le titre du bureau est requis.');
      return;
    }
    setSavingTitle(true);
    try {
      const { data } = await api.put('/site-settings', { board_title: title });
      setBoardTitle(data.board_title || title);
      setSuccess('Titre du bureau mis à jour.');
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible d\'enregistrer le titre.');
    } finally {
      setSavingTitle(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setShowForm(false);
    setError('');
  };

  const onEdit = (item) => {
    const isDbRecord = typeof item.id === 'number';
    setForm({
      nom: item.nom === 'À pourvoir' ? '' : item.nom,
      poste: item.poste,
      description: item.description || '',
      email: item.email || '',
      telephone: item.telephone || '',
      facebook: item.facebook || '',
      ordre_affichage: item.ordre_affichage ?? 0,
      photo: null,
      photoPreview: getPhotoPreview(item.photoConfig),
      dbId: isDbRecord ? item.id : null,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({
      ...f,
      photo: file,
      photoPreview: URL.createObjectURL(file),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.poste) {
      setError('Le poste est requis.');
      return;
    }

    const data = new FormData();
    data.append('nom', form.nom.trim() || 'À pourvoir');
    data.append('poste', form.poste);
    data.append('description', form.description);
    data.append('email', form.email);
    data.append('telephone', form.telephone);
    data.append('facebook', form.facebook);
    data.append('ordre_affichage', form.ordre_affichage);
    if (form.photo) data.append('photo', form.photo);

    setSaving(true);
    try {
      if (form.dbId) {
        await api.put(`/board/${form.dbId}`, data);
        setSuccess('Membre mis à jour avec succès.');
      } else {
        await api.post('/board', data);
        setSuccess('Membre enregistré avec succès.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <header className="page-header">
        <h1>Gérer le bureau</h1>
        <p>Modifiez le titre de la page Bureau et les postes (nom, photo, téléphone, Facebook).</p>
      </header>

      <ReadOnlyBanner module="board" />

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <fieldset disabled={!canEditPage} style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}>
      <form className={`card form ${styles.form}`} onSubmit={saveTitle} style={{ marginBottom: '1.5rem' }}>
        <h3>Titre de la page Bureau</h3>
        <div className="form-group">
          <label htmlFor="board_title">Titre affiché sur le site</label>
          <input
            id="board_title"
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            placeholder="Bureau Exécutif 2026/2027"
            required
          />
        </div>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={savingTitle}>
            {savingTitle ? 'Enregistrement…' : 'Enregistrer le titre'}
          </button>
        </div>
      </form>

      {showForm && (
        <form className={`card form ${styles.form}`} onSubmit={onSubmit}>
          <h3>Modifier — {form.poste}</h3>

          <div className={styles.formLayout}>
            <div className={styles.previewBox}>
              {form.photoPreview ? (
                <img src={form.photoPreview} alt="Aperçu" className={styles.previewImg} />
              ) : (
                <div className={styles.previewPlaceholder}>Aucune photo</div>
              )}
              <p className={styles.previewHint}>Aperçu de la photo</p>
            </div>

            <div className={styles.fields}>
              <div className="form-group">
                <label>Poste</label>
                <input value={form.poste} readOnly />
              </div>
              <div className="form-group">
                <label>Nom du responsable</label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex : Prénom Nom"
                />
              </div>
              <div className="form-group">
                <label>Email (optionnel)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="Ex : 96295048"
                />
              </div>
              <div className="form-group">
                <label>Lien Facebook</label>
                <input
                  type="url"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  placeholder="https://www.facebook.com/..."
                />
              </div>
              <div className="form-group">
                <label>Photo du responsable</label>
                <input type="file" accept="image/*" onChange={onPhotoChange} />
                <span className={styles.fileHint}>JPG, PNG ou WebP — max 5 Mo</span>
              </div>
              <div className="form-group">
                <label>Description du poste</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={`card ${styles.memberCard}`}>
            <div className={styles.cardPhoto}>
              {item.photoConfig ? (
                <img
                  src={getPhotoPreview(item.photoConfig)}
                  alt={item.nom}
                  style={{ objectPosition: item.photoConfig.position || 'center center' }}
                />
              ) : (
                <span>?</span>
              )}
            </div>
            <span className="badge badge-accent">{item.poste}</span>
            <h3>{item.nom}</h3>
            {(item.telephone || item.facebook) && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0.75rem' }}>
                {item.telephone && <span>☎ {item.telephone}</span>}
                {item.telephone && item.facebook && ' · '}
                {item.facebook && <span>Facebook</span>}
              </p>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>
              Modifier
            </button>
          </article>
        ))}
      </div>
      </fieldset>
    </div>
  );
}
