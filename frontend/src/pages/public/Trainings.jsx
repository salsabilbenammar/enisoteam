import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import styles from './ActivityCards.module.css';

const niveauLabel = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export default function Trainings() {
  const { isMember } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/trainings')
      .then((res) => setItems(res.data))
      .catch(() => setError('Impossible de charger les formations.'))
      .finally(() => setLoading(false));
  }, [isMember]);

  if (loading) return <Loader />;

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <h1>Formations</h1>
          <p>Ateliers techniques proposés par le club ENISO Team.</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="grid grid-2">
          {items.map((t) => (
            <article key={t.id} className={`card ${styles.card}`}>
              <div className="meta">
                <span className="badge badge-accent">{niveauLabel[t.niveau] || t.niveau}</span>
                <span>{new Date(t.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <h3>{t.titre}</h3>
              <p>{t.description}</p>
              {t.formateur && <p className={styles.metaLine}>Formateur : {t.formateur}</p>}

              <div className={styles.actions}>
                {t.inscription_ouverte ? (
                  isMember ? (
                    <Link
                      to={`/trainings/${t.id}/inscription`}
                      className={`btn btn-primary ${styles.joinBtn}`}
                    >
                      <span className={styles.joinIcon} aria-hidden>
                        ✎
                      </span>
                      S&apos;inscrire
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      state={{
                        from: `/trainings/${t.id}/inscription`,
                        message:
                          'Connectez-vous avec votre compte membre pour vous inscrire à une formation.',
                      }}
                      className={`btn btn-primary ${styles.joinBtn}`}
                    >
                      <span className={styles.joinIcon} aria-hidden>
                        ✎
                      </span>
                      Se connecter pour s&apos;inscrire
                    </Link>
                  )
                ) : (
                  <span className={styles.closed}>Inscriptions fermées</span>
                )}

                {isMember && t.lien ? (
                  <a href={t.lien} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                    Accéder à la formation
                  </a>
                ) : !isMember && t.acces_membre ? (
                  <Link
                    to="/login"
                    state={{
                      from: '/trainings',
                      message: 'Connectez-vous pour accéder au contenu réservé aux membres.',
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Contenu membre 🔒
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {!error && items.length === 0 && <div className="empty">Aucune formation publiée.</div>}
      </div>
    </div>
  );
}
