import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './MediaPage.module.css';

const BASE = import.meta.env.VITE_API_URL;

function filenameFromUrl(url?: string): string {
  if (!url) return 'No video set';

  try {
    const segment = url.split('/').pop()?.split('?')[0];
    return segment ? decodeURIComponent(segment) : url;
  } catch {
    return url;
  }
}

function MediaPage() {
  const { adminFetch } = useAdminApi();
  const { getAccessTokenSilently } = useAuth0();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [handle, setHandle] = useState('');
  const [showApprovedInGallery, setShowApprovedInGallery] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => {
        setVideoUrl(settings.hero?.videoUrl);
        setHandle(settings.instagram.handle ?? '');
        setShowApprovedInGallery(settings.instagram.showApprovedInGallery);
      })
      .catch(() => toast('Could not load media settings', 'error'))
      .finally(() => setLoading(false));
  }, [adminFetch, toast]);

  const uploadHeroVideo = async (file: File): Promise<string> => {
    const token = await getAccessTokenSilently();
    const formData = new FormData();
    formData.append('video', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}/admin/media/hero`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const json = JSON.parse(xhr.responseText) as { data: { videoUrl: string } };
          resolve(json.data.videoUrl);
          return;
        }

        let message = 'Upload failed';
        try {
          const json = JSON.parse(xhr.responseText) as { error?: string };
          message = json.error ?? message;
        } catch {
          // keep default
        }
        reject(new Error(message));
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast('Please choose a video file', 'error');
      return;
    }

    setUploadProgress(0);

    try {
      const nextUrl = await uploadHeroVideo(file);
      setVideoUrl(nextUrl);
      toast('Hero video uploaded', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleInstagramSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({
          instagram: {
            handle: handle.trim(),
            showApprovedInGallery,
          },
        }),
      });
      toast('Instagram settings saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save Instagram settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading media settings…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Media &amp; Social</h1>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Hero video</h2>
        <p className={styles.currentFile}>{filenameFromUrl(videoUrl)}</p>
        {videoUrl ? <p className={styles.url}>{videoUrl}</p> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className={styles.hiddenInput}
          onChange={handleFileSelect}
        />

        <button
          type="button"
          className="btn btn-green"
          disabled={uploadProgress !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadProgress !== null ? `Uploading ${uploadProgress}%` : 'Upload video'}
        </button>

        {uploadProgress !== null ? (
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
          </div>
        ) : null}
      </section>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Instagram &amp; gallery</h2>
        <form className={styles.form} onSubmit={handleInstagramSave}>
          <div>
            <label className={formStyles.fieldLabel} htmlFor="instagram-handle">
              Instagram handle
            </label>
            <input
              id="instagram-handle"
              type="text"
              className={formStyles.input}
              placeholder="@barryostavern"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          <Toggle
            checked={showApprovedInGallery}
            onChange={setShowApprovedInGallery}
            label="Gallery on site"
          />

          <div className={styles.actions}>
            <button type="submit" className="btn btn-green" disabled={saving}>
              {saving ? 'Saving…' : 'Save Instagram settings'}
            </button>
            <Link to="/admin/submissions" className="btn btn-outline">
              Go to photo submissions
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

export default MediaPage;
