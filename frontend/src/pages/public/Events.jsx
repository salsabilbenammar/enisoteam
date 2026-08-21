import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import styles from './Deplacements.module.css';

export default function Events() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/events')
      .then((res) => setItems(res.data || []))
      .catch(() => setError('Impossible de charger les événements.'))
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

  const isOpen = (e) => e.inscription_ouverte || e.inscription_ouverte;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Événements</h1>
          <p>Cliquez sur une affiche pour voir les détails et vous inscrire.</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.posterGrid}>
          {items.map((e) => (
            <button
              key={e.id}
              type="button"
              className={styles.posterCard}
              onClick={() => setSelected(e)}
              aria-label={`Voir les détails de ${e.titre}`}
            >
              {e.image ? (
                <img src={assetUrl(e.image)} alt={e.titre} className={styles.posterImg} />
              ) : (
                <div className={styles.posterFallback}>
                  <span className={styles.fallbackEyebrow}>ENISO Team</span>
                  <strong>{e.titre}</strong>
                  {e.date && (
                    <span>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              )}
              <span className={styles.posterHint}>Voir plus</span>
            </button>
          ))}
        </div>

        {!error && items.length === 0 && (
          <div className="empty">Aucun événement publié pour le moment.</div>
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
            aria-labelledby="event-detail-title"
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
                <p className={styles.eyebrow}>Événement</p>
                <h2 id="event-detail-title">{selected.titre}</h2>

                <div className={styles.metaRow}>
                  {selected.date && (
                    <span className={styles.chip}>
                      {new Date(selected.date).toLocaleString('fr-FR')}
                    </span>
                  )}
                  {selected.lieu && <span className={styles.chip}>{selected.lieu}</span>}
                  {selected.payant && selected.prix && (
                    <span className={styles.chip}>
                      Frais : {selected.prix}
                      {!/dt/i.test(String(selected.prix)) ? ' DT' : ''}
                    </span>
                  )}
                  {!selected.payant && (
                    <span className={styles.chip}>Gratuit</span>
                  )}
                  {selected.date && (
                    <span className={styles.chip}>
                      {new Date(selected.date).getTime() >= Date.now() ? 'À venir' : 'Passé'}
                    </span>
                  )}
                </div>

                {selected.description && (
                  <p className={styles.description}>{selected.description}</p>
                )}

                <div className={styles.modalActions}>
                  {isOpen(selected) ? (
                    <Link
                      to={`/events/${selected.id}/inscription`}
                      className="btn btn-primary"
                    >
                      S&apos;inscrire
                    </Link>
                  ) : (
                    <span className={styles.closed}>Inscriptions fermées</span>
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
