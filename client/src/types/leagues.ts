import type {
  EntrantType,
  LeagueFormat,
  LeagueKind,
  LeagueStatus,
  MatchStatus,
  PoolFormat,
  Sport,
} from '../constants/leagues';

export interface SportsEnabled {
  pool: boolean;
  darts: boolean;
  volleyball: boolean;
}

export interface League {
  _id: string;
  sport: Sport;
  name: string;
  seasonStart: string;
  seasonEnd: string;
  kind?: LeagueKind;
  entrantType?: EntrantType;
  format: LeagueFormat;
  status: LeagueStatus;
  poolFormat?: PoolFormat;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeagueDetail extends League {
  divisionCount: number;
  teamCount: number;
}

export interface LeaguesOverviewLeague extends League {
  divisionCount: number;
  disputedCount: number;
}

export interface LeaguesOverviewDispute {
  matchId: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  homeTeamName: string;
  awayTeamName: string;
}

export interface LeaguesOverview {
  activeBySport: Record<Sport, number>;
  disputedMatchCount: number;
  upcomingMatchCount: number;
  disputedMatches: LeaguesOverviewDispute[];
  leagues: LeaguesOverviewLeague[];
}

export interface PoolHandicapRules {
  system: 'apa' | 'vnea' | 'none';
  skillLevelRange?: [number, number];
  handicapPerSkillLevel?: number;
}

export interface Division {
  _id: string;
  leagueId: string;
  name: string;
  order: number;
  handicapRules?: PoolHandicapRules;
  /** Individual entrants when league.entrantType === 'player' */
  playerIds?: string[];
}

export interface Team {
  _id: string;
  leagueId: string;
  divisionId: string;
  name: string;
  captainPlayerId?: string;
  playerIds: string[];
}

export interface Player {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  auth0Sub?: string;
  captainInvitedAt?: string;
  establishmentSlug: string;
}

export interface CaptainInviteResult {
  playerId: string;
  playerName: string;
  playerEmail: string;
  teamId: string;
  teamName: string;
  leagueId: string;
  loginUrl: string;
  invitedAt: string;
  alreadyLinked: boolean;
  instructions: string[];
  emailSubject: string;
  emailBody: string;
}

export interface LeagueFormState {
  sport: Sport;
  name: string;
  seasonStart: string;
  seasonEnd: string;
  kind: LeagueKind;
  entrantType: EntrantType;
  format: LeagueFormat;
  status: LeagueStatus;
  poolFormat: PoolFormat;
}

export interface MatchResult {
  winnerTeamId?: string;
  winnerPlayerId?: string;
  homeScore: number;
  awayScore: number;
  forfeitBy?: 'home' | 'away';
}

export interface MatchListItem {
  _id: string;
  sport: Sport;
  leagueId: string;
  divisionId: string;
  divisionName: string;
  homeTeamId?: string;
  homeTeamName: string;
  awayTeamId?: string;
  awayTeamName: string;
  homePlayerId?: string;
  homePlayerName?: string;
  awayPlayerId?: string;
  awayPlayerName?: string;
  poolFormat?: PoolFormat;
  raceTo?: number;
  handicapLabel?: string;
  scheduledAt: string;
  roundNumber: number;
  venue?: string;
  status: MatchStatus;
  result?: MatchResult;
}

export interface GenerateSchedulePayload {
  divisionId: string;
  startDate: string;
  roundIntervalDays?: number;
  matchTime?: string;
  replaceExisting?: boolean;
  /** Volleyball only: 2 = best of 3, 3 = best of 5 */
  setsToWin?: 2 | 3;
  /** Pool only: 8_ball or 9_ball */
  poolFormat?: PoolFormat;
  /** Pool player tournaments: games to win (default 5) */
  raceTo?: number;
}

export interface GenerateScheduleResult {
  matchesCreated: number;
  rounds: number;
  divisionId: string;
}

export interface StandingsEntry {
  teamId?: string;
  playerId?: string;
  teamName: string;
  playerName?: string;
  rank: number;
  placement?: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

export type StandingsType = 'season' | 'placement';

export interface StandingsView {
  divisionId: string;
  divisionName: string;
  computedAt: string;
  standingsType?: StandingsType;
  entries: StandingsEntry[];
}

export type CsvImportType = 'teams' | 'players' | 'schedule' | 'results';
export type CsvImportFormat = 'canonical' | 'compusport';

export interface CsvImportResult {
  type: CsvImportType;
  format: CsvImportFormat;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}
