import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './Footer.module.css';

const DEFAULTS = {
  contact_label: 'Ressources humaines et formations',
  contact_phone: '96295048',
  instagram_url: 'https://www.instagram.com/enisoteam/',
  facebook_url: 'https://www.facebook.com/search/top?q=eniso%20team',
  linkedin_url: 'https://www.linkedin.com/company/enisoteam/',
};

const BASE_NAV_LINKS = [
  { to: '/about', label: 'À propos' },
  { to: '/board', label: 'Bureau' },
  { to: '/trainings', label: 'Formations' },
  { to: '/events', label: 'Événements' },
  { to: '/announcements', label: 'Annonces' },
];

const ICONS = {
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM18 6.2a1.2 1.2 0 1 1-1.2 1.2A1.2 1.2 0 0 1 18 6.2z" />
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 3h3.2A1.3 1.3 0 0 1 18 4.3v3.2h-2.8c-.8 0-1 .4-1 1v2.5H18l-.5 4.5h-3.5V21h-4.5v-5.5H7v-4.5h3V8.5C10 5.5 11.5 3 13.5 3z" />
    </svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.5H3.2V21h3.3V8.5zM4.9 3A1.9 1.9 0 1 0 4.9 6.8 1.9 1.9 0 0 0 4.9 3zM21 21h-3.3v-6.5c0-1.7-.7-2.3-1.7-2.3s-1.7.8-1.7 2.3V21H11V8.5h3.2v1.5c.6-1.1 1.8-1.9 3.5-1.9 2.4 0 3.3 1.5 3.3 4.4V21z" />
    </svg>
  ),
};

export default function Footer() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [candidatureOpen, setCandidatureOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  useEffect(() => {
    api
      .get('/site-settings')
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => setSettings(DEFAULTS));
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

  const navLinks = [
    ...BASE_NAV_LINKS,
    ...(candidatureOpen ? [{ to: '/candidature', label: 'Candidature' }] : []),
    ...(mediaOpen ? [{ to: '/candidature-media', label: 'Media Babies' }] : []),
  ];

  const socialLinks = [
    { label: 'Instagram', href: settings.instagram_url },
    { label: 'Facebook', href: settings.facebook_url },
    { label: 'LinkedIn', href: settings.linkedin_url },
  ].filter((l) => l.href);

  return (
    <footer className={styles.footer}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brandRow}>
              <img src="/logo.png" alt="" className={styles.logo} />
              <div>
                <strong className={styles.brand}>ENISO Team</strong>
                <span className={styles.tagline}>One Team One Dream</span>
              </div>
            </Link>
            <p className={styles.blurb}>
              Club de robotique de l&apos;École Nationale d&apos;Ingénieurs de Sousse.
            </p>
          </div>

          <div className={styles.col}>
            <h3 className={styles.heading}>Navigation</h3>
            <nav className={styles.navList} aria-label="Liens du pied de page">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.col}>
            <h3 className={styles.heading}>Contact</h3>
            {(settings.contact_label || settings.contact_phone) && (
              <div className={styles.contactCard}>
                {settings.contact_label && (
                  <p className={styles.contactRole}>{settings.contact_label}</p>
                )}
                {settings.contact_phone && (
                  <span className={styles.phone}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z" />
                    </svg>
                    {settings.contact_phone}
                  </span>
                )}
                <a href="mailto:eniso.teamm@gmail.com" className={styles.email}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  eniso.teamm@gmail.com
                </a>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className={styles.socialBlock}>
                <h3 className={styles.heading}>Réseaux</h3>
                <div className={styles.socialLinks}>
                  {socialLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.socialLink}
                      aria-label={`ENISO Team sur ${link.label}`}
                      title={link.label}
                    >
                      {ICONS[link.label]}
                      <span>{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} ENISO Team — Tous droits réservés.
          </p>
          <p className={styles.school}>ENISO · Sousse, Tunisie</p>
        </div>
      </div>
    </footer>
  );
}
