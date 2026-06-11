import { BRAND_ASSETS } from './brandAssets';

export const EVENT_TYPE_VALUES = [
  'watch_party_baseball',
  'watch_party_football',
  'watch_party_basketball',
  'shuttle_baseball',
  'shuttle_football',
  'shuttle_basketball',
  'live_music',
  'holiday',
  'community',
  'sports',
  'shuttle',
] as const;

export type EventType = (typeof EVENT_TYPE_VALUES)[number];

export type EventTypeGroup = 'Watch parties' | 'Game-day shuttles' | 'Other';

export interface EventTypeOption {
  value: EventType;
  label: string;
  group: EventTypeGroup;
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: 'watch_party_baseball', label: 'Baseball watch party', group: 'Watch parties' },
  { value: 'watch_party_football', label: 'Football watch party', group: 'Watch parties' },
  { value: 'watch_party_basketball', label: 'Basketball watch party', group: 'Watch parties' },
  { value: 'shuttle_baseball', label: 'Baseball shuttle', group: 'Game-day shuttles' },
  { value: 'shuttle_football', label: 'Football shuttle', group: 'Game-day shuttles' },
  { value: 'shuttle_basketball', label: 'Basketball shuttle', group: 'Game-day shuttles' },
  { value: 'live_music', label: 'Live music', group: 'Other' },
  { value: 'holiday', label: 'Holiday', group: 'Other' },
  { value: 'community', label: 'Community / Potluck', group: 'Other' },
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  watch_party_baseball: 'Baseball watch party',
  watch_party_football: 'Football watch party',
  watch_party_basketball: 'Basketball watch party',
  shuttle_baseball: 'Baseball shuttle',
  shuttle_football: 'Football shuttle',
  shuttle_basketball: 'Basketball shuttle',
  live_music: 'Live music',
  holiday: 'Holiday',
  community: 'Community',
  sports: 'Sports',
  shuttle: 'Shuttle',
};

export type EventTypeCategory =
  | 'watch_party'
  | 'shuttle'
  | 'live_music'
  | 'holiday'
  | 'community';

const EVENT_TYPE_ICONS: Record<EventType, string> = {
  watch_party_baseball: '/images/icons/icon-baseball.svg',
  watch_party_football: '/images/icons/icon-football.svg',
  watch_party_basketball: '/images/icons/icon-basketball.svg',
  shuttle_baseball: '/images/icons/icon-baseball.svg',
  shuttle_football: '/images/icons/icon-football.svg',
  shuttle_basketball: '/images/icons/icon-basketball.svg',
  live_music: '/images/icons/icon-livemusic.svg',
  holiday: BRAND_ASSETS.footerLogo,
  community: '/images/icons/icon-potluck.svg',
  sports: '/images/icons/icon-football.svg',
  shuttle: '/images/icons/icon-football.svg',
};

export function getEventTypeCategory(type: EventType): EventTypeCategory {
  if (type.startsWith('watch_party') || type === 'sports') {
    return 'watch_party';
  }

  if (type.startsWith('shuttle') || type === 'shuttle') {
    return 'shuttle';
  }

  if (type === 'live_music') {
    return 'live_music';
  }

  if (type === 'holiday') {
    return 'holiday';
  }

  return 'community';
}

export function getEventIconPath(type: EventType): string {
  return EVENT_TYPE_ICONS[type];
}

export function usesColoredEventIcon(type: EventType): boolean {
  return type === 'holiday';
}
