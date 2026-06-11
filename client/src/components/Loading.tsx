import styles from './Loading.module.css';

function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.text}>Loading…</p>
    </div>
  );
}

export default Loading;
