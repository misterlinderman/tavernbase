export const EVENT_TYPES = [
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

export type EventType = (typeof EVENT_TYPES)[number];
