export type EventScheduleType = 'weekly' | 'dated';

export const TAVERN_TIME_ZONE = 'America/Detroit';

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

export function getCalendarDateParts(
  value: Date | string,
  timeZone = TAVERN_TIME_ZONE
): { year: number; month: number; day: number } {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
  };
}

export function toCalendarDateString(
  value: Date | string,
  timeZone = TAVERN_TIME_ZONE
): string {
  const { year, month, day } = getCalendarDateParts(value, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatWeeklyDayLabel(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? 'Day';
  return `${name.toUpperCase()}S`;
}

export function formatSpecificDateLabel(dateStr?: string): string | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  const month = date
    .toLocaleDateString('en-US', { month: 'short', timeZone: TAVERN_TIME_ZONE })
    .toUpperCase();
  const { day } = getCalendarDateParts(date);

  return `${month} ${day}`;
}

export function formatEventDateParts(dateStr?: string): { month: string; day: number | string } {
  if (!dateStr) {
    return { month: '—', day: '—' };
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { month: '—', day: '—' };
  }

  const month = date
    .toLocaleDateString('en-US', { month: 'short', timeZone: TAVERN_TIME_ZONE })
    .toUpperCase();
  const { day } = getCalendarDateParts(date);

  return { month, day };
}

export function toInputDate(value?: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return toCalendarDateString(date);
}

export function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TAVERN_TIME_ZONE,
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
  const today = toCalendarDateString(new Date());

  if (event.scheduleType === 'weekly') {
    if (!event.endDate) return false;
    return toCalendarDateString(event.endDate) < today;
  }

  return toCalendarDateString(event.date) < today;
}

export function isWeeklyEventStarted(event: {
  scheduleType?: EventScheduleType;
  startDate?: string;
}): boolean {
  if (event.scheduleType !== 'weekly' || !event.startDate) return true;

  return toCalendarDateString(event.startDate) <= toCalendarDateString(new Date());
}

export function isWeeklyEventLive(event: {
  scheduleType?: EventScheduleType;
  startDate?: string;
  endDate?: string;
}): boolean {
  if (event.scheduleType !== 'weekly' || !event.endDate) return false;

  const today = toCalendarDateString(new Date());

  if (toCalendarDateString(event.endDate) < today) return false;

  return isWeeklyEventStarted(event);
}
