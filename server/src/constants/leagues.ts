export const SPORTS = ['pool', 'darts', 'volleyball'] as const;
export type Sport = (typeof SPORTS)[number];

export const LEAGUE_FORMATS = ['round_robin', 'ladder', 'bracket'] as const;
export type LeagueFormat = (typeof LEAGUE_FORMATS)[number];

export const LEAGUE_KINDS = ['league', 'tournament'] as const;
export type LeagueKind = (typeof LEAGUE_KINDS)[number];

export const ENTRANT_TYPES = ['team', 'player'] as const;
export type EntrantType = (typeof ENTRANT_TYPES)[number];

export const LEAGUE_STATUSES = ['draft', 'active', 'completed'] as const;
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

export const MATCH_STATUSES = [
  'scheduled',
  'in_progress',
  'final',
  'forfeit',
  'cancelled',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const SCORESHEET_STATUSES = ['draft', 'submitted', 'disputed', 'approved'] as const;
export type ScoresheetStatus = (typeof SCORESHEET_STATUSES)[number];

export const SCORESHEET_SIDES = ['home', 'away'] as const;
export type ScoresheetSide = (typeof SCORESHEET_SIDES)[number];

export const POOL_FORMATS = ['8_ball', '9_ball'] as const;
export type PoolFormat = (typeof POOL_FORMATS)[number];

export const POOL_FORMAT_LABELS: Record<PoolFormat, string> = {
  '8_ball': '8-Ball',
  '9_ball': '9-Ball',
};

export const REGISTRATION_CURRENCIES = ['usd'] as const;
export type RegistrationCurrency = (typeof REGISTRATION_CURRENCIES)[number];

export const REGISTRATION_STATUSES = [
  'draft',
  'pending_payment',
  'pending_approval',
  'approved',
  'waitlisted',
  'rejected',
  'cancelled',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Statuses that consume a registration spot while awaiting or after approval */
export const REGISTRATION_SPOT_STATUSES: RegistrationStatus[] = [
  'pending_payment',
  'pending_approval',
  'approved',
  'waitlisted',
];

/** Default race-to for pool singles (player-entrant) tournament matches */
export const DEFAULT_POOL_PLAYER_RACE_TO = 5;

export function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && SPORTS.includes(value as Sport);
}

export function isLeagueFormat(value: unknown): value is LeagueFormat {
  return typeof value === 'string' && LEAGUE_FORMATS.includes(value as LeagueFormat);
}

export function isLeagueKind(value: unknown): value is LeagueKind {
  return typeof value === 'string' && LEAGUE_KINDS.includes(value as LeagueKind);
}

export function isEntrantType(value: unknown): value is EntrantType {
  return typeof value === 'string' && ENTRANT_TYPES.includes(value as EntrantType);
}

export function isLeagueStatus(value: unknown): value is LeagueStatus {
  return typeof value === 'string' && LEAGUE_STATUSES.includes(value as LeagueStatus);
}

export function isPoolFormat(value: unknown): value is PoolFormat {
  return typeof value === 'string' && POOL_FORMATS.includes(value as PoolFormat);
}

export function isRegistrationCurrency(value: unknown): value is RegistrationCurrency {
  return typeof value === 'string' && REGISTRATION_CURRENCIES.includes(value as RegistrationCurrency);
}

export function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return typeof value === 'string' && REGISTRATION_STATUSES.includes(value as RegistrationStatus);
}
