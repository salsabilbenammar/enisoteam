import { useMemo, useState } from 'react';
import {
  FORM_QUESTION_BANK,
  FORM_QUESTION_CATEGORIES,
  toAdminField,
} from '../../data/formQuestionBank';
import styles from './FormQuestionPicker.module.css';

function emptyCustom() {
  return {
    id: `custom_${Date.now()}`,
    label: '',
    type: 'text',
    required: false,
    options: '',
  };
}

/**
 * Bouton + panneau pour choisir des questions (banque + custom)
 * et les intégrer au formulaire.
 */
export default function FormQuestionPicker({
  value = [],
  onChange,
  title = 'Questions du formulaire',
  intro = "Choisissez des questions dans la banque (ou créez les vôtres), puis intégrez-les au formulaire d'inscription.",
  buttonLabel = 'Choisir les questions du formulaire',
}) {
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState([]);
  const [draftCustoms, setDraftCustoms] = useState([]);
  const [newCustom, setNewCustom] = useState(emptyCustom());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const selectedIds = useMemo(() => new Set((value || []).map((f) => f.id)), [value]);
  const draftCount = draftIds.length + draftCustoms.length;

  const filteredBank = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FORM_QUESTION_BANK.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        String(item.type).toLowerCase().includes(q) ||
        String(item.category || '').toLowerCase().includes(q)
      );
    });
  }, [query, categoryFilter]);

  const groupedBank = useMemo(
    () =>
      FORM_QUESTION_CATEGORIES.map((cat) => ({
        ...cat,
        questions: filteredBank.filter((q) => q.category === cat.id),
      })).filter((cat) => cat.questions.length > 0),
    [filteredBank]
  );

  const openPicker = () => {
    const customs = (value || []).filter((f) => !FORM_QUESTION_BANK.some((b) => b.id === f.id));
    setDraftIds(
      (value || []).filter((f) => FORM_QUESTION_BANK.some((b) => b.id === f.id)).map((f) => f.id)
    );
    setDraftCustoms(customs.map(toAdminField));
    setNewCustom(emptyCustom());
    setQuery('');
    setCategoryFilter('all');
    setOpen(true);
  };

  const toggleBank = (id) => {
    setDraftIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectCategoryAll = (categoryId) => {
    const ids = FORM_QUESTION_BANK.filter((q) => q.category === categoryId).map((q) => q.id);
    setDraftIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const addCustomToDraft = () => {
    if (!newCustom.label.trim()) return;
    setDraftCustoms((prev) => [...prev, { ...newCustom, label: newCustom.label.trim() }]);
    setNewCustom(emptyCustom());
  };

  const integrate = () => {
    const fromBank = FORM_QUESTION_BANK.filter((q) => draftIds.includes(q.id)).map(toAdminField);
    const prevOrder = (value || []).map((f) => f.id);
    const prevById = Object.fromEntries((value || []).map((f) => [f.id, f]));
    const merged = [...fromBank, ...draftCustoms].map((f) =>
      prevById[f.id] ? { ...f, required: prevById[f.id].required } : f
    );
    merged.sort((a, b) => {
      const ia = prevOrder.indexOf(a.id);
      const ib = prevOrder.indexOf(b.id);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    onChange(merged);
    setOpen(false);
  };

  return (
    <div className={styles.wrap}>
      <div>
        <label>{title}</label>
        <p className={styles.intro}>{intro}</p>
      </div>

      {(value || []).length === 0 ? (
        <p className={styles.empty}>Aucune question personnalisée pour le moment.</p>
      ) : (
        <ul className={styles.selectedList}>
          {value.map((f) => (
            <li key={f.id} className={styles.selectedItem}>
              <div className={styles.selectedBody}>
                <strong>
                  {f.label}
                  {f.required ? <span className={styles.requiredMark}>*</span> : null}
                </strong>
                <span className={styles.chip}>{f.type}</span>
              </div>
              <div className={styles.itemActions}>
                <label className={styles.checkRow}>
                  <input
                    className={styles.checkbox}
                    type="checkbox"
                    checked={!!f.required}
                    onChange={() =>
                      onChange(
                        value.map((x) =>
                          x.id === f.id ? { ...x, required: !x.required } : x
                        )
                      )
                    }
                  />
                  Obligatoire
                </label>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => onChange(value.filter((x) => x.id !== f.id))}
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary btn-sm" onClick={openPicker}>
          {buttonLabel}
        </button>
        {(value || []).length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange([])}>
            Tout retirer
          </button>
        )}
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h4>Banque de questions</h4>
              <p>Cochez les questions à ajouter, puis intégrez-les au formulaire.</p>
            </div>
            <span className={styles.countBadge}>
              {draftCount} sélectionnée{draftCount > 1 ? 's' : ''}
            </span>
          </div>

          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une question…"
            aria-label="Rechercher une question"
          />

          <div className={styles.categoryBar}>
            <button
              type="button"
              className={`${styles.catChip} ${categoryFilter === 'all' ? styles.catChipActive : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            {FORM_QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.catChip} ${
                  categoryFilter === cat.id ? styles.catChipActive : ''
                }`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label.replace(/^\d+\.\s*/, '')}
              </button>
            ))}
          </div>

          <div className={styles.bankList}>
            {groupedBank.length === 0 ? (
              <p className={styles.empty}>Aucune question ne correspond à la recherche.</p>
            ) : (
              groupedBank.map((cat) => (
                <section key={cat.id} className={styles.categoryBlock}>
                  <div className={styles.categoryTitleRow}>
                    <h5 className={styles.categoryTitle}>{cat.label}</h5>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => selectCategoryAll(cat.id)}
                    >
                      Tout sélectionner
                    </button>
                  </div>
                  <div className={styles.categoryQuestions}>
                    {cat.questions.map((q) => {
                      const checked = draftIds.includes(q.id);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={`${styles.questionRow} ${
                            checked ? styles.questionRowActive : ''
                          }`}
                          onClick={() => toggleBank(q.id)}
                        >
                          <input
                            className={styles.checkbox}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBank(q.id)}
                            onClick={(e) => e.stopPropagation()}
                            tabIndex={-1}
                            aria-hidden
                          />
                          <div className={styles.questionBody}>
                            <p className={styles.questionLabel}>
                              {q.label}
                              {q.required ? (
                                <span className={styles.requiredMark}>*</span>
                              ) : null}
                            </p>
                            <div className={styles.meta}>
                              <span className={styles.chip}>{q.type}</span>
                              {selectedIds.has(q.id) ? (
                                <span className={styles.integrated}>déjà intégrée</span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          <div className={styles.section}>
            <h5>Question personnalisée</h5>
            <div className={`${styles.customGrid} ${styles.customGridTwo}`}>
              <div className={styles.field}>
                <label htmlFor="custom-q-label">Libellé</label>
                <input
                  id="custom-q-label"
                  value={newCustom.label}
                  onChange={(e) => setNewCustom({ ...newCustom, label: e.target.value })}
                  placeholder="Ex. Project idea"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="custom-q-type">Type</label>
                <select
                  id="custom-q-type"
                  value={newCustom.type}
                  onChange={(e) => setNewCustom({ ...newCustom, type: e.target.value })}
                >
                  <option value="text">Texte court</option>
                  <option value="textarea">Texte long</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="select">Liste déroulante</option>
                  <option value="multiselect">Choix multiples</option>
                  <option value="checkbox">Case à cocher</option>
                </select>
              </div>
            </div>
            {(newCustom.type === 'select' || newCustom.type === 'multiselect') && (
              <div className={styles.field} style={{ marginTop: '0.75rem' }}>
                <label htmlFor="custom-q-options">Options (virgules)</label>
                <input
                  id="custom-q-options"
                  value={newCustom.options}
                  onChange={(e) => setNewCustom({ ...newCustom, options: e.target.value })}
                  placeholder="A, B, C"
                />
              </div>
            )}
            <label className={styles.checkRow}>
              <input
                className={styles.checkbox}
                type="checkbox"
                checked={newCustom.required}
                onChange={(e) => setNewCustom({ ...newCustom, required: e.target.checked })}
              />
              Obligatoire
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomToDraft}>
              + Ajouter à la sélection
            </button>

            {draftCustoms.length > 0 && (
              <div className={styles.customPicks}>
                {draftCustoms.map((c, i) => (
                  <div key={c.id} className={styles.customPick}>
                    <strong className={styles.questionLabel}>
                      {c.label}
                      {c.required ? <span className={styles.requiredMark}>*</span> : null}
                    </strong>
                    <div className={styles.actions}>
                      <span className={styles.chip}>{c.type}</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          setDraftCustoms((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className="btn btn-primary" onClick={integrate}>
              Intégrer au formulaire
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
