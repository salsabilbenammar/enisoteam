import { useState } from 'react';
import styles from './GoogleFormBuilder.module.css';

const QUESTION_TYPES = [
  { value: 'text', label: 'Texte court' },
  { value: 'textarea', label: 'Paragraphe' },
  { value: 'select', label: 'Choix unique' },
  { value: 'multiselect', label: 'Cases à cocher' },
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Nombre' },
];

function needsOptions(type) {
  return type === 'select' || type === 'multiselect';
}

function parseOptions(options) {
  if (Array.isArray(options)) return options.map((o) => String(o));
  if (!options) return ['Option 1'];
  return String(options)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createBlankQuestion() {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: 'Question sans titre',
    type: 'select',
    required: false,
    options: ['Option 1'],
  };
}

export default function GoogleFormBuilder({
  value = [],
  onChange,
  emptyHint = 'Aucune question. Cliquez sur + pour en ajouter une.',
}) {
  const [activeId, setActiveId] = useState(value[0]?.id || null);

  const update = (id, patch) => {
    onChange((value || []).map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const changeType = (question, type) => {
    const patch = { type };
    if (needsOptions(type)) {
      const opts = parseOptions(question.options);
      patch.options = opts.length ? opts : ['Option 1'];
    }
    update(question.id, patch);
  };

  const setOption = (question, index, text) => {
    const opts = [...parseOptions(question.options)];
    opts[index] = text;
    update(question.id, { options: opts });
  };

  const addOption = (question) => {
    const opts = parseOptions(question.options);
    update(question.id, { options: [...opts, `Option ${opts.length + 1}`] });
  };

  const removeOption = (question, index) => {
    const opts = parseOptions(question.options).filter((_, i) => i !== index);
    update(question.id, { options: opts.length ? opts : ['Option 1'] });
  };

  const removeQuestion = (id) => {
    const next = (value || []).filter((q) => q.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next[next.length - 1]?.id || null);
  };

  if (!(value || []).length) {
    return (
      <p className={styles.empty}>
        {emptyHint}
      </p>
    );
  }

  return (
    <div className={styles.list}>
      {value.map((question, index) => {
        const active = question.id === activeId;
        const options = parseOptions(question.options);
        return (
          <article
            key={question.id}
            className={`${styles.card} ${active ? styles.cardActive : ''}`}
            onClick={() => setActiveId(question.id)}
          >
            <div className={styles.cardTop}>
              <input
                className={styles.titleInput}
                value={question.label}
                onChange={(e) => update(question.id, { label: e.target.value })}
                placeholder="Question sans titre"
                aria-label={`Intitulé de la question ${index + 1}`}
              />
              <select
                className={styles.typeSelect}
                value={question.type}
                onChange={(e) => changeType(question, e.target.value)}
                aria-label="Type de question"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {question.type === 'textarea' ? (
              <div className={styles.previewLong}>Réponse longue</div>
            ) : question.type === 'checkbox' ? (
              <label className={styles.previewChoice}>
                <input type="checkbox" disabled />
                <span>Case à cocher</span>
              </label>
            ) : needsOptions(question.type) ? (
              <div className={styles.options}>
                {options.map((opt, i) => (
                  <div key={`${question.id}-opt-${i}`} className={styles.optionRow}>
                    <span className={styles.optionMark} aria-hidden>
                      {question.type === 'multiselect' ? '☐' : '○'}
                    </span>
                    <input
                      value={opt}
                      onChange={(e) => setOption(question, i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => removeOption(question, i)}
                        aria-label="Supprimer l’option"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addOption}
                  onClick={() => addOption(question)}
                >
                  Ajouter une option
                </button>
              </div>
            ) : (
              <div className={styles.previewShort}>
                {question.type === 'date'
                  ? 'Date'
                  : question.type === 'number'
                    ? 'Nombre'
                    : 'Réponse courte'}
              </div>
            )}

            <div className={styles.cardFooter}>
              <label className={styles.requiredToggle}>
                <input
                  type="checkbox"
                  checked={!!question.required}
                  onChange={() => update(question.id, { required: !question.required })}
                />
                Obligatoire
              </label>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => removeQuestion(question.id)}
                aria-label="Supprimer la question"
                title="Supprimer"
              >
                ⌫
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
