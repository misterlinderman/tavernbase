import type { Sport } from '../constants/leagues';
import type { StandingsView } from './leagues';

export interface PlayerLeagueTeam {
  _id: string;
  name: string;
  divisionId: string;
  divisionName: string;
}

export interface PlayerLeagueEntrantDivision {
  divisionId: string;
  divisionName: string;
  seed: number;
}

export interface PlayerLeague {
  _id: string;
  sport: Sport;
  name: string;
  status: string;
  seasonStart: string;
  seasonEnd: string;
  format: string;
  teams: PlayerLeagueTeam[];
  entrantDivisions?: PlayerLeagueEntrantDivision[];
}

export interface PlayerProfile {
  name: string;
  email: string;
  playerId: string;
  playerName: string;
  leagues: PlayerLeague[];
}

export interface PlayerLeagueStandings {
  leagueId: string;
  standings: StandingsView[];
}
