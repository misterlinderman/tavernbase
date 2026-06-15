import AnnouncementBar from '../../components/public/AnnouncementBar';
import ChristmasCTA from '../../components/public/ChristmasCTA';
import EventsSection from '../../components/public/EventsSection';
import LeaguesSection from '../../components/public/LeaguesSection';
import Footer from '../../components/public/Footer';
import Gallery from '../../components/public/Gallery';
import Hero from '../../components/public/Hero';
import Nav from '../../components/public/Nav';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import styles from './HomePage.module.css';

function HomePageSkeleton() {
  return (
    <>
      <Nav />
      <main id="main" className={styles.skeletonMain}>
        <div className={`${styles.skeletonHero} skeletonPulse`} aria-hidden="true" />
        <div className="wrap section">
          <div className={`${styles.skeletonHeading} skeletonPulse`} aria-hidden="true" />
          <div className={styles.skeletonGrid} aria-hidden="true">
            <div className={`${styles.skeletonCard} skeletonPulse`} />
            <div className={`${styles.skeletonCard} skeletonPulse`} />
          </div>
        </div>
      </main>
      <p className="sr-only">Loading Barry O&apos;s…</p>
    </>
  );
}

function HomePage() {
  const { settings, loading, error, refetch } = useSiteSettings();

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (!settings) {
    return (
      <>
        <Nav />
        <main id="main" className={styles.errorMain}>
          <div className={styles.errorPanel} role="alert">
            <h1 className={styles.errorTitle}>Barry O&apos;s Old Market Tavern</h1>
            <p className={styles.errorText}>
              We couldn&apos;t load the latest site info right now, but the bar is still open.
              Check back in a moment or give us a call.
            </p>
            {error ? (
              <button type="button" className="btn btn-green" onClick={() => refetch()}>
                Try again
              </button>
            ) : null}
          </div>
        </main>
        <footer className={styles.minimalFooter}>
          <p>&copy; {new Date().getFullYear()} Barry O&apos;s Old Market Tavern · Royal Oak, MI</p>
        </footer>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main id="main">
        <Hero
          videoUrl={settings.hero?.videoUrl}
          posterUrl={settings.hero?.posterUrl}
          headline={settings.hero.headline}
          subheadline={settings.hero.subheadline}
        />
        <AnnouncementBar {...settings.announcement} />
        <EventsSection />
        <LeaguesSection />
        <ChristmasCTA christmasParty={settings.christmasParty} />
        <Gallery
          instagramHandle={settings.instagram?.handle}
          enabled={settings.instagram?.showApprovedInGallery !== false}
        />
      </main>
      <Footer settings={settings} />
    </>
  );
}

export default HomePage;
