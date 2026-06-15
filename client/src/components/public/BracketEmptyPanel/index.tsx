import styles from './BracketEmptyPanel.module.css';

function BracketEmptyPanel() {
  return (
    <section className={styles.panel} aria-labelledby="bracket-empty-heading">
      <p className={styles.kicker}>★ Knockout bracket ★</p>
      <h3 id="bracket-empty-heading" className={styles.headline}>
        Bracket not generated yet
      </h3>
      <p className={styles.lead}>
        Staff will post the draw here once players are seeded and the bracket is built. Check
        back before event day — or ask at the bar for the latest schedule.
      </p>
    </section>
  );
}

export default BracketEmptyPanel;
