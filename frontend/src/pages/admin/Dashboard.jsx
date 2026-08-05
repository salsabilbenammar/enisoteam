import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { mergeBoardMembers } from '../../data/boardRoles';
import styles from './Dashboard.module.css';

const PIPELINE = [
  { key: 'en_attente', label: 'Reçues', to: '/admin/recruitment' },
  { key: 'entretien_confirme', label: 'Entretiens', to: '/admin/recruitment' },
  { key: 'present_entretien', label: 'Présents', to: '/admin/recruitment' },
  { key: 'paiement_en_attente', label: 'Paiement', to: '/admin/recruitment' },
  { key: 'paiement_confirme', label: 'Validés', to: '/admin/recruitment' },
];

const MODULES = [
  {
    key: 'announcements',
    label: 'Annonces',
    hint: 'Communiqués du club',
    to: '/admin/announcements',
    accent: 'blue',
    icon: 'megaphone',
  },
  {
    key: 'board',
    label: 'Bureau',
    hint: '10 postes du bureau',
    to: '/admin/board',
    accent: 'cyan',
    icon: 'users',
  },
  {
    key: 'gallery',
    label: 'Médias',
    hint: 'Accueil & visuels',
    to: '/admin/gallery',
    accent: 'blue',
    icon: 'image',
  },
  {
    key: 'trainings',
    label: 'Formations',
    hint: 'Sessions & inscrits',
    to: '/admin/trainings',
    accent: 'cyan',
    icon: 'book',
  },
  {
    key: 'events',
    label: 'Événements',
    hint: 'Agenda & inscriptions',
    to: '/admin/events',
    accent: 'blue',
    icon: 'calendar',
  },
  {
    key: 'candidates',
    label: 'Candidats',
    hint: 'Pipeline recrutement',
    to: '/admin/recruitment',
    accent: 'cyan',
    icon: 'candidate',
  },
];

const QUICK = [
  { label: 'Nouveau créneau', to: '/admin/recruitment', hint: 'Entretiens' },
  { label: 'Gérer le recrutement', to: '/admin/recruitment', hint: 'Candidats' },
  { label: 'Coin RH', to: '/admin/rh', hint: 'Mérites & formulaires' },
  { label: 'Site public', to: '/', hint: 'Voir le club', external: true },
];

function Icon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (name) {
    case 'megaphone':
      return (
        <svg {...common}>
          <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
          <path d="M14 9.5a4 4 0 0 1 0 5" />
          <path d="M16.5 7a7 7 0 0 1 0 10" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.5 19c.4-1.8 1.7-3.2 3.5-3.8" />
        </svg>
      );
    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.8" />
          <path d="M3 16l5-4 4 3 4-5 5 6" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4M16 3v4" />
        </svg>
      );
    case 'candidate':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20a7 7 0 0 1 14 0" />
          <path d="M16 4l2 2 3-3" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common} width={16} height={16}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

function useCountUp(target, enabled) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled || target == null || Number.isNaN(Number(target))) {
      setValue(target ?? 0);
      return undefined;
    }
    const end = Number(target);
    const duration = 700;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(end * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);
  return value;
}

function StatCard({ item, value, index }) {
  const display = useCountUp(value, value != null);
  return (
    <Link
      to={item.to}
      className={`${styles.statCard} ${styles[item.accent]}`}
      style={{ animationDelay: `${0.05 + index * 0.05}s` }}
    >
      <div className={styles.statTop}>
        <span className={styles.statIcon}>
          <Icon name={item.icon} />
        </span>
        <span className={styles.statGo} aria-hidden>
          <Icon name="arrow" />
        </span>
      </div>
      <p className={styles.statValue}>{value == null ? '—' : display}</p>
      <h2 className={styles.statLabel}>{item.label}</h2>
      <p className={styles.statHint}>{item.hint}</p>
    </Link>
  );
}

export default function Dashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recruitment, setRecruitment] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/announcements'),
      api.get('/board'),
      api.get('/trainings'),
      api.get('/events'),
      api.get('/gallery'),
      api.get('/recruitment/candidates', { params: { limit: 1 } }),
      api.get('/recruitment/stats').catch(() => ({ data: null })),
    ])
      .then(([a, b, t, e, g, r, s]) => {
        const board = mergeBoardMembers(b.data || []);
        setStats({
          announcements: a.data.length,
          // Postes officiels du bureau (pas le nombre brut de lignes en BDD)
          board: board.length,
          trainings: t.data.length,
          events: e.data.length,
          gallery: g.data.length,
          candidates: r.data.total,
        });
        setRecruitment(s.data);
      })
      .catch(() => setError('Impossible de charger le tableau de bord.'));
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const firstName = admin?.nom?.split(' ')[0] || 'Admin';
  const byStatus = recruitment?.byStatus || {};
  const pipelineTotal = PIPELINE.reduce((sum, step) => sum + (byStatus[step.key] || 0), 0);

  if (!stats && !error) return <Loader />;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Administration · ENISO Team</p>
          <h1>
            Bonjour, <span>{firstName}</span>
          </h1>
          <p className={styles.heroLead}>
            Vue d&apos;ensemble du club — contenus, activités et recrutement en un coup d&apos;œil.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.datePill}>{todayLabel}</span>
          <Link to="/" className={styles.heroLink}>
            Voir le site public
          </Link>
        </div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && (
        <>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>Modules</h2>
              <p>Accès rapide aux espaces de gestion</p>
            </div>
            <div className={styles.statGrid}>
              {MODULES.map((item, index) => (
                <StatCard key={item.key} item={item} value={stats?.[item.key]} index={index} />
              ))}
            </div>
          </section>

          <div className={styles.split}>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>Pipeline recrutement</h2>
                <p>
                  {recruitment?.total != null
                    ? `${recruitment.total} candidat${recruitment.total > 1 ? 's' : ''} au total`
                    : 'Suivi des étapes clés'}
                </p>
              </div>
              <div className={styles.pipeline}>
                {PIPELINE.map((step, index) => {
                  const count = byStatus[step.key] || 0;
                  const width = pipelineTotal > 0 ? Math.max(8, (count / pipelineTotal) * 100) : 8;
                  return (
                    <Link
                      key={step.key}
                      to={step.to}
                      className={styles.pipeStep}
                      style={{ animationDelay: `${0.15 + index * 0.06}s` }}
                    >
                      <div className={styles.pipeTop}>
                        <span>{step.label}</span>
                        <strong>{count}</strong>
                      </div>
                      <div className={styles.pipeTrack}>
                        <span className={styles.pipeFill} style={{ width: `${width}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>Actions rapides</h2>
                <p>Aller directement à la tâche</p>
              </div>
              <div className={styles.quickGrid}>
                {QUICK.map((item, index) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={styles.quickCard}
                    style={{ animationDelay: `${0.2 + index * 0.05}s` }}
                  >
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.hint}</span>
                    </div>
                    <Icon name="arrow" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
