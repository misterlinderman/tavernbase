import type { Sport } from '../constants/leagues';
import type {
  CaptainInviteResult,
  Division,
  GenerateSchedulePayload,
  GenerateScheduleResult,
  League,
  LeagueDetail,
  LeaguesOverview,
  MatchListItem,
  Player,
  StandingsView,
  Team,
  CsvImportResult,
  CsvImportType,
} from '../types/leagues';
import type { DisputedMatch, SportScoresheetPayload } from '../types/captain';

type AdminFetch = <T>(path: string, options?: RequestInit) => Promise<T>;
type AdminFetchList = <T>(
  path: string,
  options?: RequestInit
) => Promise<{ data: T; count: number }>;

export async function listLeagues(
  adminFetchList: AdminFetchList,
  sport?: Sport
): Promise<League[]> {
  const query = sport ? `?sport=${sport}` : '';
  const { data } = await adminFetchList<League[]>(`/admin/leagues${query}`);
  return data;
}

export async function getLeaguesOverview(adminFetch: AdminFetch): Promise<LeaguesOverview> {
  return adminFetch<LeaguesOverview>('/admin/leagues/overview');
}

export async function getLeague(adminFetch: AdminFetch, leagueId: string): Promise<LeagueDetail> {
  return adminFetch<LeagueDetail>(`/admin/leagues/${leagueId}`);
}

