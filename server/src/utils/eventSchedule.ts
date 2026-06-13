export type EventScheduleType = 'weekly' | 'dated';

export interface EventScheduleFields {
  scheduleType?: EventScheduleType;
  date?: Date | string;
  dayOfWeek?: number;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ParsedEventSchedule {
  scheduleType: EventScheduleType;
  date?: Date;
  dayOfWeek?: number;
  startDate?: Date;
  endDate?: Date;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const TAVERN_TIME_ZONE = 'America/Detroit';

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

function calendarInputToUtcNoon(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    throw new Error('Invalid date');
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day, 12));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Invalid date');
  }

  return parsed;
}

export function parseCalendarDate(value: string): Date {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return calendarInputToUtcNoon(trimmed);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date');
  }

  return calendarInputToUtcNoon(toCalendarDateString(parsed));
}

export function getTodayBounds(now = new Date()) {
  const startOfToday = calendarInputToUtcNoon(toCalendarDateString(now));
  const endOfToday = startOfToday;

  return { startOfToday, endOfToday, now };
}

export function resolveScheduleType(event: EventScheduleFields): EventScheduleType {
  return event.scheduleType === 'weekly' ? 'weekly' : 'dated';
}

export function isWeeklyEventActive(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) !== 'weekly') return false;
  if (event.dayOfWeek === undefined || !event.startDate || !event.endDate) return false;

  return isWeeklyEventStarted(event, now) && !isWeeklySeasonEnded(event, now);
}

function isWeeklySeasonEnded(event: EventScheduleFields, now = new Date()): boolean {
  if (!event.endDate) return true;

  const endDate = new Date(event.endDate);
  if (Number.isNaN(endDate.getTime())) return true;

  return toCalendarDateString(endDate) < toCalendarDateString(now);
}

export function isWeeklyEventStarted(event: EventScheduleFields, now = new Date()): boolean {
  if (!event.startDate) return true;

  const startDate = new Date(event.startDate);
  if (Number.isNaN(startDate.getTime())) return true;

  return toCalendarDateString(startDate) <= toCalendarDateString(now);
}

export function isDatedEventActive(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) !== 'dated' || !event.date) return false;

  const eventDate = new Date(event.date);
  if (Number.isNaN(eventDate.getTime())) return false;

  return toCalendarDateString(eventDate) >= toCalendarDateString(now);
}

export function isEventActive(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) === 'weekly') {
    return isWeeklyEventActive(event, now) && getWeeklyNextOccurrence(event, now) !== null;
  }

  return isDatedEventActive(event, now);
}

export function isEventPast(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) === 'weekly') {
    if (!event.endDate) return false;
    return toCalendarDateString(event.endDate) < toCalendarDateString(now);
  }

  if (!event.date) return false;
  return toCalendarDateString(event.date) < toCalendarDateString(now);
}

export function getActiveEventsFilter(now = new Date()) {
  const { startOfToday, endOfToday } = getTodayBounds(now);

  return {
    $or: [
      {
        $or: [{ scheduleType: 'dated' }, { scheduleType: { $exists: false } }],
        date: { $gte: startOfToday },
      },
      {
        scheduleType: 'weekly',
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday },
      },
    ],
  };
}

function normalizeCalendarDate(value: Date | string): Date {
  return calendarInputToUtcNoon(toCalendarDateString(value));
}

export function getWeeklyNextOccurrence(
  event: EventScheduleFields,
  now = new Date()
): Date | null {
  if (resolveScheduleType(event) !== 'weekly') return null;
  if (event.dayOfWeek === undefined || !event.startDate || !event.endDate) return null;

  const { startOfToday } = getTodayBounds(now);
  const seasonStart = normalizeCalendarDate(event.startDate);
  const seasonEnd = normalizeCalendarDate(event.endDate);
  seasonEnd.setHours(23, 59, 59, 999);

  const searchFrom =
    startOfToday.getTime() > seasonStart.getTime() ? startOfToday : seasonStart;

  const cursor = new Date(searchFrom);

  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(cursor);
    candidate.setDate(cursor.getDate() + offset);

    if (candidate > seasonEnd) return null;
    if (candidate.getDay() === event.dayOfWeek) return candidate;
  }

  return null;
}

