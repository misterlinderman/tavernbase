import type { CaptainMatch, SportScoresheetPayload } from '../types/captain';
import type { PlayerLeague, PlayerProfile } from '../types/player';
import type { StandingsView } from '../types/leagues';

type PlayerFetch = <T>(path: string, options?: RequestInit) => Promise<T>;
type PlayerFetchList = <T>(
  path: string,
  options?: RequestInit
) => Promise<{ data: T; count: number }>;

export async function activatePlayerAccount(playerFetch: PlayerFetch): Promise<void> {
  await playerFetch('/player/activate', { method: 'POST' });
}

export async function getPlayerProfile(playerFetch: PlayerFetch): Promise<PlayerProfile> {
  return playerFetch<PlayerProfile>('/player/me');
}

export async function listPlayerLeagues(playerFetchList: PlayerFetchList): Promise<PlayerLeague[]> {
  const { data } = await playerFetchList<PlayerLeague[]>('/player/leagues');
  return data;
}

export async function getPlayerLeagueStandings(
  playerFetchList: PlayerFetchList,
  leagueId: string
): Promise<StandingsView[]> {
  const { data } = await playerFetchList<StandingsView[]>(`/player/leagues/${leagueId}/standings`);
  return data;
}

export async function listPlayerMatches(
  playerFetchList: PlayerFetchList,
  status: 'open' | 'final' | 'all' = 'open'
): Promise<CaptainMatch[]> {
  const { data } = await playerFetchList<CaptainMatch[]>(`/player/matches?status=${status}`);
  return data;
}

export async function submitPlayerScoresheet(
  playerFetch: PlayerFetch,
  matchId: string,
  payload: SportScoresheetPayload
): Promise<void> {
  await playerFetch(`/player/matches/${matchId}/scoresheet`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}
