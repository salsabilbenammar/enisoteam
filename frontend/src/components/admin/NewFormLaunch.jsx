import styles from './NewFormLaunch.module.css';

/**
 * Carte de démarrage style Google Forms (« Formulaire vierge »).
 */
export default function NewFormLaunch({
  title = 'Formulaire vierge',
  subtitle = 'Créer un nouveau formulaire',
  onCreate,
  disabled = false,
}) {
  return (
    <div className={styles.wrap}>
      <p className={styles.sectionLabel}>Démarrer un nouveau formulaire</p>
      <div className={styles.grid}>
        <button
          type="button"
          className={styles.blankCard}
          onClick={onCreate}
          disabled={disabled}
          aria-label={title}
        >
          <div className={styles.preview}>
            <span className={styles.plus} aria-hidden>
              +
            </span>
          </div>
          <div className={styles.meta}>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
