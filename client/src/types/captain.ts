import type {
  LeagueStatus,
  MatchStatus,
  RegistrationStatus,
  ScoresheetSide,
  Sport,
} from '../constants/leagues';

export interface PoolScoresheetPayload {
  homeRaceWins: number;
  awayRaceWins: number;
}

export interface DartsScoresheetPayload {
  homeLegsWon: number;
  awayLegsWon: number;
}

export interface VolleyballScoresheetPayload {
  homeSetWins: number;
  awaySetWins: number;
}

export type SportScoresheetPayload =
  | PoolScoresheetPayload
  | DartsScoresheetPayload
  | VolleyballScoresheetPayload;

export type ScoresheetStatus = 'draft' | 'submitted' | 'disputed' | 'approved';

export interface ScoresheetRecord {
  _id: string;
  matchId: string;
  submittedBy: ScoresheetSide;
  submittedByPlayerId: string;
  status: ScoresheetStatus;
  payload: SportScoresheetPayload;
  reviewedAt?: string;
}

export type CaptainSubmissionState =
  | 'scheduled'
  | 'awaiting_you'
  | 'awaiting_opponent'
  | 'disputed'
  | 'final';

export interface CaptainMatch {
  _id: string;
  leagueId: string;
  leagueName: string;
  sport?: Sport;
  setsToWin?: 2 | 3;
  poolFormat?: '8_ball' | '9_ball';
  raceTo?: number;
  handicapLabel?: string;
  divisionName: string;
  homeTeamId?: string;
  homeTeamName: string;
  awayTeamId?: string;
  awayTeamName: string;
  homePlayerId?: string;
  awayPlayerId?: string;
  scheduledAt: string;
  roundNumber: number;
  status: MatchStatus;
  mySide: ScoresheetSide | null;
  submissionState: CaptainSubmissionState;
  canSubmit: boolean;
  scoresheets: {
    home: ScoresheetRecord | null;
    away: ScoresheetRecord | null;
  };
  result?: {
    homeScore: number;
    awayScore: number;
    winnerTeamId?: string;
    winnerPlayerId?: string;
  };
}

export interface CaptainTeamRegistration {
  isOpen: boolean;
  enabled: boolean;
  opensAt?: string;
  closesAt?: string;
  entryFeeDisplay: string;
  requiresApproval: boolean;
  registrationId?: string;
  registrationStatus?: RegistrationStatus;
}

export interface CaptainTeamSummary {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  status: LeagueStatus;
  registration: CaptainTeamRegistration;
}

export interface CaptainTeamRosterView {
  teamId: string;
  teamName: string;
  leagueId: string;
  leagueName: string;
  sport: Sport;
  leagueStatus: LeagueStatus;
  canEdit: boolean;
  editBlockedReason?: string;
  rosterMin: number;
  rosterMax: number;
  captainPlayerId: string;
  players: CaptainRosterPlayerEntry[];
}

export interface CaptainRosterPlayerEntry {
  playerId: string;
  name: string;
  email?: string;
  isCaptain: boolean;
  loginLinked: boolean;
}

export interface CaptainAddRosterPlayerResult {
  roster: CaptainTeamRosterView;
  inviteSent: boolean;
  inviteNote?: string;
}

export interface CaptainReturningSeasonOption {
  priorTeamId: string;
  priorTeamName: string;
  priorLeagueId: string;
  priorLeagueName: string;
  targetLeagueId: string;
  targetLeagueName: string;
  entryFeeDisplay: string;
  requiresApproval: boolean;
  isOpen: boolean;
  registrationId?: string;
  registrationStatus?: RegistrationStatus;
}

export interface ReturningRosterPlayerPreview {
  playerId: string;
  name: string;
  email: string;
  isCaptain: boolean;
}

export interface ReturningTeamRegistrationPreview {
  priorTeamId: string;
  priorTeamName: string;
  priorLeagueId: string;
  priorLeagueName: string;
  targetLeagueId: string;
  targetLeagueName: string;
  teamName: string;
  roster: ReturningRosterPlayerPreview[];
  registration: {
    isOpen: boolean;
    entryFeeDisplay: string;
    requiresApproval: boolean;
    waiverText?: string;
    opensAt?: string;
    closesAt?: string;
  };
  rosterMin: number;
  rosterMax: number;
  divisions: Array<{ _id: string; name: string; order: number }>;
}

export interface CaptainProfile {
  name: string;
  email: string;
  playerId: string;
  playerName: string;
  teams: CaptainTeamSummary[];
  pastTeams: CaptainTeamSummary[];
  returningSeasonOptions: CaptainReturningSeasonOption[];
}

export interface DisputedMatch {
  match: {
    _id: string;
    scheduledAt: string;
    roundNumber: number;
    status: MatchStatus;
  };
  homeTeamName: string;
  awayTeamName: string;
  scoresheets: {
    home: ScoresheetRecord | null;
    away: ScoresheetRecord | null;
  };
}
