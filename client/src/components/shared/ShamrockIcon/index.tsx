export interface ShamrockIconProps {
  className?: string;
}

function ShamrockIcon({ className }: ShamrockIconProps) {
  return (
    <i
      className={className ? `fa-solid fa-clover ${className}` : 'fa-solid fa-clover'}
      aria-hidden="true"
    />
  );
}

export default ShamrockIcon;
