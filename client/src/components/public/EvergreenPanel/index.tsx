import { ContactLink } from '../ContactModal/ContactModalContext';
import styles from './EvergreenPanel.module.css';

const PILLARS = [
  { title: 'Every Game On', subtitle: 'All the screens, all season' },
  { title: 'Cold Pints, Always', subtitle: 'Guinness on tap, Jameson neat' },
  { title: 'Open 7 Days', subtitle: "'Til 2AM most nights" },
] as const;

function ShamrockWatermark() {
  return (
    <svg className={styles.shamrock} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="70" cy="70" r="42" fill="currentColor" />
      <circle cx="130" cy="70" r="42" fill="currentColor" />
      <circle cx="70" cy="130" r="42" fill="currentColor" />
      <circle cx="130" cy="130" r="42" fill="currentColor" />
      <rect x="96" y="120" width="8" height="60" rx="4" fill="currentColor" />
    </svg>
  );
}

function EvergreenPanel() {
  return (
    <section className={styles.panel} aria-labelledby="evergreen-heading">
      <ShamrockWatermark />
      <div className={styles.content}>
        <p className={styles.kicker}>★ The Usual ★</p>
        <h3 id="evergreen-heading" className={styles.headline}>
          Nothing big on the books — we&apos;re still open
        </h3>
        <p className={styles.lead}>
          No watch party or special event lined up right now. But the games are on every screen,
          the pints are cold, and there&apos;s always a stool with your name on it.
        </p>

        <div className={styles.pillars}>
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className={styles.pillar}>
              <h4 className={styles.pillarTitle}>{pillar.title}</h4>
              <p className={styles.pillarSub}>{pillar.subtitle}</p>
            </div>
          ))}
        </div>

        <div className={styles.ctas}>
          <a href="#instagram" className="btn btn-outline">
            Follow for Updates
          </a>
          <ContactLink className="btn btn-green">See Hours &amp; Find Us</ContactLink>
        </div>
      </div>
    </section>
  );
}

export default EvergreenPanel;
