import { assetUrl } from '../../services/api';
import { findRoleByPoste, getRoleIcon } from '../../data/boardRoles';
import styles from './BoardCarouselItem.module.css';

function getPhotoSrc(photoConfig) {
  if (!photoConfig) return null;
  return photoConfig.fromApi ? assetUrl(photoConfig.src) : photoConfig.src;
}

export default function BoardCarouselItem({ member, onClick }) {
  const role = findRoleByPoste(member.poste);
  const roleKey = role?.key || 'default';
  const isVacant = !member.nom || member.nom.toLowerCase() === 'à pourvoir';
  const displayName = isVacant ? 'À pourvoir' : member.nom;
  const photoSrc = getPhotoSrc(member.photoConfig);

  return (
    <button
      type="button"
      className={styles.item}
      onClick={() => onClick(member)}
      aria-label={`${member.poste} — ${displayName}`}
    >
      <div className={`${styles.iconWrap} ${photoSrc ? styles.hasPhoto : ''}`} data-role={roleKey}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={displayName}
            className={styles.photo}
            style={{ objectPosition: member.photoConfig?.position || 'center center' }}
          />
        ) : (
          getRoleIcon(roleKey)
        )}
      </div>
      <p className={styles.name}>{displayName}</p>
      <p className={styles.poste}>{member.poste}</p>
    </button>
  );
}
