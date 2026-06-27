import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { MAX_UPLOAD_BYTES, postSubmission } from '../../services/submissions';
import homeStyles from './HomePage.module.css';
import styles from './SubmitPage.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CAPTION_MAX = 280;
const DEFAULT_CONSENT_TEXT =
  'I took this photo (or have permission to share it), everyone pictured is okay with it being posted, and I give this venue permission to use it on their website and social media.';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG, or WebP image.';
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return 'That photo is too large — please choose one under 8 MB.';
  }

  return null;
}

function SubmitPage() {
  const navigate = useNavigate();
  const { settings, loading } = useSiteSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const venueName = settings?.venueName ?? 'Your Tavern';
  const consentText = settings?.photoConsentText ?? DEFAULT_CONSENT_TEXT;

  const nameId = useId();
  const captionId = useId();
  const photoId = useId();
  const consentId = useId();
  const errorId = useId();

  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(name.trim() && file && consent && !fileError && !submitting);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectFile = useCallback((nextFile: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!nextFile) {
      setFile(null);
      setPreviewUrl(null);
      setFileError(null);
      return;
    }

    const error = validateFile(nextFile);

    if (error) {
      setFile(null);
      setPreviewUrl(null);
      setFileError(error);
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setFileError(null);
    setSubmitError(null);
  }, [previewUrl]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      selectFile(dropped);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canSubmit || !file) return;

    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('submitterName', name.trim());
    formData.append('caption', caption.trim());
    formData.append('consent', 'true');
    formData.append('photo', file);

    try {
      await postSubmission(formData);
      navigate('/thank-you');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={homeStyles.loading}>
        <div className={homeStyles.spinner} aria-hidden="true" />
        <p className={homeStyles.loadingText}>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <main id="main" className={`section ${styles.main}`}>
        <div className="wrap">
          <header className={styles.header}>
            <h1 className={styles.title}>Share a photo of {venueName}</h1>
            <p className={styles.subtitle}>
              Got a great shot from the bar? Send it our way and a staff member will review it before
              anything goes live.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={nameId}>
                Your name
              </label>
              <input
                id={nameId}
                className={styles.input}
                type="text"
                name="submitterName"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={captionId}>
                Caption <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id={captionId}
                className={styles.textarea}
                name="caption"
                rows={3}
                maxLength={CAPTION_MAX}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              <p className={styles.counter} aria-live="polite">
                {caption.length}/{CAPTION_MAX}
              </p>
            </div>

            <div className={styles.field}>
              <span className={styles.label} id={`${photoId}-label`}>
                Photo
              </span>
              <div
                className={
                  dragging
                    ? `${styles.dropzone} ${styles.dropzoneActive}`
                    : file
                      ? `${styles.dropzone} ${styles.dropzoneFilled}`
                      : styles.dropzone
                }
                role="button"
                tabIndex={0}
                aria-labelledby={`${photoId}-label`}
                aria-describedby={fileError ? `${photoId}-error` : undefined}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragging(false);
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id={photoId}
                  className={styles.fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
                />

                {previewUrl ? (
                  <div className={styles.preview}>
                    <img src={previewUrl} alt="Preview of selected photo" />
                    <div className={styles.previewMeta}>
                      <p className={styles.fileName}>{file?.name}</p>
                      {file ? <p className={styles.fileSize}>{formatFileSize(file.size)}</p> : null}
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropContent}>
                    <p className={styles.dropTitle}>Drop your photo here</p>
                    <p className={styles.dropHint}>or click to choose a file</p>
                    <p className={styles.dropNote}>JPEG, PNG, or WebP · max 8 MB</p>
                  </div>
                )}
              </div>

              {fileError ? (
                <p id={`${photoId}-error`} className={styles.fieldError} role="alert">
                  {fileError}
                </p>
              ) : null}
            </div>

            <div className={styles.consentField}>
              <input
                id={consentId}
                className={styles.checkbox}
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <label className={styles.consentLabel} htmlFor={consentId}>
                {consentText}
              </label>
            </div>

            {submitError ? (
              <p id={errorId} className={styles.submitError} role="alert">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-green"
              disabled={!canSubmit}
              aria-describedby={submitError ? errorId : undefined}
            >
              {submitting ? 'Sending…' : 'Submit photo'}
            </button>
          </form>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default SubmitPage;
