import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  const statusLabel = checked ? 'Showing on site' : 'Hidden';

  return (
    <div className={styles.wrap}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.controlRow}>
        <span className={styles.statusLabel}>{statusLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`${label}: ${statusLabel}`}
          className={`${styles.switch} ${checked ? styles.on : ''}`}
          onClick={() => onChange(!checked)}
        >
          <span className={styles.knob} />
        </button>
      </div>
    </div>
  );
}

export default Toggle;
