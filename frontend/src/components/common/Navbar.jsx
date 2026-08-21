import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const BASE_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/about', label: 'À propos' },
  { to: '/board', label: 'Bureau' },
  { to: '/trainings', label: 'Formations' },
  { to: '/events', label: 'Événements' },
  { to: '/projets', label: 'Projets' },
  { to: '/mes-projets', label: 'Mes projets', membersOnly: true },
  { to: '/selection-projets', label: 'Sélection', membersOnly: true },
  { to: '/announcements', label: 'Annonces' },
  { to: '/deplacements', label: 'Car & compétitions' },
  { to: '/rh', label: 'Coin RH', membersOnly: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [candidatureOpen, setCandidatureOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [openForms, setOpenForms] = useState([]);
  const loginMenuRef = useRef(null);
  const { isAdmin, isMember, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/recruitment/status')
      .then((res) => {
        setCandidatureOpen(!!res.data.candidature_ouverte);
        setMediaOpen(!!res.data.candidature_ouverte_media);
      })
      .catch(() => {
        setCandidatureOpen(false);
        setMediaOpen(false);
      });
  }, []);

  useEffect(() => {
    if (!isMember) {
      setOpenForms([]);
      return undefined;
    }
    api
      .get('/finance/offers/open')
      .then((res) => setOpenForms(res.data || []))
      .catch(() => setOpenForms([]));
    return undefined;
  }, [isMember]);

  useEffect(() => {
    if (!loginMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (loginMenuRef.current && !loginMenuRef.current.contains(e.target)) {
        setLoginMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setLoginMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [loginMenuOpen]);

  const links = [
    ...BASE_LINKS.filter((l) => !l.membersOnly),
    ...(candidatureOpen ? [{ to: '/candidature', label: 'Candidature' }] : []),
    ...(mediaOpen ? [{ to: '/candidature-media', label: 'Media Babies' }] : []),
    // Espaces membres uniquement après connexion (identifiants reçus post-paiement)
    ...(isMember ? BASE_LINKS.filter((l) => l.membersOnly) : []),
    ...(isMember
      ? openForms.map((f) => ({
          ...(String(f.external_url || '').startsWith('/')
            ? { to: f.external_url }
            : { external: true, href: f.external_url }),
          label: f.titre,
        }))
      : []),
  ];

  const closeAll = () => {
    setOpen(false);
    setLoginMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeAll();
    navigate('/', { replace: true });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} onClick={closeAll}>
          <img src="/logo.png" alt="ENISO Team" className={styles.logoImg} />
          <span className={styles.brandText}>
            <strong>ENISO Team</strong>
            <small>One Team One Dream</small>
          </span>
        </Link>

        <button
          className={styles.toggle}
          type="button"
          aria-label="Menu"
          onClick={() => {
            setOpen((v) => !v);
            setLoginMenuOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`${styles.nav} ${open ? styles.open : ''}`}>
          {links.map((l) =>
            l.external ? (
              <a
                key={l.href + l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeAll}
              >
                {l.label}
              </a>
            ) : (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeAll}
              >
                {l.label}
              </NavLink>
            )
          )}
          {isAdmin ? (
            <>
              <Link to="/admin" className={styles.cta} onClick={closeAll}>
                Admin
              </Link>
              <button type="button" className={styles.ctaBtn} onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : isMember ? (
            <>
              <NavLink
                to="/profil"
                className={({ isActive }) => (isActive ? styles.active : undefined)}
                onClick={closeAll}
              >
                Profil
              </NavLink>
              <button type="button" className={styles.ctaBtn} onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <div className={styles.loginMenu} ref={loginMenuRef}>
              <button
                type="button"
                className={styles.ctaBtn}
                aria-haspopup="menu"
                aria-expanded={loginMenuOpen}
                onClick={() => setLoginMenuOpen((v) => !v)}
              >
                Connexion ▾
              </button>
              {loginMenuOpen && (
                <div className={styles.loginDropdown} role="menu">
                  <Link to="/login" role="menuitem" onClick={closeAll}>
                    Membre
                  </Link>
                  <Link to="/admin/login" role="menuitem" onClick={closeAll}>
                    Admin
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
