import { useMemo, useRef } from 'react';
import styles from './MailTemplateEditor.module.css';

function applyPreview(template, vars) {
  let out = String(template || '');
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
  }
  return out;
}

export default function MailTemplateEditor({
  title,
  description,
  placeholders = [],
  sampleVars = {},
  subject,
  body,
  onSubjectChange,
  onBodyChange,
}) {
  const bodyRef = useRef(null);

  const previewSubject = useMemo(
    () => applyPreview(subject, sampleVars),
    [subject, sampleVars]
  );
  const previewBody = useMemo(() => applyPreview(body, sampleVars), [body, sampleVars]);

  const insertPlaceholder = (token) => {
    const el = bodyRef.current;
    const text = `[${token}]`;
    if (!el) {
      onBodyChange(`${body || ''}${text}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${text}${body.slice(end)}`;
    onBodyChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </header>

      <div className={styles.chips}>
        <span className={styles.chipsLabel}>Insérer</span>
        {placeholders.map((p) => (
          <button
            key={p.key}
            type="button"
            className={styles.chip}
            onClick={() => insertPlaceholder(p.key)}
            title={p.hint || p.key}
          >
            [{p.key}]
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Sujet</span>
            <input
              value={subject || ''}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Sujet de l’email"
            />
          </label>
          <label className={styles.field}>
            <span>Corps du message</span>
            <textarea
              ref={bodyRef}
              rows={14}
              value={body || ''}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="Rédigez le mail…"
              spellCheck
            />
          </label>
        </div>

        <aside className={styles.preview} aria-label="Aperçu du mail">
          <div className={styles.previewTop}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <strong>Aperçu</strong>
          </div>
          <div className={styles.previewMeta}>
            <div>
              <em>De</em> ENISO Team
            </div>
            <div>
              <em>À</em> candidat@exemple.tn
            </div>
            <div className={styles.previewSubject}>{previewSubject || '—'}</div>
          </div>
          <div className={styles.previewBody}>
            {(previewBody || 'Le contenu apparaîtra ici…').split('\n').map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
