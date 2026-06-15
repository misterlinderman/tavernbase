import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
}

function Toggle({ checked, onChange, label, disabled = false, title }: ToggleProps) {
  const statusLabel = checked ? 'Showing on site' : 'Hidden';

  return (
    <div className={styles.wrap} title={title}>
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
          disabled={disabled}
        >
          <span className={styles.knob} />
        </button>
      </div>
    </div>
  );
}

export default Toggle;
