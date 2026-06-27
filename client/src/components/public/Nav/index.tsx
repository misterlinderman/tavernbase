import { Link } from 'react-router-dom';
import { ContactLink } from '../ContactModal/ContactModalContext';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import { SPORTS } from '../../../constants/leagues';
import { useSiteSettings } from '../../../hooks/useSiteSettings';
import styles from './Nav.module.css';

function Nav() {
  const { settings } = useSiteSettings();
  const venueName = settings?.venueName ?? 'Your Tavern';
  const showLeagues = settings
    ? SPORTS.some((sport) => settings.sportsEnabled[sport])
    : false;

  return (
    <header className={styles.nav}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <img
            src={BRAND_ASSETS.headerLogo}
            alt={venueName}
            className={styles.logo}
            width={220}
            height={72}
          />
        </Link>

        <nav className={styles.links} aria-label="Primary">
          <Link to="/calendar">Events</Link>
          {showLeagues ? <Link to="/leagues">Leagues</Link> : null}
          <ContactLink>Contact</ContactLink>
          <Link to="/submit">Share a Photo</Link>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
