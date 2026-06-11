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

export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month ||
      parsed.getDate() !== day
    ) {
      throw new Error('Invalid date');
    }

    return parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date');
  }

  return parsed;
}

export function getTodayBounds(now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  return { startOfToday, endOfToday, now };
}

export function resolveScheduleType(event: EventScheduleFields): EventScheduleType {
  return event.scheduleType === 'weekly' ? 'weekly' : 'dated';
}

export function isWeeklyEventActive(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) !== 'weekly') return false;
  if (event.dayOfWeek === undefined || !event.endDate) return false;

  const { startOfToday } = getTodayBounds(now);
  const endDate = new Date(event.endDate);

  if (Number.isNaN(endDate.getTime())) return false;

  endDate.setHours(23, 59, 59, 999);

  // Visible through the end of the season so recurring items can populate the grid
  // before their first occurrence (start date is informational for staff).
  return endDate >= startOfToday;
}

export function isWeeklyEventStarted(event: EventScheduleFields, now = new Date()): boolean {
  if (!event.startDate) return true;

  const { startOfToday } = getTodayBounds(now);
  const startDate = new Date(event.startDate);

  if (Number.isNaN(startDate.getTime())) return true;

  startDate.setHours(0, 0, 0, 0);
  return startDate <= startOfToday;
}

export function isDatedEventActive(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) !== 'dated' || !event.date) return false;

  const { startOfToday } = getTodayBounds(now);
  const eventDate = new Date(event.date);

  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate >= startOfToday;
}

export function isEventActive(event: EventScheduleFields, now = new Date()): boolean {
  return resolveScheduleType(event) === 'weekly'
    ? isWeeklyEventActive(event, now)
    : isDatedEventActive(event, now);
}

export function isEventPast(event: EventScheduleFields, now = new Date()): boolean {
  if (resolveScheduleType(event) === 'weekly') {
    if (!event.endDate) return false;
    const { startOfToday } = getTodayBounds(now);
    const endDate = new Date(event.endDate);
    endDate.setHours(23, 59, 59, 999);
    return endDate < startOfToday;
  }

  if (!event.date) return false;
  const { startOfToday } = getTodayBounds(now);
  return new Date(event.date) < startOfToday;
}

export function getActiveEventsFilter(now = new Date()) {
  const { startOfToday } = getTodayBounds(now);

  return {
    $or: [
      {
        $or: [{ scheduleType: 'dated' }, { scheduleType: { $exists: false } }],
        date: { $gte: startOfToday },
      },
      {
        scheduleType: 'weekly',
        endDate: { $gte: startOfToday },
      },
    ],
  };
}

function mondayFirstOrder(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

export function sortEventsForDisplay<T extends EventScheduleFields>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aWeekly = resolveScheduleType(a) === 'weekly';
    const bWeekly = resolveScheduleType(b) === 'weekly';

    if (aWeekly !== bWeekly) {
      return aWeekly ? 1 : -1;
    }

    if (aWeekly && bWeekly) {
      const dayDiff =
        mondayFirstOrder(a.dayOfWeek ?? 0) - mondayFirstOrder(b.dayOfWeek ?? 0);
      if (dayDiff !== 0) return dayDiff;

      return new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime();
    }

    return new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime();
  });
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

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (endDate < startDate) {
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
