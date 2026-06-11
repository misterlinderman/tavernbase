import { Link } from 'react-router-dom';
import styles from './Nav.module.css';

function Nav() {
  return (
    <header className={styles.nav}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={`script ${styles.brandName}`}>Barry O&apos;s</span>
          <span className={styles.brandSub}>Old Market Tavern</span>
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
