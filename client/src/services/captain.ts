import type {
  CaptainAddRosterPlayerResult,
  CaptainMatch,
  CaptainProfile,
  CaptainTeamRosterView,
  SportScoresheetPayload,
} from '../types/captain';

type CaptainFetch = <T>(path: string, options?: RequestInit) => Promise<T>;
type CaptainFetchList = <T>(
  path: string,
  options?: RequestInit
) => Promise<{ data: T; count: number }>;

export async function activateCaptainAccount(captainFetch: CaptainFetch): Promise<void> {
  await captainFetch('/captain/activate', { method: 'POST' });
}

export async function getCaptainProfile(captainFetch: CaptainFetch): Promise<CaptainProfile> {
  return captainFetch<CaptainProfile>('/captain/me');
}

export async function listCaptainMatches(
  captainFetchList: CaptainFetchList,
  status: 'open' | 'final' | 'all' = 'open'
): Promise<CaptainMatch[]> {
  const { data } = await captainFetchList<CaptainMatch[]>(`/captain/matches?status=${status}`);
  return data;
}

export async function getCaptainMatch(
  captainFetch: CaptainFetch,
  matchId: string
): Promise<CaptainMatch> {
  return captainFetch<CaptainMatch>(`/captain/matches/${matchId}`);
}

export async function submitScoresheet(
  captainFetch: CaptainFetch,
  matchId: string,
  payload: SportScoresheetPayload
): Promise<void> {
  await captainFetch(`/captain/matches/${matchId}/scoresheet`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export async function getCaptainTeamRoster(
  captainFetch: CaptainFetch,
  teamId: string
): Promise<CaptainTeamRosterView> {
  return captainFetch<CaptainTeamRosterView>(`/captain/teams/${teamId}/roster`);
}

export async function addCaptainTeamRosterPlayer(
  captainFetch: CaptainFetch,
  teamId: string,
  payload: { name: string; email: string }
): Promise<CaptainAddRosterPlayerResult> {
  return captainFetch<CaptainAddRosterPlayerResult>(`/captain/teams/${teamId}/roster`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeCaptainTeamRosterPlayer(
  captainFetch: CaptainFetch,
  teamId: string,
  playerId: string
): Promise<CaptainTeamRosterView> {
  return captainFetch<CaptainTeamRosterView>(`/captain/teams/${teamId}/roster/${playerId}`, {
    method: 'DELETE',
  });
}
