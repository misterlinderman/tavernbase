import AnnouncementBar from '../../components/public/AnnouncementBar';
import ChristmasCTA from '../../components/public/ChristmasCTA';
import EventsSection from '../../components/public/EventsSection';
import Footer from '../../components/public/Footer';
import Gallery from '../../components/public/Gallery';
import Hero from '../../components/public/Hero';
import Nav from '../../components/public/Nav';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import styles from './HomePage.module.css';

function HomePage() {
  const { settings, loading } = useSiteSettings();

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.loadingText}>Loading Barry O&apos;s…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.loading}>
        <p className={styles.loadingText}>Unable to load site settings.</p>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <Hero videoUrl={settings.hero?.videoUrl} posterUrl={settings.hero?.posterUrl} />
      <AnnouncementBar {...settings.announcement} />
      <EventsSection />
      <ChristmasCTA christmasParty={settings.christmasParty} />
      <Gallery
        instagramHandle={settings.instagram?.handle}
        enabled={settings.instagram?.showApprovedInGallery !== false}
      />
      <Footer settings={settings} />
    </>
  );
}

export default HomePage;
