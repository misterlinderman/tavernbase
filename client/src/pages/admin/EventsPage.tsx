import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useToast } from '../../components/admin/shared/Toast';
import type { Event, EventType } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './EventsPage.module.css';

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: 'sports', label: 'Sports / Watch party' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'shuttle', label: 'Game-day shuttle' },
  { value: 'community', label: 'Community / Potluck' },
];

const TYPE_LABELS: Record<EventType, string> = {
  sports: 'Sports',
  holiday: 'Holiday',
  shuttle: 'Shuttle',
  community: 'Community',
};

const EMPTY_FORM = {
  type: 'sports' as EventType,
  date: '',
  timeLabel: '',
  title: '',
  description: '',
};

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
}

function isPastEvent(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function EventsPage() {
  const { adminFetch } = useAdminApi();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = useCallback(async () => {
    const data = await adminFetch<Event[]>('/admin/events');
    setEvents(data);
  }, [adminFetch]);

  useEffect(() => {
    loadEvents()
      .catch(() => toast('Could not load events', 'error'))
      .finally(() => setLoading(false));
  }, [loadEvents, toast]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.date || !form.title.trim()) {
      toast('Date and title are required', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await adminFetch<Event>('/admin/events', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          date: form.date,
          timeLabel: form.timeLabel.trim() || 'TBD',
          title: form.title.trim(),
          description: form.description.trim(),
        }),
      });

      setForm(EMPTY_FORM);
      await loadEvents();
      toast('Event added', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;

    try {
      await adminFetch(`/admin/events/${eventId}`, { method: 'DELETE' });
      await loadEvents();
      toast('Event deleted', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete event', 'error');
    }
  };

  return (
    <div>
      <h1 className={formStyles.pageTitle}>Events</h1>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>Add event</h2>
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          <div>
            <label className={formStyles.fieldLabel} htmlFor="event-type">
              Type
            </label>
            <select
              id="event-type"
              className={formStyles.select}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
            >
              {EVENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={formStyles.fieldLabel} htmlFor="event-date">
              Date
            </label>
            <input
              id="event-date"
              type="date"
              className={formStyles.input}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className={formStyles.fieldLabel} htmlFor="event-time">
              Time
            </label>
            <input
              id="event-time"
              type="text"
              className={formStyles.input}
              placeholder="e.g. 6:30 PM"
              value={form.timeLabel}
              onChange={(e) => setForm({ ...form, timeLabel: e.target.value })}
            />
          </div>

          <div className={styles.fullWidth}>
            <label className={formStyles.fieldLabel} htmlFor="event-title">
              Title
            </label>
            <input
              id="event-title"
              type="text"
              className={formStyles.input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className={styles.fullWidth}>
            <label className={formStyles.fieldLabel} htmlFor="event-description">
              Description
            </label>
            <textarea
              id="event-description"
              className={formStyles.textarea}
              maxLength={400}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <p className={formStyles.charCount}>{form.description.length}/400</p>
          </div>

          <div className={styles.fullWidth}>
            <button type="submit" className="btn btn-green" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add event'}
            </button>
          </div>
        </form>
      </section>

      <section className={`${formStyles.panel} ${styles.section}`}>
        <h2 className={formStyles.sectionTitle}>All events</h2>
        {loading ? (
          <ul className={styles.eventList} aria-busy="true">
            {[0, 1, 2].map((key) => (
              <li key={key} className={styles.eventRow} aria-hidden="true">
                <div className={`${styles.dateBlock} ${styles.skeletonBlock} skeletonPulse`} />
                <div className={`${styles.eventBody} ${styles.skeletonBody} skeletonPulse`} />
              </li>
            ))}
          </ul>
        ) : events.length === 0 ? (
          <p className={styles.empty}>No events yet.</p>
        ) : (
          <ul className={styles.eventList}>
            {events.map((item) => {
              const { month, day } = formatEventDate(item.date);
              const past = isPastEvent(item.date);

              return (
                <li key={item._id} className={`${styles.eventRow} ${past ? styles.past : ''}`}>
                  <div className={styles.dateBlock}>
                    <span className={styles.month}>{month}</span>
                    <span className={styles.day}>{day}</span>
                  </div>
                  <div className={styles.eventBody}>
                    <div className={styles.eventHeader}>
                      <h3 className={styles.eventTitle}>{item.title}</h3>
                      <span className={`pill ${styles[`type_${item.type}`]}`}>
                        {TYPE_LABELS[item.type]}
                      </span>
                      {past ? <span className={`pill past ${styles.pastPill}`}>Past · hidden</span> : null}
                    </div>
                    <p className={styles.eventTime}>{item.timeLabel}</p>
                    {item.description ? <p className={styles.eventDesc}>{item.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    className={formStyles.btnDanger}
                    aria-label={`Delete event: ${item.title}`}
                    onClick={() => handleDelete(item._id, item.title)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default EventsPage;
