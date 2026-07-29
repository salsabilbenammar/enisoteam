import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../../services/api';
import styles from './Home.module.css';

const PILLARS = [
  {
    to: '/trainings',
    title: 'Formations',
    text: 'Ateliers techniques pour progresser en équipe.',
  },
  {
    to: '/events',
    title: 'Événements',
    text: 'Compétitions, challenges et moments forts.',
  },
  {
    to: '/board',
    title: 'Bureau',
    text: 'Les responsables qui portent la vision du club.',
  },
];

const SLIDE_MS = 3500;

export default function Home() {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .get('/gallery')
      .then((res) => setSlides(Array.isArray(res.data) ? res.data : []))
      .catch(() => setSlides([]));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (!slides.length) return 0;
      return (i + 1) % slides.length;
    });
  }, [slides.length]);

  const current = slides[index] || null;
  const isVideo = current?.media_type === 'video';

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (slides.length < 2 || paused || isVideo) return undefined;

    timerRef.current = setInterval(goNext, SLIDE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, paused, isVideo, goNext, index]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return undefined;
    el.currentTime = 0;
    const play = el.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
    return undefined;
  }, [index, isVideo, current?.id]);

  const onVideoEnded = () => {
    if (slides.length < 2) return;
    goNext();
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroGrid} />
        </div>

        <div className={`container ${styles.heroInner}`}>
          <div className={styles.copyCol}>
            <div className={styles.brandBlock}>
              <img src="/logo.png" alt="ENISO Team" className={styles.logo} />
              <p className={styles.brand}>ENISO Team</p>
            </div>
            <h1 className={styles.headline}>One Team One Dream</h1>
            <p className={styles.lead}>
              Le club de robotique de l&apos;École Nationale d&apos;Ingénieurs de Sousse.
            </p>
            <div className={styles.ctas}>
              <Link to="/about" className="btn btn-primary">
                Découvrir le club
              </Link>
              <Link to="/events" className="btn btn-secondary">
                Voir les événements
              </Link>
            </div>
          </div>

          <div
            className={styles.sliderCol}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className={styles.sliderFrame}>
              {slides.length > 0 ? (
                <div
                  className={styles.sliderTrack}
                  style={{ transform: `translateX(-${index * 100}%)` }}
                >
                  {slides.map((slide) => (
                    <div key={slide.id} className={styles.slide}>
                      {slide.media_type === 'video' ? (
                        <video
                          ref={slide.id === current?.id ? videoRef : undefined}
                          className={styles.slideMedia}
                          src={assetUrl(slide.image)}
                          muted
                          playsInline
                          autoPlay={slide.id === current?.id}
                          onEnded={slide.id === current?.id ? onVideoEnded : undefined}
                        />
                      ) : (
                        <img
                          className={styles.slideMedia}
                          src={assetUrl(slide.image)}
                          alt={slide.titre || 'ENISO Team'}
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.sliderEmpty}>
                  <p>Photos & vidéos du club</p>
                  <span>Ajoutez des médias depuis l&apos;admin</span>
                </div>
              )}
            </div>

            {slides.length > 1 && (
              <div className={styles.dots} role="tablist" aria-label="Médias">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                    onClick={() => setIndex(i)}
                    aria-label={slide.titre || `Média ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.pillarsSection}>
        <div className="container">
          <header className={styles.sectionHead}>
            <h2>Explorer</h2>
            <p>Trois portes d&apos;entrée vers l&apos;univers ENISO Team.</p>
          </header>
          <div className={styles.pillars}>
            {PILLARS.map((item) => (
              <Link key={item.to} to={item.to} className={styles.pillar}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className={styles.pillarLink}>Découvrir →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
