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

export const SPORT_LABELS: Record<Sport, string> = {
  pool: 'Pool',
  darts: 'Darts',
  volleyball: 'Volleyball',
};

export const FORMAT_LABELS: Record<LeagueFormat, string> = {
  round_robin: 'Round robin',
  ladder: 'Ladder',
  bracket: 'Bracket',
};

export const KIND_LABELS: Record<LeagueKind, string> = {
  league: 'Season league',
  tournament: 'Tournament',
};

export const ENTRANT_TYPE_LABELS: Record<EntrantType, string> = {
  team: 'Teams',
  player: 'Individual players',
};

export const TOURNAMENT_WARN_DAYS = 14;
export const TOURNAMENT_MAX_DAYS = 60;

export const STATUS_LABELS: Record<LeagueStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
};

export const POOL_FORMATS = ['8_ball', '9_ball'] as const;
export type PoolFormat = (typeof POOL_FORMATS)[number];

export const POOL_FORMAT_LABELS: Record<PoolFormat, string> = {
  '8_ball': '8-Ball',
  '9_ball': '9-Ball',
};

export const POOL_HANDICAP_SYSTEMS = ['none', 'apa', 'vnea'] as const;
export type PoolHandicapSystem = (typeof POOL_HANDICAP_SYSTEMS)[number];

export const POOL_HANDICAP_SYSTEM_LABELS: Record<PoolHandicapSystem, string> = {
  none: 'None',
  apa: 'APA',
  vnea: 'VNEA',
};

export const SCORESHEET_SIDES = ['home', 'away'] as const;
export type ScoresheetSide = (typeof SCORESHEET_SIDES)[number];

export const MATCH_STATUSES = [
  'scheduled',
  'in_progress',
  'final',
  'forfeit',
  'cancelled',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  final: 'Final',
  forfeit: 'Forfeit',
  cancelled: 'Cancelled',
};
