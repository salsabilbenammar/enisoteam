import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    const opts =
      typeof options === 'string'
        ? { message: options }
        : options || {};

    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        title: opts.title || 'Confirmer la suppression',
        message: opts.message || 'Cette action est irréversible.',
        confirmLabel: opts.confirmLabel || 'Supprimer',
        cancelLabel: opts.cancelLabel || 'Annuler',
        tone: opts.tone || 'danger',
      });
    });
  }, []);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className={styles.overlay}
            onClick={() => close(false)}
            role="presentation"
          >
            <div
              className={`${styles.dialog} ${styles[state.tone] || ''}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.glow} aria-hidden="true" />
              <div className={styles.icon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12a1 1 0 0 0 1-1V8H5v12a1 1 0 0 0 1 1z" />
                </svg>
              </div>
              <h2 id="confirm-title" className={styles.title}>
                {state.title}
              </h2>
              <p id="confirm-message" className={styles.message}>
                {state.message}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancel}
                  onClick={() => close(false)}
                >
                  {state.cancelLabel}
                </button>
                <button
                  type="button"
                  className={styles.confirm}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {state.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
