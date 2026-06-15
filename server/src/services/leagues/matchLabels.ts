import mongoose from 'mongoose';
import { Player, Team } from '../../models';
import type { IMatch } from '../../models/leagues/Match';

export function isPlayerMatch(
  match: Pick<IMatch, 'homePlayerId' | 'awayPlayerId' | 'homeTeamId' | 'awayTeamId'>
): boolean {
  return Boolean(match.homePlayerId && match.awayPlayerId);
}

export function isTeamMatch(
  match: Pick<IMatch, 'homePlayerId' | 'awayPlayerId' | 'homeTeamId' | 'awayTeamId'>
): boolean {
  return Boolean(match.homeTeamId && match.awayTeamId);
}

export function collectMatchParticipantIds(
  matches: Array<{
    homeTeamId?: mongoose.Types.ObjectId | null;
    awayTeamId?: mongoose.Types.ObjectId | null;
    homePlayerId?: mongoose.Types.ObjectId | null;
    awayPlayerId?: mongoose.Types.ObjectId | null;
  }>
): { teamIds: Set<string>; playerIds: Set<string> } {
  const teamIds = new Set<string>();
  const playerIds = new Set<string>();

  for (const match of matches) {
    if (match.homeTeamId) teamIds.add(String(match.homeTeamId));
    if (match.awayTeamId) teamIds.add(String(match.awayTeamId));
    if (match.homePlayerId) playerIds.add(String(match.homePlayerId));
    if (match.awayPlayerId) playerIds.add(String(match.awayPlayerId));
  }

  return { teamIds, playerIds };
}

export async function loadParticipantNameMaps(
  teamIds: Iterable<string>,
  playerIds: Iterable<string>
): Promise<{
  teamNameById: Record<string, string>;
  playerNameById: Record<string, string>;
}> {
  const [teams, players] = await Promise.all([
    Team.find({ _id: { $in: [...teamIds] } })
      .select('_id name')
      .lean(),
    Player.find({ _id: { $in: [...playerIds] } })
      .select('_id name')
      .lean(),
  ]);

  return {
    teamNameById: Object.fromEntries(teams.map((team) => [String(team._id), team.name])),
    playerNameById: Object.fromEntries(players.map((player) => [String(player._id), player.name])),
  };
}

export interface FormattedMatchSides {
  homeTeamId?: string;
  awayTeamId?: string;
  homePlayerId?: string;
  awayPlayerId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homePlayerName?: string;
  awayPlayerName?: string;
}

export function formatMatchSides(
  match: Pick<
    IMatch,
    'homeTeamId' | 'awayTeamId' | 'homePlayerId' | 'awayPlayerId'
  >,
  teamNameById: Record<string, string>,
  playerNameById: Record<string, string>
): FormattedMatchSides {
  if (isPlayerMatch(match)) {
    const homePlayerId = String(match.homePlayerId);
    const awayPlayerId = String(match.awayPlayerId);
    const homePlayerName = playerNameById[homePlayerId] ?? 'Home';
    const awayPlayerName = playerNameById[awayPlayerId] ?? 'Away';

    return {
      homePlayerId,
      awayPlayerId,
      homePlayerName,
      awayPlayerName,
      homeTeamName: homePlayerName,
      awayTeamName: awayPlayerName,
    };
  }

  const homeTeamId = String(match.homeTeamId);
  const awayTeamId = String(match.awayTeamId);

  return {
    homeTeamId,
    awayTeamId,
    homeTeamName: teamNameById[homeTeamId] ?? 'Home',
    awayTeamName: teamNameById[awayTeamId] ?? 'Away',
  };
}
