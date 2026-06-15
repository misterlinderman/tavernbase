import { API_BASE_URL } from '../config/api';
import type { ApiListResponse } from '../types';
import type { League, StandingsView } from '../types/leagues';

export interface PublicLeague extends League {
  divisionCount?: number;
  teamCount?: number;
}

export interface PublicMatch {
  _id: string;
  roundNumber: number;
  scheduledAt: string;
  status: string;
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
  poolFormat?: '8_ball' | '9_ball';
  raceTo?: number;
  handicapLabel?: string;
  result?: {
    homeScore: number;
    awayScore: number;
    winnerTeamId?: string;
    winnerPlayerId?: string;
  };
}

export async function getPublicLeagues(): Promise<PublicLeague[]> {
  const res = await fetch(`${API_BASE_URL}/leagues`);

  if (!res.ok) {
    throw new Error('Failed to load leagues');
  }

  const json: ApiListResponse<PublicLeague> = await res.json();
  return json.data;
}

export async function getPublicLeague(leagueId: string): Promise<PublicLeague> {
  const res = await fetch(`${API_BASE_URL}/leagues/${leagueId}`);

  if (!res.ok) {
    throw new Error('Failed to load league');
  }

  const json = await res.json();
  return json.data as PublicLeague;
}

export async function getPublicStandings(
  leagueId: string,
  divisionId?: string
): Promise<StandingsView[]> {
  const query = divisionId ? `?divisionId=${divisionId}` : '';
  const res = await fetch(`${API_BASE_URL}/leagues/${leagueId}/standings${query}`);

  if (!res.ok) {
    throw new Error('Failed to load standings');
  }

  const json: ApiListResponse<StandingsView> = await res.json();
  return json.data;
}

export async function getPublicMatches(
  leagueId: string,
  divisionId?: string
): Promise<PublicMatch[]> {
  const query = divisionId ? `?divisionId=${divisionId}` : '';
  const res = await fetch(`${API_BASE_URL}/leagues/${leagueId}/matches${query}`);

  if (!res.ok) {
    throw new Error('Failed to load matches');
  }

  const json: ApiListResponse<PublicMatch> = await res.json();
  return json.data;
}
