import { getEventIconPath, usesColoredEventIcon } from '../../../constants/eventTypes';
import type { Event } from '../../../types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
}

function formatWeekdayLabel(dateStr: string): string {
  const weekday = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  return `${weekday}S`;
}

function EventCard({ event }: EventCardProps) {
  const weekdayLabel = formatWeekdayLabel(event.date);
  const iconPath = getEventIconPath(event.type);
  const coloredIcon = usesColoredEventIcon(event.type);

  return (
    <article className={styles.card}>
      <p className={styles.day}>{weekdayLabel}</p>

      <div className={styles.iconWrap}>
        <img
          src={iconPath}
          alt=""
          aria-hidden="true"
          className={coloredIcon ? styles.iconLogo : styles.icon}
        />
      </div>

      <h3 className={styles.title}>{event.title}</h3>
      <p className={styles.time}>{event.timeLabel}</p>
    </article>
  );
}

export default EventCard;
