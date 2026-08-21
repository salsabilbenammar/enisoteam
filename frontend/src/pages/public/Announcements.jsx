import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './Deplacements.module.css';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/announcements')
      .then((res) => setItems(res.data || []))
      .catch(() => setError('Impossible de charger les annonces.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Annonces</h1>
          <p>Cliquez sur une affiche pour voir plus de détails.</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.posterGrid}>
          {items.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.posterCard}
              onClick={() => setSelected(a)}
              aria-label={`Voir les détails de ${a.titre}`}
            >
              {a.image ? (
                <img
                  src={assetUrl(a.image)}
                  alt={a.titre}
                  className={styles.posterImg}
                />
              ) : (
                <div className={styles.posterFallback}>
                  <span className={styles.fallbackEyebrow}>ENISO Team</span>
                  <strong>{a.titre}</strong>
                  {a.date_publication && (
                    <span>
                      {new Date(a.date_publication).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              )}
              <span className={styles.posterHint}>Voir plus</span>
            </button>
          ))}
        </div>

        {!error && items.length === 0 && (
          <div className="empty">Aucune annonce pour le moment.</div>
        )}
      </div>

      {selected && (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="annonce-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              onClick={() => setSelected(null)}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className={styles.modalLayout}>
              <div className={styles.modalPoster}>
                {selected.image ? (
                  <img src={assetUrl(selected.image)} alt={selected.titre} />
                ) : (
                  <div className={styles.posterFallback}>
                    <span className={styles.fallbackEyebrow}>ENISO Team</span>
                    <strong>{selected.titre}</strong>
                  </div>
                )}
              </div>

              <div className={styles.modalBody}>
                <p className={styles.eyebrow}>Annonce</p>
                <h2 id="annonce-detail-title">{selected.titre}</h2>

                <div className={styles.metaRow}>
                  {selected.date_publication && (
                    <span className={styles.chip}>
                      {new Date(selected.date_publication).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {selected.heure && (
                    <span className={styles.chip}>
                      {String(selected.heure).slice(0, 5)}
                    </span>
                  )}
                  {selected.salle && (
                    <span className={styles.chip}>{selected.salle}</span>
                  )}
                </div>

                {selected.contenu && (
                  <p className={styles.description}>{selected.contenu}</p>
                )}

                <div className={styles.modalActions}>
                  {selected.lien_formulaire && (
                    <a
                      href={selected.lien_formulaire}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                    >
                      Accéder au formulaire
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelected(null)}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
