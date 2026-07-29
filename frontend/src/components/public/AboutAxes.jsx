import { useState } from 'react';
import styles from './AboutAxes.module.css';
import { parseAxes } from '../../utils/clubAxes';

export default function AboutAxes({ titre, contenu }) {
  const axes = parseAxes(contenu);
  const [active, setActive] = useState(0);
  const current = axes[active] || axes[0];

  return (
    <section className={styles.section} aria-labelledby="axes-title">
      <header className={styles.head}>
        <h2 id="axes-title">{titre || 'Nos Axes'}</h2>
        <p>Cliquez sur un axe pour découvrir sa signification.</p>
      </header>

      <div className={styles.layout}>
        <ul className={styles.points} role="tablist" aria-label="Axes du club">
          {axes.map((axe, i) => (
            <li key={`${axe.titre}-${i}`}>
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                className={`${styles.point} ${i === active ? styles.pointActive : ''}`}
                onClick={() => setActive(i)}
              >
                <span className={styles.bullet} aria-hidden="true">
                  <span className={styles.bulletCore} />
                </span>
                <span className={styles.pointLabel}>{axe.titre}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.panel} role="tabpanel">
          <div key={active} className={styles.panelInner}>
            <span className={styles.panelIndex}>
              {String(active + 1).padStart(2, '0')}
            </span>
            <h3>{current?.titre}</h3>
            <p>{current?.description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
