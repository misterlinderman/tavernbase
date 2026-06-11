import { Link } from 'react-router-dom';
import Footer from '../../components/public/Footer';
import Nav from '../../components/public/Nav';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import homeStyles from './HomePage.module.css';
import styles from './ThankYouPage.module.css';

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 12.5l3 3 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThankYouPage() {
  const { settings, loading } = useSiteSettings();

  if (loading) {
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
          <div className={styles.card}>
            <CheckIcon />
            <h1 className={styles.title}>Thanks — got it!</h1>
            <p className={styles.message}>
              A staff member will take a look before it goes up on the site.
            </p>
            <Link to="/submit" className="btn btn-outline">
              Submit another photo
            </Link>
          </div>
        </div>
      </main>
      {settings ? <Footer settings={settings} /> : null}
    </>
  );
}

export default ThankYouPage;
