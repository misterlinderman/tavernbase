import mongoose from 'mongoose';
import type { Sport } from '../../../constants/leagues';

export interface ComputedStandingsEntry {
  teamId?: mongoose.Types.ObjectId;
  playerId?: mongoose.Types.ObjectId;
  teamName: string;
  rank: number;
  placement?: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

export interface StandingsEngine {
  sport: Sport;
  computeDivisionStandings(
    leagueId: mongoose.Types.ObjectId,
    divisionId: mongoose.Types.ObjectId
  ): Promise<ComputedStandingsEntry[]>;
}