export async function createLeague(
  adminFetch: AdminFetch,
  payload: Omit<League, '_id' | 'createdAt' | 'updatedAt'>
): Promise<League> {
  return adminFetch<League>('/admin/leagues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateLeague(
  adminFetch: AdminFetch,
  leagueId: string,
  payload: Partial<Omit<League, '_id'>>
): Promise<League> {
  return adminFetch<League>(`/admin/leagues/${leagueId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteLeague(adminFetch: AdminFetch, leagueId: string): Promise<void> {
  await adminFetch<{ id: string }>(`/admin/leagues/${leagueId}`, { method: 'DELETE' });
}

export async function listDivisions(
  adminFetchList: AdminFetchList,
  leagueId: string
): Promise<Division[]> {
  const { data } = await adminFetchList<Division[]>(`/admin/leagues/${leagueId}/divisions`);
  return data;
}

export async function createDivision(
  adminFetch: AdminFetch,
  leagueId: string,
  payload: Pick<Division, 'name' | 'order'> & Partial<Pick<Division, 'handicapRules'>>
): Promise<Division> {
  return adminFetch<Division>(`/admin/leagues/${leagueId}/divisions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDivision(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId: string,
  payload: Partial<Pick<Division, 'name' | 'order' | 'handicapRules'>>
): Promise<Division> {
  return adminFetch<Division>(`/admin/leagues/${leagueId}/divisions/${divisionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDivision(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId: string
): Promise<void> {
  await adminFetch(`/admin/leagues/${leagueId}/divisions/${divisionId}`, { method: 'DELETE' });
}

export async function addDivisionEntrant(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId: string,
  payload: { playerId: string } | { name: string; email?: string }
): Promise<Division> {
  return adminFetch<Division>(`/admin/leagues/${leagueId}/divisions/${divisionId}/entrants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeDivisionEntrant(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId: string,
  playerId: string
): Promise<Division> {
  return adminFetch<Division>(
    `/admin/leagues/${leagueId}/divisions/${divisionId}/entrants/${playerId}`,
    { method: 'DELETE' }
  );
}

export async function reorderDivisionEntrants(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId: string,
  playerIds: string[]
): Promise<Division> {
  return adminFetch<Division>(
    `/admin/leagues/${leagueId}/divisions/${divisionId}/entrants/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify({ playerIds }),
    }
  );
}

export async function listTeams(
  adminFetchList: AdminFetchList,
  leagueId: string,
  divisionId?: string
): Promise<Team[]> {
  const query = divisionId ? `?divisionId=${divisionId}` : '';
  const { data } = await adminFetchList<Team[]>(`/admin/leagues/${leagueId}/teams${query}`);
  return data;
}

export async function createTeam(
  adminFetch: AdminFetch,
  leagueId: string,
  payload: Pick<Team, 'divisionId' | 'name'> & Partial<Pick<Team, 'captainPlayerId' | 'playerIds'>>
): Promise<Team> {
  return adminFetch<Team>(`/admin/leagues/${leagueId}/teams`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTeam(
  adminFetch: AdminFetch,
  leagueId: string,
  teamId: string
): Promise<void> {
  await adminFetch(`/admin/leagues/${leagueId}/teams/${teamId}`, { method: 'DELETE' });
}

export async function listPlayers(adminFetchList: AdminFetchList): Promise<Player[]> {
  const { data } = await adminFetchList<Player[]>('/admin/leagues/players');
  return data;
}

export async function listMatches(
  adminFetchList: AdminFetchList,
  leagueId: string,
  divisionId?: string
): Promise<MatchListItem[]> {
  const query = divisionId ? `?divisionId=${divisionId}` : '';
  const { data } = await adminFetchList<MatchListItem[]>(
    `/admin/leagues/${leagueId}/matches${query}`
  );
  return data;
}

export async function generateSchedule(
  adminFetch: AdminFetch,
  leagueId: string,
  payload: GenerateSchedulePayload
): Promise<GenerateScheduleResult> {
  return adminFetch<GenerateScheduleResult>(`/admin/leagues/${leagueId}/schedule/generate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createPlayer(
  adminFetch: AdminFetch,
  payload: Pick<Player, 'name'> & Partial<Pick<Player, 'email' | 'phone'>>
): Promise<Player> {
  return adminFetch<Player>('/admin/leagues/players', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function linkCaptainUser(
  adminFetch: AdminFetch,
  payload: { auth0Sub: string; email: string; name: string; playerId: string }
): Promise<void> {
  await adminFetch('/admin/leagues/captain-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function linkPlayerUser(
  adminFetch: AdminFetch,
  payload: { auth0Sub: string; email: string; name: string; playerId: string }
): Promise<void> {
  await adminFetch('/admin/leagues/player-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function inviteCaptain(
  adminFetch: AdminFetch,
  leagueId: string,
  teamId: string
): Promise<CaptainInviteResult> {
  return adminFetch<CaptainInviteResult>(
    `/admin/leagues/${leagueId}/teams/${teamId}/invite-captain`,
    { method: 'POST' }
  );
}

export async function updateTeam(
  adminFetch: AdminFetch,
  leagueId: string,
  teamId: string,
  payload: Partial<Pick<Team, 'captainPlayerId' | 'name' | 'divisionId' | 'playerIds'>>
): Promise<Team> {
  return adminFetch<Team>(`/admin/leagues/${leagueId}/teams/${teamId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listDisputes(
  adminFetchList: AdminFetchList,
  leagueId: string
): Promise<DisputedMatch[]> {
  const { data } = await adminFetchList<DisputedMatch[]>(`/admin/leagues/${leagueId}/disputes`);
  return data;
}

export async function resolveDispute(
  adminFetch: AdminFetch,
  leagueId: string,
  matchId: string,
  payload: SportScoresheetPayload
): Promise<void> {
  await adminFetch(`/admin/leagues/${leagueId}/matches/${matchId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export async function finalizeAdminMatch(
  adminFetch: AdminFetch,
  leagueId: string,
  matchId: string,
  payload: SportScoresheetPayload
): Promise<void> {
  await adminFetch(`/admin/leagues/${leagueId}/matches/${matchId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export async function getStandings(
  adminFetchList: AdminFetchList,
  leagueId: string,
  divisionId?: string
): Promise<StandingsView[]> {
  const query = divisionId ? `?divisionId=${divisionId}` : '';
  const { data } = await adminFetchList<StandingsView[]>(
    `/admin/leagues/${leagueId}/standings${query}`
  );
  return data;
}

export async function recalculateStandings(
  adminFetch: AdminFetch,
  leagueId: string,
  divisionId?: string
): Promise<StandingsView[]> {
  return adminFetch<StandingsView[]>(`/admin/leagues/${leagueId}/standings/recalculate`, {
    method: 'POST',
    body: JSON.stringify(divisionId ? { divisionId } : {}),
  });
}

export async function importLeagueCsv(
  adminFetch: AdminFetch,
  leagueId: string,
  payload: { type: CsvImportType; csv: string; defaultDivisionName?: string }
): Promise<CsvImportResult> {
  return adminFetch<CsvImportResult>(`/admin/leagues/${leagueId}/import`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
