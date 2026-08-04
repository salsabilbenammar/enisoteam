import { useEffect, useState } from 'react';
import { assetUrl } from '../../services/api';
import { findRoleByPoste, getRoleIcon } from '../../data/boardRoles';
import styles from './BoardDetailModal.module.css';

function getPhotoSrc(photoConfig) {
  if (!photoConfig) return null;
  return photoConfig.fromApi ? assetUrl(photoConfig.src) : photoConfig.src;
}

export default function BoardDetailModal({ member, onClose }) {
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    setShowEmail(false);
  }, [member?.id]);

  if (!member) return null;

  const role = findRoleByPoste(member.poste);
  const roleKey = role?.key || 'default';
  const isVacant = !member.nom || member.nom.toLowerCase() === 'à pourvoir';
  const description = member.description || role?.description || 'Description du poste à venir.';
  const photoSrc = getPhotoSrc(member.photoConfig);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-modal-title"
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
          ×
        </button>

        <div className={styles.layout}>
          <aside className={styles.side}>
            <div className={`${styles.iconWrap} ${photoSrc ? styles.hasPhoto : ''}`} data-role={roleKey}>
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={member.nom}
                  className={styles.photo}
                  style={{ objectPosition: member.photoConfig?.position || 'center center' }}
                />
              ) : (
                getRoleIcon(roleKey)
              )}
            </div>

            <span className="badge badge-accent">{member.poste}</span>

            <h2 id="board-modal-title" className={styles.title}>
              {isVacant ? 'Poste à pourvoir' : member.nom}
            </h2>

            {!isVacant && (member.facebook || member.email) && (
              <div className={styles.contactActions}>
                {member.email && (
                  <button
                    type="button"
                    className={`${styles.contactBtn} ${showEmail ? styles.contactBtnActive : ''}`}
                    onClick={() => setShowEmail((v) => !v)}
                    aria-expanded={showEmail}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    Mail
                  </button>
                )}
                {member.facebook && (
                  <a
                    href={member.facebook}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.contactBtn}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13.5 3h3.2A1.3 1.3 0 0 1 18 4.3v3.2h-2.8c-.8 0-1 .4-1 1v2.5H18l-.5 4.5h-3.5V21h-4.5v-5.5H7v-4.5h3V8.5C10 5.5 11.5 3 13.5 3z" />
                    </svg>
                    Facebook
                  </a>
                )}
              </div>
            )}
          </aside>

          <div className={styles.content}>
            <div className={styles.section}>
              <h3>Mission du poste</h3>
              <p>{description}</p>
            </div>

            <div className={styles.details}>
              <div>
                <span className={styles.label}>Poste</span>
                <span>{member.poste}</span>
              </div>
              <div>
                <span className={styles.label}>Responsable</span>
                <span>{isVacant ? 'Non assigné' : member.nom}</span>
              </div>
              {member.telephone && !isVacant && (
                <div>
                  <span className={styles.label}>Téléphone</span>
                  <span>{member.telephone}</span>
                </div>
              )}
            </div>

            {showEmail && member.email && !isVacant && (
              <a href={`mailto:${member.email}`} className={styles.revealedEmail}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <span>{member.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
