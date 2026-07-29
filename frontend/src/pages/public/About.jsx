import { useEffect, useState } from 'react';
import api, { assetUrl } from '../../services/api';
import Loader from '../../components/common/Loader';
import AboutAxes from '../../components/public/AboutAxes';
import { isAxesSection } from '../../utils/clubAxes';
import styles from './About.module.css';

function isMission(titre) {
  return String(titre || '')
    .trim()
    .toLowerCase()
    .includes('mission');
}

function isHistoire(titre) {
  return String(titre || '')
    .trim()
    .toLowerCase()
    .includes('histoire');
}

function isVideoPath(path) {
  if (!path) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(path);
}

function SectionMedia({ src, title, placeholder, float }) {
  const classes = [
    styles.media,
    !src ? styles.mediaPlaceholder : '',
    float ? styles.mediaFloat : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!src) {
    return (
      <div className={classes} aria-hidden="true">
        <span>{placeholder || 'Photo ou vidéo'}</span>
      </div>
    );
  }

  if (isVideoPath(src)) {
    return (
      <div className={classes}>
        <video
          className={styles.mediaVideo}
          src={assetUrl(src)}
          controls
          playsInline
          preload="metadata"
          title={title}
        />
      </div>
    );
  }

  return (
    <div className={classes}>
      <img src={assetUrl(src)} alt={title} />
    </div>
  );
}

export default function About() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/club-info')
      .then((res) => setSections(res.data))
      .catch(() => setError('Impossible de charger les informations du club.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const textSections = sections.filter((s) => !isAxesSection(s.titre));
  const axesSection = sections.find((s) => isAxesSection(s.titre));

  return (
    <div className={`page ${styles.page}`}>
      <div className="container">
        <header className="page-header">
          <h1>À propos du club</h1>
          <p>Histoire, mission et axes d&apos;ENISO Team.</p>
        </header>
        {error && <div className="alert alert-error">{error}</div>}
        {!error && sections.length === 0 && <div className="empty">Aucune information pour le moment.</div>}

        <div className={styles.list}>
          {textSections.map((s) => {
            const mission = isMission(s.titre);
            const histoire = isHistoire(s.titre);
            const reserveMedia = histoire || mission || Boolean(s.image);

            const layoutClass = !reserveMedia
              ? styles.textOnly
              : mission
                ? styles.photoLeft
                : styles.photoRight;

            const media = reserveMedia ? (
              <SectionMedia
                src={s.image}
                title={s.titre}
                float={mission || histoire}
                placeholder={
                  histoire
                    ? 'Espace photo / vidéo — Histoire'
                    : 'Espace photo / vidéo — Mission'
                }
              />
            ) : null;

            const copy = (
              <div className={styles.copy}>
                <h2>{s.titre}</h2>
                <p>{s.contenu}</p>
              </div>
            );

            return (
              <article key={s.id} className={`${styles.block} ${layoutClass}`}>
                {mission ? (
                  <>
                    {media}
                    {copy}
                  </>
                ) : (
                  <>
                    {copy}
                    {media}
                  </>
                )}
              </article>
            );
          })}
        </div>

        {axesSection && <AboutAxes titre="Nos Axes" contenu={axesSection.contenu} />}
      </div>
    </div>
  );
}
