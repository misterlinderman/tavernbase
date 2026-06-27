import { Link } from 'react-router-dom';
import EventCalendarList from '../../components/public/EventCalendarList';
import EvergreenPanel from '../../components/public/EvergreenPanel';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useEvents } from '../../hooks/useEvents';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import homeStyles from './HomePage.module.css';
import styles from './CalendarPage.module.css';

function CalendarSkeleton() {
  return (
    <div className={styles.skeletonList}>
      {[0, 1, 2].map((key) => (
        <div key={key} className={`${styles.skeletonRow} skeletonPulse`} />
      ))}
    </div>
  );
}

function CalendarPage() {
  const { events, loading } = useEvents();
  const { settings, loading: settingsLoading } = useSiteSettings();

  if (settingsLoading) {
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
            <Link to="/" className={styles.backLink}>
              ← Back to Home
            </Link>
            <h1 className={styles.title}>Event Calendar</h1>
            <p className={styles.subtitle}>
              Watch parties, shuttles, live music, and everything else coming up at{' '}
              {settings?.venueName ?? 'the tavern'}.
            </p>
          </header>

          {loading ? (
            <>
              <p className="sr-only">Loading events…</p>
              <CalendarSkeleton />
            </>
          ) : events.length > 0 ? (
            <EventCalendarList events={events} />
          ) : (
            <EvergreenPanel />
          )}
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default CalendarPage;