export function getEventSortDate(event: EventScheduleFields, now = new Date()): Date | null {
  if (resolveScheduleType(event) === 'weekly') {
    return getWeeklyNextOccurrence(event, now);
  }

  if (!event.date) return null;

  return normalizeCalendarDate(event.date);
}

export function sortEventsForDisplay<T extends EventScheduleFields>(
  events: T[],
  now = new Date()
): T[] {
  return [...events].sort((a, b) => {
    const aDate = getEventSortDate(a, now);
    const bDate = getEventSortDate(b, now);

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;

    const dateDiff = aDate.getTime() - bDate.getTime();
    if (dateDiff !== 0) return dateDiff;

    if (resolveScheduleType(a) === 'weekly' && resolveScheduleType(b) === 'weekly') {
      return (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0);
    }

    return 0;
  });
}

export function filterActiveEventsForDisplay<T extends EventScheduleFields>(
  events: T[],
  now = new Date()
): T[] {
  return events.filter((event) => isEventActive(event, now));
}

export function formatWeeklyDayLabel(dayOfWeek: number): string {
  const name = DAY_NAMES[dayOfWeek] ?? 'Day';
  return `${name.toUpperCase()}S`;
}

function parseDateInput(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }

  try {
    return parseCalendarDate(value);
  } catch {
    throw new Error(`Invalid ${fieldName}`);
  }
}

export function parseEventScheduleInput(body: Record<string, unknown>): ParsedEventSchedule {
  const scheduleType =
    body.scheduleType === 'weekly' ? 'weekly' : body.scheduleType === 'dated' ? 'dated' : null;

  if (!scheduleType) {
    throw new Error('scheduleType must be weekly or dated');
  }

  if (scheduleType === 'dated') {
    const date = parseDateInput(body.date, 'date');

    return { scheduleType, date };
  }

  const dayOfWeek = body.dayOfWeek;
  if (typeof dayOfWeek !== 'number' || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday)');
  }

  const startDate = parseDateInput(body.startDate, 'startDate');
  const endDate = parseDateInput(body.endDate, 'endDate');

  if (toCalendarDateString(endDate) < toCalendarDateString(startDate)) {
    throw new Error('endDate must be on or after startDate');
  }

  return {
    scheduleType,
    dayOfWeek,
    startDate,
    endDate,
    date: startDate,
  };
}

export interface EventWriteFields {
  set: Record<string, unknown>;
  unset: string[];
}

export function buildEventFieldsFromBody(body: Record<string, unknown>): EventWriteFields {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  if (body.type !== undefined) {
    set.type = body.type;
  }

  if (typeof body.title === 'string') {
    set.title = body.title.trim();
  }

  if (typeof body.description === 'string') {
    set.description = body.description.trim();
  }

  if (typeof body.timeLabel === 'string') {
    set.timeLabel = body.timeLabel.trim() || 'TBD';
  }

  if (body.scheduleType !== undefined) {
    const schedule = parseEventScheduleInput(body);
    set.scheduleType = schedule.scheduleType;
    set.date = schedule.date;

    if (schedule.scheduleType === 'dated') {
      unset.push('dayOfWeek', 'startDate', 'endDate');
    } else {
      set.dayOfWeek = schedule.dayOfWeek;
      set.startDate = schedule.startDate;
      set.endDate = schedule.endDate;
    }
  }

  return { set, unset };
}

export function toMongoUpdatePayload(fields: EventWriteFields): Record<string, unknown> {
  const update: Record<string, unknown> = { $set: fields.set };

  if (fields.unset.length > 0) {
    update.$unset = Object.fromEntries(fields.unset.map((field) => [field, '']));
  }

  return update;
}
