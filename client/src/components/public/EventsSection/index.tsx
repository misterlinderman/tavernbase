import { useEvents } from '../../../hooks/useEvents';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import EvergreenPanel from '../EvergreenPanel';
import EventsGrid from '../EventsGrid';
import styles from './EventsSection.module.css';

function EventsSkeleton() {
  return (
    <div className={styles.skeletonGrid}>
      {[0, 1, 2, 3, 4].map((key) => (
        <div key={key} className={`${styles.skeletonCard} skeletonPulse`} />
      ))}
    </div>
  );
}

function EventsSection() {
  const { events, loading } = useEvents();
  const { settings } = useSiteSettings();
  const venueName = settings?.venueName ?? 'Your Tavern';

  return (
    <section id="events" className="section" aria-busy={loading}>
      <div className="wrap">
        <h2 className="sec-head">What&apos;s On at {venueName}</h2>

        {loading ? (
          <>
            <p className="sr-only">Loading events…</p>
            <EventsSkeleton />
          </>
        ) : events.length > 0 ? (
          <EventsGrid events={events} />
        ) : (
          <EvergreenPanel />
        )}
      </div>
    </section>
  );
}

export default EventsSection;
