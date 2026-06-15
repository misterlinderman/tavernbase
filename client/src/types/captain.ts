import type { MatchStatus, ScoresheetSide, Sport } from '../constants/leagues';

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

export interface CaptainProfile {
  name: string;
  email: string;
  playerId: string;
  playerName: string;
  teams: Array<{ _id: string; name: string; leagueId: string }>;
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
