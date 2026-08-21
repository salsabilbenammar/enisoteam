import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './Deplacements.module.css';

export default function Deplacements() {
  const { isMember } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .get('/deplacements')
      .then((res) => {
        const list = (res.data || []).filter((d) => d.inscription_ouverte);
        setItems(list);
      })
      .catch(() => setError('Impossible de charger les annonces car.'))
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
          <h1>Car &amp; compétitions</h1>
          <p>Cliquez sur une affiche pour voir les détails et vous inscrire.</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.posterGrid}>
          {items.map((d) => (
            <button
              key={d.id}
              type="button"
              className={styles.posterCard}
              onClick={() => setSelected(d)}
              aria-label={`Voir les détails de ${d.competition || d.titre}`}
            >
              <div className={styles.posterMedia}>
                {d.affiche_url ? (
                  <img
                    src={assetUrl(d.affiche_url)}
                    alt={`Affiche ${d.competition || d.titre}`}
                    className={styles.posterImg}
                  />
                ) : (
                  <div className={styles.posterFallback}>
                    <span className={styles.fallbackEyebrow}>ENISO Team</span>
                    <strong>{d.competition || d.titre}</strong>
                    {d.destination && <span>{d.destination}</span>}
                  </div>
                )}
                <span className={styles.posterHint}>Voir plus</span>
              </div>
              <span className={styles.posterTitle}>
                {d.competition || d.titre}
              </span>
            </button>
          ))}
        </div>

        {!error && items.length === 0 && (
          <div className="empty">Aucune annonce car ouverte pour le moment.</div>
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
            aria-labelledby="dep-detail-title"
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
                {selected.affiche_url ? (
                  <img
                    src={assetUrl(selected.affiche_url)}
                    alt={`Affiche ${selected.competition || selected.titre}`}
                  />
                ) : (
                  <div className={styles.posterFallback}>
                    <span className={styles.fallbackEyebrow}>ENISO Team</span>
                    <strong>{selected.competition || selected.titre}</strong>
                  </div>
                )}
              </div>

              <div className={styles.modalBody}>
                {selected.competition && (
                  <p className={styles.eyebrow}>{selected.competition}</p>
                )}
                <h2 id="dep-detail-title">{selected.titre}</h2>

                <div className={styles.metaRow}>
                  {selected.destination && (
                    <span className={styles.chip}>{selected.destination}</span>
                  )}
                  {selected.date_competition && (
                    <span className={styles.chip}>
                      {new Date(selected.date_competition).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  {selected.payant && selected.prix && (
                    <span className={styles.chip}>{selected.prix}</span>
                  )}
                  {selected.places_max != null && (
                    <span className={styles.chip}>
                      {selected.complet
                        ? 'Complet'
                        : `${selected.places_restantes} place${
                            selected.places_restantes > 1 ? 's' : ''
                          }`}
                    </span>
                  )}
                </div>

                {selected.description && (
                  <p className={styles.description}>{selected.description}</p>
                )}

                <div className={styles.modalActions}>
                  {!selected.complet ? (
                    isMember ? (
                      <Link
                        to={`/deplacements/${selected.id}/inscription`}
                        className="btn btn-primary"
                      >
                        S&apos;inscrire
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        state={{
                          from: `/deplacements/${selected.id}/inscription`,
                          message:
                            'Connectez-vous avec votre compte membre pour vous inscrire.',
                        }}
                        className="btn btn-primary"
                      >
                        Se connecter pour s&apos;inscrire
                      </Link>
                    )
                  ) : (
                    <span className={styles.closed}>Complet</span>
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
