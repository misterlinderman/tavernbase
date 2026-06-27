import { FormEvent, useEffect, useState } from 'react';
import AnnouncementBar from '../../components/public/AnnouncementBar';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './AnnouncementPage.module.css';

const LINK_TARGETS: SiteSettings['announcement']['linkTarget'][] = [
  'Events',
  'Featured',
  'Menu',
  'Contact',
];

type AnnouncementForm = SiteSettings['announcement'];

function AnnouncementPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [form, setForm] = useState<AnnouncementForm>({
    enabled: false,
    message: '',
    linkTarget: 'Events',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => setForm(settings.announcement))
      .catch(() => toast('Could not load announcement settings', 'error'))
      .finally(() => setLoading(false));
  }, [adminFetch, toast]);

  const saveAnnouncement = async (next: AnnouncementForm) => {
    setSaving(true);

    try {
      const updated = await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ announcement: next }),
      });
      setForm(updated.announcement);
      toast('Announcement saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save announcement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    const next = { ...form, enabled };
    setForm(next);
    await saveAnnouncement(next);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    await saveAnnouncement(form);
  };

  if (loading) {
    return <p className={styles.loading}>Loading announcement editor…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Announcement Bar</h1>

      <div className={styles.grid}>
        <section className={`${formStyles.panel} ${styles.editor}`}>
          <Toggle checked={form.enabled} onChange={handleToggle} label="Announcement bar" />

          <form className={styles.form} onSubmit={handleSave}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="announcement-message">
                Message
              </label>
              <textarea
                id="announcement-message"
                className={formStyles.textarea}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
              />
              <p className={formStyles.charCount}>{form.message.length} characters (~160 recommended)</p>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="announcement-link">
                Link target
              </label>
              <select
                id="announcement-link"
                className={formStyles.select}
                value={form.linkTarget}
                onChange={(e) =>
                  setForm({
                    ...form,
                    linkTarget: e.target.value as AnnouncementForm['linkTarget'],
                  })
                }
              >
                {LINK_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-green" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className={`${formStyles.panel} ${styles.previewPanel}`}>
          <h2 className={formStyles.sectionTitle}>Live preview</h2>
          <div className={styles.previewFrame}>
            {form.enabled ? (
              <AnnouncementBar
                enabled={form.enabled}
                message={form.message || 'Your announcement message will appear here.'}
                linkTarget={form.linkTarget}
              />
            ) : (
              <p className={styles.hiddenNote}>Hidden from the public site.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AnnouncementPage;
