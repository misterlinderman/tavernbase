import { useEffect, useId, useRef } from 'react';
import type { SiteSettings } from '../../../types';
import styles from './AskModal.module.css';

export interface AskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: SiteSettings['contact'];
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function AskModal({ isOpen, onClose, contact }: AskModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const phoneHref = contact?.phone.replace(/[^\d+]/g, '') ?? '';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon />
        </button>

        <p className={styles.kicker}>You found it</p>
        <h2 id={titleId} className={styles.title}>
          Ask Us
        </h2>
        <p className={styles.lead}>
          Got a question about hours, events, or booking the bar? Give us a ring or swing by —
          someone behind the bar always has an answer.
        </p>

        {contact ? (
          <div className={styles.contact}>
            <p className={styles.contactRow}>
              <MapPinIcon />
              <span>{contact.address}</span>
            </p>
            <p className={styles.contactRow}>
              <PhoneIcon />
              <a href={`tel:${phoneHref}`}>{contact.phone}</a>
            </p>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className="btn btn-green" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default AskModal;
