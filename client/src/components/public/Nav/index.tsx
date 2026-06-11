import { Link } from 'react-router-dom';
import { BRAND_ASSETS } from '../../../constants/brandAssets';
import styles from './Nav.module.css';

function Nav() {
  return (
    <header className={styles.nav}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <img
            src={BRAND_ASSETS.headerLogo}
            alt="Barry O's Old Market Tavern"
            className={styles.logo}
            width={220}
            height={72}
          />
        </Link>

        <nav className={styles.links} aria-label="Primary">
          <a href="/#events">Events</a>
          <a href="/#contact">Contact</a>
          <Link to="/submit">Share a Photo</Link>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
