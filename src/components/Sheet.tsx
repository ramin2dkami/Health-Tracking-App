import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Sheet({
  title,
  onClose,
  onBack,
  dark = false,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  dark?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={`sheet ${dark ? 'sheet--dark' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__handle" />
        <div className="sheet__header">
          {onBack ? (
            <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
              <Icon name="chevronLeft" />
            </button>
          ) : (
            <span className="icon-btn icon-btn--ghost" />
          )}
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
