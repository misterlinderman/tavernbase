export type EventScheduleType = 'weekly' | 'dated';

export const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
] as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function formatWeeklyDayLabel(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? 'Day';
  return `${name.toUpperCase()}S`;
}

export function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function isEventPast(event: {
  scheduleType?: EventScheduleType;
  date: string;
  endDate?: string;
}): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (event.scheduleType === 'weekly') {
    if (!event.endDate) return false;
    const endDate = new Date(event.endDate);
    endDate.setHours(23, 59, 59, 999);
    return endDate < startOfToday;
  }

  return new Date(event.date) < startOfToday;
}
