import type { Event } from '../../../types';
import EventCard from '../EventCard';
import styles from './EventsGrid.module.css';

export interface EventsGridProps {
  events: Event[];
}

function EventsGrid({ events }: EventsGridProps) {
  return (
    <>
      <div className={styles.grid}>
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

      <div className={styles.footer}>
        <a href="#events" className="btn btn-outline">
          View Full Calendar
        </a>
      </div>
    </>
  );
}

export default EventsGrid;
