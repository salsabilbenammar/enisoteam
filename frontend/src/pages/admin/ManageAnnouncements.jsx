import { useEffect, useMemo, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { useAuth } from '../../context/AuthContext';
import { defaultDateMin, minSelectableDate } from '../../utils/dateLimits';
import styles from './ManageAnnouncements.module.css';

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
  const { canEdit } = useAuth();
  const canEditPage = canEdit('announcements');
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [dateMin, setDateMin] = useState(() => defaultDateMin());
  const [editId, setEditId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const withImage = useMemo(() => items.filter((i) => i.image).length, [items]);
  const withForm = useMemo(() => items.filter((i) => i.lien_formulaire).length, [items]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setPreview(null);
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
    setPreview(item.image ? assetUrl(item.image) : null);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
      setSuccess(editId ? 'Annonce mise à jour.' : 'Annonce publiée.');
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
      title: 'Supprimer cette annonce ?',
      message: 'Cette action est définitive. L’annonce ne sera plus visible sur le site.',
    });
    if (!ok) return;
    try {
      await api.delete(`/announcements/${id}`);
      if (editId === id) reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <p className={styles.eyebrow}>Secrétariat</p>
        <h1>Annonces</h1>
        <p>
          Publiez les informations du club. Visibles uniquement par les membres connectés et le
          bureau.
        </p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Annonces</span>
          <strong>{items.length}</strong>
        </div>
        <div className={styles.stat}>
          <span>Avec image</span>
          <strong>{withImage}</strong>
        </div>
        <div className={styles.stat}>
          <span>Avec formulaire</span>
          <strong>{withForm}</strong>
        </div>
      </div>

      <ReadOnlyBanner module="announcements" />
      <fieldset
        disabled={!canEditPage}
        style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}
      >
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>{editId ? 'Modifier l’annonce' : 'Nouvelle annonce'}</h2>
              <p>Titre, date, lieu, contenu et affiche pour les membres.</p>
            </div>
            <span className={styles.badge}>{editId ? 'Édition' : 'Création'}</span>
          </div>

          <form className={styles.formLayout} onSubmit={onSubmit}>
            <label
              className={`${styles.dropzone} ${preview ? styles.dropzoneHasImage : ''}`}
              aria-label="Image de l’annonce"
            >
              {preview ? (
                <img src={preview} alt="" />
              ) : (
                <div className={styles.dropHint}>
                  <strong>Ajouter une image</strong>
                  <span>JPG, PNG ou WebP</span>
                </div>
              )}
              <input
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={onFile}
              />
            </label>

            <div className={styles.fields}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="ann-titre">Titre</label>
                  <input
                    id="ann-titre"
                    value={form.titre}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                    placeholder="Ex. Réunion générale"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="ann-date">Date de publication</label>
                  <input
                    id="ann-date"
                    type="date"
                    value={form.date_publication}
                    onChange={(e) => setForm({ ...form, date_publication: e.target.value })}
                    min={dateMin}
                    required
                  />
                </div>
              </div>

              <div className={styles.row3}>
                <div className={styles.field}>
                  <label htmlFor="ann-salle">Salle</label>
                  <input
                    id="ann-salle"
                    value={form.salle}
                    onChange={(e) => setForm({ ...form, salle: e.target.value })}
                    placeholder="Ex. Amphi A"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="ann-heure">Heure</label>
                  <input
                    id="ann-heure"
                    type="time"
                    value={form.heure}
                    onChange={(e) => setForm({ ...form, heure: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="ann-lien">Lien formulaire</label>
                  <input
                    id="ann-lien"
                    type="url"
                    value={form.lien_formulaire}
                    onChange={(e) => setForm({ ...form, lien_formulaire: e.target.value })}
                    placeholder="https://docs.google.com/forms/…"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="ann-contenu">Contenu</label>
                <textarea
                  id="ann-contenu"
                  rows={5}
                  value={form.contenu}
                  onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                  placeholder="Détails de l’annonce…"
                  required
                />
              </div>

              <div className={styles.actions}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Publier'}
                </button>
                {editId && (
                  <button type="button" className="btn btn-secondary" onClick={reset}>
                    Annuler
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>

        <div className={styles.sectionTitle}>
          <h2>Annonces publiées</h2>
          <span>
            {items.length} élément{items.length > 1 ? 's' : ''}
          </span>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>Aucune annonce pour le moment.</div>
        ) : (
          <div className={styles.grid}>
            {items.map((item, index) => (
              <article
                key={item.id}
                className={styles.card}
                style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
              >
                <div className={styles.media}>
                  {item.image ? (
                    <img src={assetUrl(item.image)} alt="" />
                  ) : (
                    <div className={styles.mediaEmpty}>Sans image</div>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.meta}>
                    <span className={styles.chip}>
                      {new Date(item.date_publication).toLocaleDateString('fr-FR')}
                    </span>
                    {item.salle ? <span className={styles.chip}>{item.salle}</span> : null}
                    {item.heure ? (
                      <span className={styles.chip}>{String(item.heure).slice(0, 5)}</span>
                    ) : null}
                  </div>
                  <h3>{item.titre}</h3>
                  <p>{item.contenu}</p>
                  {item.lien_formulaire ? (
                    <a
                      className={styles.link}
                      href={item.lien_formulaire}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir le formulaire →
                    </a>
                  ) : null}
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEdit(item)}
                  >
                    Modifier
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
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
