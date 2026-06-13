import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { MESSAGE_MAX, postContactMessage } from '../../../services/contact';
import type { SiteSettings } from '../../../types';
import styles from './ContactModal.module.css';

export interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: SiteSettings['contact'];
  hours: SiteSettings['hours'];
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

function ContactModal({ isOpen, onClose, contact, hours }: ContactModalProps) {
  const titleId = useId();
  const emailId = useId();
  const phoneId = useId();
  const messageId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const sortedHours = [...hours].sort((a, b) => a.order - b.order);
  const phoneHref = contact.phone.replace(/[^\d+]/g, '');
  const canSubmit = email.trim() && message.trim() && !submitting;

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPhone('');
      setMessage('');
      setSubmitting(false);
      setSubmitError(null);
      setSubmitted(false);
      return;
    }

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

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await postContactMessage({
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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

        <p className={styles.kicker}>Royal Oak, MI</p>
        <h2 id={titleId} className={styles.title}>
          {submitted ? 'Message Sent' : 'Find Us'}
        </h2>

        {submitted ? (
          <>
            <p className={styles.lead}>
              Thanks for reaching out — someone from the bar will get back to you soon.
            </p>
            <div className={styles.actions}>
              <button type="button" className="btn btn-green" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.lead}>
              Send us a message and we&apos;ll get back to you.
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <p className={styles.formTitle}>Send a message</p>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={emailId}>
                  Email
                </label>
                <input
                  id={emailId}
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={phoneId}>
                  Phone <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id={phoneId}
                  className={styles.input}
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={messageId}>
                  Message
                </label>
                <textarea
                  id={messageId}
                  className={styles.textarea}
                  name="message"
                  rows={4}
                  required
                  maxLength={MESSAGE_MAX}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <p className={styles.counter} aria-live="polite">
                  {message.length}/{MESSAGE_MAX}
                </p>
              </div>

              {submitError ? (
                <p className={styles.error} role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className={styles.actions}>
                <button type="submit" className="btn btn-green" disabled={!canSubmit}>
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </form>

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

            {sortedHours.length > 0 ? (
              <div className={styles.hours}>
                <p className={styles.hoursTitle}>Hours</p>
                <ul className={styles.hoursList}>
                  {sortedHours.map((row) => (
                    <li key={row.order} className={styles.hourRow}>
                      <span>{row.label}</span>
                      <span className={styles.hourValue}>{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default ContactModal;
