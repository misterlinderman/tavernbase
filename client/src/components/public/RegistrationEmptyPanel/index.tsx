import styles from './RegistrationEmptyPanel.module.css';

function RegistrationEmptyPanel() {
  return (
    <section className={styles.panel} aria-labelledby="registration-empty-heading">
      <p className={styles.kicker}>★ Sign-up window ★</p>
      <h3 id="registration-empty-heading" className={styles.headline}>
        No open registrations right now
      </h3>
      <p className={styles.lead}>
        League and tournament sign-ups open in waves — check back soon or ask at the bar about the
        next pool, darts, or volleyball session.
      </p>
    </section>
  );
}

export default RegistrationEmptyPanel;
