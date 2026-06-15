import styles from './LeaguesEmptyPanel.module.css';

function LeaguesEmptyPanel() {
  return (
    <section className={styles.panel} aria-labelledby="leagues-empty-heading">
      <p className={styles.kicker}>★ League Night ★</p>
      <h3 id="leagues-empty-heading" className={styles.headline}>
        No leagues posted right now
      </h3>
      <p className={styles.lead}>
        Pool, darts, and volleyball seasons come and go — check back soon for standings and
        schedules, or ask at the bar about joining the next session.
      </p>
    </section>
  );
}

export default LeaguesEmptyPanel;
