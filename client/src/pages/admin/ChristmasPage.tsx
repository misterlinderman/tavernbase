import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ChristmasCTA from '../../components/public/ChristmasCTA';
import Toggle from '../../components/admin/shared/Toggle';
import { useToast } from '../../components/admin/shared/Toast';
import { useAdminApi } from '../../hooks/useAdminApi';
import type { SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './ChristmasPage.module.css';

type ChristmasForm = SiteSettings['christmasParty'];

function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getDaysAwayLabel(dateStr: string): string {
  if (!dateStr) return 'No date set';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `${diff} days away`;
}

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function ChristmasPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [form, setForm] = useState<ChristmasForm>({
    enabled: false,
    title: 'Annual Christmas Party',
    note: '',
    ticketUrl: '',
  });
  const [dateInput, setDateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => {
        setForm(settings.christmasParty);
        setDateInput(toDateInputValue(settings.christmasParty.date));
      })
      .catch(() => toast('Could not load Christmas settings', 'error'))
      .finally(() => setLoading(false));
  }, [adminFetch, toast]);

  const previewParty = useMemo<ChristmasForm>(
    () => ({
      ...form,
      date: dateInput ? `${dateInput}T12:00:00.000Z` : undefined,
    }),
    [form, dateInput]
  );

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!isValidUrl(form.ticketUrl)) {
      toast('Ticket URL must be a valid http or https link', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload: ChristmasForm = {
        ...form,
        date: dateInput ? `${dateInput}T12:00:00.000Z` : undefined,
      };

      const updated = await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({ christmasParty: payload }),
      });

      setForm(updated.christmasParty);
      setDateInput(toDateInputValue(updated.christmasParty.date));
      toast('Christmas party saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save Christmas settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading Christmas editor…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Christmas Party</h1>

      <div className={styles.grid}>
        <section className={`${formStyles.panel} ${styles.editor}`}>
          <form className={styles.form} onSubmit={handleSave}>
            <Toggle
              checked={form.enabled}
              onChange={(enabled) => setForm({ ...form, enabled })}
              label="Christmas party banner"
            />

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-title">
                Headline
              </label>
              <input
                id="christmas-title"
                type="text"
                className={formStyles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-date">
                Party date
              </label>
              <input
                id="christmas-date"
                type="date"
                className={formStyles.input}
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
              <p className={styles.daysAway}>{getDaysAwayLabel(dateInput)}</p>
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-note">
                Note
              </label>
              <textarea
                id="christmas-note"
                className={formStyles.textarea}
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="christmas-ticket">
                Ticket URL
              </label>
              <input
                id="christmas-ticket"
                type="url"
                className={formStyles.input}
                placeholder="https://..."
                value={form.ticketUrl}
                onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })}
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
            {previewParty.enabled ? (
              <ChristmasCTA christmasParty={previewParty} />
            ) : (
              <p className={styles.hiddenNote}>Hidden from the public site.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChristmasPage;
