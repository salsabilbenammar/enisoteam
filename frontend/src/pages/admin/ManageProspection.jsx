import { useEffect, useMemo, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import NewFormLaunch from '../../components/admin/NewFormLaunch';
import { useAuth } from '../../context/AuthContext';
import styles from './ManageProspection.module.css';

const empty = {
  titre: '',
  description: '',
  annee: '',
  ordre_affichage: 0,
  audience: 'public',
  image: null,
};

export default function ManageProspection() {
  const { canEdit } = useAuth();
  const canEditPage = canEdit('prospection');
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get('/prospection')
      .then((res) => setItems(res.data))
      .catch(() => setError('Chargement impossible.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const yearsCovered = useMemo(() => {
    const set = new Set(items.map((i) => i.annee).filter(Boolean));
    return set.size;
  }, [items]);

  const withImage = useMemo(() => items.filter((i) => i.image).length, [items]);

  const reset = () => {
    setForm(empty);
    setEditId(null);
    setPreview(null);
    setComposing(false);
  };

  const startNew = () => {
    setForm(empty);
    setEditId(null);
    setPreview(null);
    setError('');
    setSuccess('');
    setComposing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onEdit = (item) => {
    setEditId(item.id);
    setForm({
      titre: item.titre,
      description: item.description || '',
      annee: item.annee || '',
      ordre_affichage: item.ordre_affichage ?? 0,
      audience: item.audience === 'membres' ? 'membres' : 'public',
      image: null,
    });
    setPreview(item.image ? assetUrl(item.image) : null);
    setError('');
    setSuccess('');
    setComposing(true);
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
    if (!form.titre.trim()) {
      setError('Le titre est requis.');
      return;
    }

    const data = new FormData();
    data.append('titre', form.titre.trim());
    data.append('description', form.description);
    data.append('annee', form.annee);
    data.append('ordre_affichage', form.ordre_affichage);
    data.append('audience', form.audience === 'membres' ? 'membres' : 'public');
    if (form.image) data.append('image', form.image);

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/prospection/${editId}`, data);
        setSuccess('Réalisation mise à jour.');
      } else {
        await api.post('/prospection', data);
        setSuccess('Réalisation ajoutée.');
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
      title: 'Supprimer cette réalisation ?',
      message: 'Elle disparaîtra de la page publique Prospection.',
    });
    if (!ok) return;
    try {
      await api.delete(`/prospection/${id}`);
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
        <p className={styles.eyebrow}>Partenariats</p>
        <h1>Réalisations prospection</h1>
        <p>
          Publiez les projets et collaborations obtenus. La page publique n’apparaît qu’à partir
          d’une réalisation.
        </p>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Réalisations</span>
          <strong>{items.length}</strong>
        </div>
        <div className={`${styles.stat} ${items.length ? styles.statOk : ''}`}>
          <span>Page publique</span>
          <strong>{items.length ? 'Visible' : 'Masquée'}</strong>
        </div>
        <div className={styles.stat}>
          <span>Années / images</span>
          <strong>
            {yearsCovered} · {withImage}
          </strong>
        </div>
      </div>

      <ReadOnlyBanner module="prospection" />
      <fieldset
        disabled={!canEditPage}
        style={{ border: 0, padding: 0, margin: 0, minInlineSize: 0 }}
      >
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!composing ? (
          <NewFormLaunch
            title="Formulaire vierge"
            subtitle="Nouvelle réalisation prospection"
            onCreate={startNew}
            disabled={!canEditPage}
          />
        ) : (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2>{editId ? 'Modifier la réalisation' : 'Nouvelle réalisation'}</h2>
                <p>Titre, année, description et image pour le site public.</p>
              </div>
              <span className={styles.badge}>{editId ? 'Édition' : 'Création'}</span>
            </div>

            <form className={styles.formLayout} onSubmit={onSubmit}>
              <label
                className={`${styles.dropzone} ${preview ? styles.dropzoneHasImage : ''}`}
                aria-label="Image de la réalisation"
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
                    <label htmlFor="pros-titre">Titre</label>
                    <input
                      id="pros-titre"
                      value={form.titre}
                      onChange={(e) => setForm({ ...form, titre: e.target.value })}
                      placeholder="Ex. Partenariat entreprise X"
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="pros-annee">Année</label>
                    <input
                      id="pros-annee"
                      type="number"
                      min="2000"
                      max="2100"
                      value={form.annee}
                      onChange={(e) => setForm({ ...form, annee: e.target.value })}
                      placeholder="2026"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="pros-ordre">Ordre</label>
                    <input
                      id="pros-ordre"
                      type="number"
                      value={form.ordre_affichage}
                      onChange={(e) => setForm({ ...form, ordre_affichage: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="pros-desc">Description</label>
                  <textarea
                    id="pros-desc"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Contexte, résultat, impact…"
                  />
                </div>

                <div className={styles.field}>
                  <label>Visible pour</label>
                  <div className={styles.audienceRow}>
                    <label className={styles.audienceChoice}>
                      <input
                        type="radio"
                        name="pros-audience"
                        checked={form.audience === 'public'}
                        onChange={() => setForm({ ...form, audience: 'public' })}
                      />
                      Tout le monde
                    </label>
                    <label className={styles.audienceChoice}>
                      <input
                        type="radio"
                        name="pros-audience"
                        checked={form.audience === 'membres'}
                        onChange={() => setForm({ ...form, audience: 'membres' })}
                      />
                      Membres uniquement
                    </label>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : editId ? 'Enregistrer' : 'Publier'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={reset}>
                    Fermer
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        <div className={styles.sectionTitle}>
          <h2>Galerie des réalisations</h2>
          <span>{items.length} élément{items.length > 1 ? 's' : ''}</span>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            Aucune réalisation pour l’instant. Publiez-en une pour afficher la page publique.
          </div>
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
                  {item.annee ? <span className={styles.year}>{item.annee}</span> : null}
                  <span className={styles.year}>
                    {item.audience === 'membres' ? 'Membres' : 'Public'}
                  </span>
                  <h3>{item.titre}</h3>
                  {item.description ? <p>{item.description}</p> : null}
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
