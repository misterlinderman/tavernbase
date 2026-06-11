import { BRAND_ASSETS } from '../../../constants/brandAssets';
import type { SiteSettings } from '../../../types';
import styles from './ChristmasCTA.module.css';

export interface ChristmasCTAProps {
  christmasParty: SiteSettings['christmasParty'];
}

function formatPartyDate(dateStr?: string): string | null {
  if (!dateStr) return null;

  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function ChristmasCTA({ christmasParty }: ChristmasCTAProps) {
  if (!christmasParty.enabled) return null;

  const formattedDate = formatPartyDate(christmasParty.date);
  const ticketHref = christmasParty.ticketUrl || '#contact';

  return (
    <section id="christmas" className={styles.section}>
      <div className="wrap">
        <div className={styles.banner}>
          <div className={styles.left}>
            <img
              src={BRAND_ASSETS.christmasParty}
              alt=""
              aria-hidden="true"
              className={styles.partyArt}
              width={220}
              height={220}
            />
          </div>

          <div className={styles.center}>
            <h2 className={styles.title}>{christmasParty.title}</h2>
            {formattedDate ? <p className={styles.date}>{formattedDate}</p> : null}
            {christmasParty.note ? <p className={styles.note}>{christmasParty.note}</p> : null}
            <a
              href={ticketHref}
              className={`btn btn-green ${styles.ticketBtn}`}
              target={christmasParty.ticketUrl ? '_blank' : undefined}
              rel={christmasParty.ticketUrl ? 'noopener noreferrer' : undefined}
            >
              Get Tickets
            </a>
          </div>

          <div className={styles.right}>
            <img
              src={BRAND_ASSETS.christmasTickets}
              alt=""
              aria-hidden="true"
              className={styles.ticketArt}
              width={280}
              height={220}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ChristmasCTA;
