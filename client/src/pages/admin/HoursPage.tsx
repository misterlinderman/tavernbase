import { FormEvent, useEffect, useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useToast } from '../../components/admin/shared/Toast';
import type { SiteSettings } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './HoursPage.module.css';

interface HourRow {
  label: string;
  value: string;
  order: number;
}

function normalizeRows(hours: SiteSettings['hours']): HourRow[] {
  return [...hours]
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({
      label: row.label,
      value: row.value,
      order: index + 1,
    }));
}

function HoursPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [rows, setRows] = useState<HourRow[]>([]);
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<SiteSettings>('/admin/site')
      .then((settings) => {
        setRows(normalizeRows(settings.hours));
        setHeadline(settings.hero?.headline ?? 'A Neighborhood Tradition');
        setSubheadline(settings.hero?.subheadline ?? 'Old Market Tavern');
        setAddress(settings.contact.address ?? '');
        setPhone(settings.contact.phone ?? '');
        setTagline(settings.tagline ?? 'Good Times. Cold Drinks. Great People.');
        setAbout(settings.about ?? '');
      })
      .catch(() => toast('Could not load hours and info', 'error'))
      .finally(() => setLoading(false));
  }, [adminFetch, toast]);

  const updateRow = (index: number, field: 'label' | 'value', value: string) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeRow = (index: number) => {
    setRows((current) =>
      current
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, order: i + 1 }))
    );
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((row, i) => ({ ...row, order: i + 1 }));
    });
  };

  const addRow = () => {
    setRows((current) => [...current, { label: '', value: '', order: current.length + 1 }]);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!headline.trim()) {
      toast('Hero headline is required', 'error');
      return;
    }

    setSaving(true);

    try {
      await adminFetch<SiteSettings>('/admin/site', {
        method: 'PUT',
        body: JSON.stringify({
          hours: rows.map((row, index) => ({
            label: row.label.trim(),
            value: row.value.trim(),
            order: index + 1,
          })),
          hero: {
            headline: headline.trim(),
            subheadline: subheadline.trim() || 'Old Market Tavern',
          },
          contact: { address: address.trim(), phone: phone.trim() },
          tagline: tagline.trim(),
          about: about.trim(),
        }),
      });
      toast('Hours and info saved', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save hours and info', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Loading hours editor…</p>;
  }

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Hours &amp; Info</h1>

      <form onSubmit={handleSave}>
        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Homepage hero</h2>
          <p className={styles.help}>
            The large headline and green subtitle visitors see over the hero video.
          </p>
          <div className={styles.contactGrid}>
            <div className={styles.fullWidth}>
              <label className={formStyles.fieldLabel} htmlFor="hero-headline">
                Hero headline
              </label>
              <input
                id="hero-headline"
                type="text"
                className={formStyles.input}
                maxLength={120}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
              />
              <p className={formStyles.charCount}>{headline.length}/120</p>
            </div>
            <div className={styles.fullWidth}>
              <label className={formStyles.fieldLabel} htmlFor="hero-subheadline">
                Hero subtitle
              </label>
              <input
                id="hero-subheadline"
                type="text"
                className={formStyles.input}
                maxLength={80}
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
              />
              <p className={formStyles.charCount}>{subheadline.length}/80</p>
            </div>
          </div>
        </section>

        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Hours</h2>
          <ul className={styles.rowList}>
            {rows.map((row, index) => (
              <li key={row.order} className={styles.row}>
                <input
                  type="text"
                  className={formStyles.input}
                  placeholder="Mon – Thu"
                  value={row.label}
                  onChange={(e) => updateRow(index, 'label', e.target.value)}
                />
                <input
                  type="text"
                  className={formStyles.input}
                  placeholder="11AM – 2AM"
                  value={row.value}
                  onChange={(e) => updateRow(index, 'value', e.target.value)}
                />
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label="Move row up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move row down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={formStyles.btnDanger}
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-outline" onClick={addRow}>
            + Add row
          </button>
        </section>

        <section className={`${formStyles.panel} ${styles.section}`}>
          <h2 className={formStyles.sectionTitle}>Contact, tagline &amp; about</h2>
          <div className={styles.contactGrid}>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="contact-address">
                Address
              </label>
              <input
                id="contact-address"
                type="text"
                className={formStyles.input}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className={formStyles.fieldLabel} htmlFor="contact-phone">
                Phone
              </label>
              <input
                id="contact-phone"
                type="text"
                className={formStyles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className={styles.fullWidth}>
              <label className={formStyles.fieldLabel} htmlFor="tagline-text">
                Tagline
              </label>
              <input
                id="tagline-text"
                type="text"
                className={formStyles.input}
                maxLength={200}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
              <p className={formStyles.charCount}>{tagline.length}/200</p>
            </div>
            <div className={styles.fullWidth}>
              <label className={formStyles.fieldLabel} htmlFor="about-text">
                About
              </label>
              <textarea
                id="about-text"
                className={formStyles.textarea}
                rows={4}
                maxLength={400}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
              <p className={formStyles.charCount}>{about.length}/400</p>
            </div>
          </div>
        </section>

        <button type="submit" className="btn btn-green" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

export default HoursPage;
