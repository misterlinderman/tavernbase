import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminApi';
import { useToast } from '../../components/admin/shared/Toast';
import {
  DAY_OF_WEEK_OPTIONS,
  formatDateRange,
  isEventPast,
  isWeeklyEventLive,
  isWeeklyEventStarted,
} from '../../constants/eventSchedule';
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  getEventTypeCategory,
  type EventType,
  type EventTypeGroup,
} from '../../constants/eventTypes';
import type { Event, EventScheduleType } from '../../types';
import formStyles from '../../components/admin/shared/adminForm.module.css';
import styles from './EventsPage.module.css';

const EVENT_TYPE_GROUPS: EventTypeGroup[] = ['Watch parties', 'Game-day shuttles', 'Other'];

const EMPTY_FORM = {
  scheduleType: 'dated' as EventScheduleType,
  type: 'watch_party_football' as EventType,
  date: '',
  dayOfWeek: 1,
  startDate: '',
  endDate: '',
  timeLabel: '',
  title: '',
  description: '',
};

function formatEventDate(dateStr?: string) {
  if (!dateStr) {
    return { month: '—', day: '—' };
  }

  const date = new Date(dateStr);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
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

    if (!form.title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    if (form.scheduleType === 'dated' && !form.date) {
      toast('Date is required for a specific event', 'error');
      return;
    }

    if (form.scheduleType === 'weekly' && (!form.startDate || !form.endDate)) {
      toast('Start and end dates are required for weekly events', 'error');
      return;
    }

    setSubmitting(true);

    try {
      await adminFetch<Event>('/admin/events', {
        method: 'POST',
        body: JSON.stringify({
          type: form.type,
          scheduleType: form.scheduleType,
          date: form.scheduleType === 'dated' ? form.date : undefined,
          dayOfWeek: form.scheduleType === 'weekly' ? form.dayOfWeek : undefined,
          startDate: form.scheduleType === 'weekly' ? form.startDate : undefined,
          endDate: form.scheduleType === 'weekly' ? form.endDate : undefined,
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
          <div className={styles.fullWidth}>
            <span className={formStyles.fieldLabel}>Schedule</span>
            <div className={styles.scheduleOptions}>
              <label className={styles.scheduleOption}>
                <input
                  type="radio"
                  name="schedule-type"
                  value="dated"
                  checked={form.scheduleType === 'dated'}
                  onChange={() => setForm({ ...form, scheduleType: 'dated' })}
                />
                <span>Specific date</span>
              </label>
              <label className={styles.scheduleOption}>
                <input
                  type="radio"
                  name="schedule-type"
                  value="weekly"
                  checked={form.scheduleType === 'weekly'}
                  onChange={() => setForm({ ...form, scheduleType: 'weekly' })}
                />
                <span>Weekly</span>
              </label>
            </div>
            <p className={styles.help}>
              {form.scheduleType === 'weekly'
                ? 'Shows on the public site through the end date (including before the start date). The day label appears on each weekly card.'
                : 'A one-time event on a single date. No day-of-week label on the public site.'}
            </p>
          </div>

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
              {EVENT_TYPE_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {EVENT_TYPE_OPTIONS.filter((option) => option.group === group).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {form.scheduleType === 'dated' ? (
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
          ) : (
            <>
              <div>
                <label className={formStyles.fieldLabel} htmlFor="event-day">
                  Day of week
                </label>
                <select
                  id="event-day"
                  className={formStyles.select}
                  value={form.dayOfWeek}
                  onChange={(e) =>
                    setForm({ ...form, dayOfWeek: Number(e.target.value) })
                  }
                >
                  {DAY_OF_WEEK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formStyles.fieldLabel} htmlFor="event-start-date">
                  Start date
                </label>
                <input
                  id="event-start-date"
                  type="date"
                  className={formStyles.input}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className={formStyles.fieldLabel} htmlFor="event-end-date">
                  End date
                </label>
                <input
                  id="event-end-date"
                  type="date"
                  className={formStyles.input}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
            </>
          )}

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
              const isWeekly = item.scheduleType === 'weekly';
              const past = isEventPast({
                scheduleType: item.scheduleType ?? 'dated',
                date: item.date ?? item.startDate ?? '',
                endDate: item.endDate,
              });
              const { month, day } = isWeekly
                ? { month: 'WK', day: DAY_OF_WEEK_OPTIONS.find((d) => d.value === item.dayOfWeek)?.label.slice(0, 3).toUpperCase() ?? '—' }
                : formatEventDate(item.date);
              const scheduleRange = isWeekly ? formatDateRange(item.startDate, item.endDate) : null;
              const weeklyLive = isWeekly && isWeeklyEventLive(item);
              const weeklyStarted = isWeekly && isWeeklyEventStarted(item);

              return (
                <li key={item._id} className={`${styles.eventRow} ${past ? styles.past : ''}`}>
                  <div className={`${styles.dateBlock} ${isWeekly ? styles.weeklyBlock : ''}`}>
                    <span className={styles.month}>{month}</span>
                    <span className={styles.day}>{day}</span>
                  </div>
                  <div className={styles.eventBody}>
                    <div className={styles.eventHeader}>
                      <h3 className={styles.eventTitle}>{item.title}</h3>
                      <span className={`pill ${styles[`type_${getEventTypeCategory(item.type)}`]}`}>
                        {EVENT_TYPE_LABELS[item.type]}
                      </span>
                      {isWeekly ? <span className={`pill ${styles.schedulePill}`}>Weekly</span> : null}
                      {weeklyLive && !weeklyStarted ? (
                        <span className={`pill ${styles.upcomingPill}`}>On site · starts later</span>
                      ) : null}
                      {weeklyLive && weeklyStarted ? (
                        <span className={`pill ${styles.livePill}`}>Live on site</span>
                      ) : null}
                      {past ? <span className={`pill past ${styles.pastPill}`}>Past · hidden</span> : null}
                    </div>
                    <p className={styles.eventTime}>{item.timeLabel}</p>
                    {scheduleRange ? <p className={styles.eventSchedule}>{scheduleRange}</p> : null}
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
