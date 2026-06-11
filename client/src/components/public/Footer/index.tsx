import { BRAND_ASSETS } from '../../../constants/brandAssets';
import type { SiteSettings } from '../../../types';
import styles from './Footer.module.css';

export interface FooterProps {
  settings: SiteSettings;
}

function MapPinIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function ShamrockIcon() {
  return (
    <svg className={styles.shamrock} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="4" />
      <circle cx="16" cy="8" r="4" />
      <circle cx="8" cy="16" r="4" />
      <circle cx="16" cy="16" r="4" />
    </svg>
  );
}

function Footer({ settings }: FooterProps) {
  const sortedHours = [...settings.hours].sort((a, b) => a.order - b.order);
  const phoneHref = settings.contact.phone.replace(/[^\d+]/g, '');

  return (
    <footer id="contact" className={styles.footer}>
      <div className="wrap">
        <div className={styles.grid}>
          <div id="about" className={styles.col}>
            <img
              src={BRAND_ASSETS.headerLogo}
              alt="Barry O's Old Market Tavern"
              className={styles.logo}
              width={220}
              height={72}
            />
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>Find Us</h3>
            <p className={styles.contactRow}>
              <MapPinIcon />
              <span>{settings.contact.address}</span>
            </p>
            <p className={styles.contactRow}>
              <PhoneIcon />
              <a href={`tel:${phoneHref}`}>{settings.contact.phone}</a>
            </p>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>Hours</h3>
            <ul className={styles.hours}>
              {sortedHours.map((row) => (
                <li key={row.order} className={styles.hourRow}>
                  <span>{row.label}</span>
                  <span className={styles.hourValue}>{row.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="instagram" className={styles.col}>
            <h3 className={styles.colTitle}>Tagline</h3>
            <p className={styles.tagline}>
              Good Times. Cold Drinks. Great People.
              <ShamrockIcon />
            </p>
            {settings.about ? <p className={styles.about}>{settings.about}</p> : null}
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} Barry O&apos;s Old Market Tavern. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
