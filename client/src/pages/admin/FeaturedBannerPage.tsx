import { FormEvent, useEffect, useMemo, useState } from 'react';
import FeaturedBanner from '../../components/public/FeaturedBanner';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './FeaturedBannerPage.module.css';

type FeaturedBannerForm = SiteSettings['featuredBanner'];

function isValidButtonUrl(value: string): boolean {
  if (!value.trim()) return true;

  if (value.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function FeaturedBannerPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [form, setForm] = useState<FeaturedBannerForm>({
    enabled: false,
    title: 'Featured Event',
    subtitle: '',
    note: '',
    buttonLabel: 'Learn More',
    buttonUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => {
        setForm(settings.featuredBanner);
      })
      .catch(() => toast('Could not load featured banner settings', 'error'))
      .finally(() => setLoading(false));
  }, [adminFetch, toast]);

  const previewBanner = useMemo(() => form, [form]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!isValidButtonUrl(form.buttonUrl)) {
      toast('Button link must be a valid http(s) URL or site path starting with /', 'error');
      return;
    }

    setSaving(true);

    try {
      const updated = await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ featuredBanner: form }),
      });

      setForm(updated.featuredBanner);
      toast('Featured banner saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save featured banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading featured banner editor…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Featured Banner</h1>
      <p className={styles.intro}>
        A prominent homepage banner for special events, ticketed nights, or seasonal promotions.
      </p>

      <div className={styles.grid}>
        <section className={`${formStyles.panel} ${styles.editor}`}>
          <form className={styles.form} onSubmit={handleSave}>
            <Toggle
              checked={form.enabled}
              onChange={(enabled) => setForm({ ...form, enabled })}
              label="Show featured banner on homepage"
            />

            <div>
              <label className={formStyles.fieldLabel} htmlFor="featured-title">
                Headline
              </label>
              <input
                id="featured-title"
                type="text"
                className={formStyles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="featured-subtitle">
                Subtitle
              </label>
              <input
                id="featured-subtitle"
                type="text"
                className={formStyles.input}
                placeholder="e.g. Saturday, March 15 · Doors at 7 PM"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="featured-note">
                Description
              </label>
              <textarea
                id="featured-note"
                className={formStyles.textarea}
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="featured-button-label">
                Button label
              </label>
              <input
                id="featured-button-label"
                type="text"
                className={formStyles.input}
                value={form.buttonLabel}
                onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="featured-button-url">
                Button link
              </label>
              <input
                id="featured-button-url"
                type="text"
                className={formStyles.input}
                placeholder="https://… or /calendar"
                value={form.buttonUrl}
                onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-green" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className={`${formStyles.panel} ${styles.previewPanel}`}>
          <h2 className={formStyles.sectionTitle}>Live preview</h2>
          <div className={styles.previewFrame}>
            {previewBanner.enabled ? (
              <FeaturedBanner featuredBanner={previewBanner} />
            ) : (
              <p className={styles.hiddenNote}>Hidden from the public site.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default FeaturedBannerPage;
