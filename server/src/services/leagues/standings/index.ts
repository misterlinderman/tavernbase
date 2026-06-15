import mongoose from 'mongoose';
import type { LeagueFormat, LeagueKind, Sport } from '../../../constants/leagues';
import { Division, League, Player, StandingsSnapshot, Team } from '../../../models';
import type { ILeague } from '../../../models/leagues/League';
import type { IStandingsEntry } from '../../../models/leagues/StandingsSnapshot';
import { resolveEntrantType, resolveLeagueKind } from '../leagueValidation';
import type { ComputedStandingsEntry, StandingsEngine } from './StandingsEngine';
import { poolStandingsEngine } from './PoolStandingsEngine';
import { dartsStandingsEngine } from './DartsStandingsEngine';
import { volleyballStandingsEngine } from './VolleyballStandingsEngine';
import { computeTournamentPlacement } from './TournamentPlacementEngine';

export type StandingsType = 'season' | 'placement';

function getEngineForSport(sport: Sport): StandingsEngine {
  switch (sport) {
    case 'pool':
      return poolStandingsEngine;
    case 'darts':
      return dartsStandingsEngine;
    case 'volleyball':
      return volleyballStandingsEngine;
    default:
      throw new Error(`Unknown sport: ${String(sport)}`);
  }
}

export function usesPlacementStandings(league: {
  kind?: LeagueKind;
  format: LeagueFormat;
}): boolean {
  return resolveLeagueKind(league.kind) === 'tournament' && league.format === 'bracket';
}

export function getStandingsType(league: {
  kind?: LeagueKind;
  format: LeagueFormat;
}): StandingsType {
  return usesPlacementStandings(league) ? 'placement' : 'season';
}

function toSnapshotEntries(entries: ComputedStandingsEntry[]): IStandingsEntry[] {
  return entries.map((entry) => ({
    teamId: entry.teamId,
    playerId: entry.playerId,
    rank: entry.rank,
    placement: entry.placement,
    wins: entry.wins,
    losses: entry.losses,
    ties: entry.ties,
    points: entry.points,
    gamesPlayed: entry.gamesPlayed,
  }));
}

async function computeDivisionEntries(
  league: ILeague,
  divisionId: mongoose.Types.ObjectId
): Promise<ComputedStandingsEntry[]> {
  if (usesPlacementStandings(league)) {
    return computeTournamentPlacement(
      league._id,
      divisionId,
      resolveEntrantType(league.entrantType)
    );
  }

  const engine = getEngineForSport(league.sport);
  return engine.computeDivisionStandings(league._id, divisionId);
}

export async function recomputeStandingsForDivision(
  leagueId: mongoose.Types.ObjectId | string,
  divisionId: mongoose.Types.ObjectId | string
) {
  const league = await League.findById(leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const division = await Division.findOne({ _id: divisionId, leagueId: league._id });

  if (!division) {
    throw new Error('Division not found');
  }

  const computed = await computeDivisionEntries(league, division._id);

  return StandingsSnapshot.create({
    leagueId: league._id,
    divisionId: division._id,
    computedAt: new Date(),
    entries: toSnapshotEntries(computed),
  });
}

export async function recomputeStandingsForLeague(leagueId: mongoose.Types.ObjectId | string) {
  const divisions = await Division.find({ leagueId }).select('_id');
  const snapshots = await Promise.all(
    divisions.map((division) => recomputeStandingsForDivision(leagueId, division._id))
  );
  return snapshots;
}

export async function recomputeStandingsAfterMatch(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId
): Promise<void> {
  await recomputeStandingsForDivision(leagueId, divisionId);
}

export interface EnrichedStandingsEntry extends IStandingsEntry {
  teamName: string;
  playerName?: string;
}

export interface StandingsView {
  divisionId: string;
  divisionName: string;
  computedAt: Date;
  standingsType: StandingsType;
  entries: EnrichedStandingsEntry[];
}

async function enrichSnapshotEntries(
  entries: IStandingsEntry[],
  standingsType: StandingsType
): Promise<EnrichedStandingsEntry[]> {
  const teamIds = entries.map((entry) => entry.teamId).filter(Boolean) as mongoose.Types.ObjectId[];
  const playerIds = entries
    .map((entry) => entry.playerId)
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const [teams, players] = await Promise.all([
    teamIds.length > 0
      ? Team.find({ _id: { $in: teamIds } })
          .select('_id name')
          .lean()
      : [],
    playerIds.length > 0
      ? Player.find({ _id: { $in: playerIds } })
          .select('_id name')
          .lean()
      : [],
  ]);

  const teamNameById = Object.fromEntries(teams.map((team) => [String(team._id), team.name]));
  const playerNameById = Object.fromEntries(
    players.map((player) => [String(player._id), player.name])
  );

  return entries.map((entry) => {
    const playerName = entry.playerId
      ? playerNameById[String(entry.playerId)]
      : undefined;
    const teamName = playerName
      ?? (entry.teamId ? teamNameById[String(entry.teamId)] : undefined)
      ?? 'Unknown entrant';

    return {
      ...entry,
      teamName,
      playerName,
      placement: standingsType === 'placement' ? entry.placement ?? entry.rank : entry.placement,
    };
  });
}

export async function getStandingsViews(
  leagueId: mongoose.Types.ObjectId | string,
  divisionId?: string
): Promise<StandingsView[]> {
  const divisionFilter: Record<string, unknown> = { leagueId };

  if (divisionId) {
    divisionFilter._id = divisionId;
  }

  const divisions = await Division.find(divisionFilter).sort({ order: 1, name: 1 }).lean();

  if (divisions.length === 0) {
    return [];
  }

  const league = await League.findById(leagueId);

  if (!league) {
    return [];
  }

  const standingsType = getStandingsType(league);
  const views: StandingsView[] = [];

  for (const division of divisions) {
    const snapshot = await StandingsSnapshot.findOne({
      leagueId,
      divisionId: division._id,
    })
      .sort({ computedAt: -1 })
      .lean();

    let entries: EnrichedStandingsEntry[] = [];
    let computedAt = new Date(0);

    if (snapshot) {
      computedAt = snapshot.computedAt;
      entries = await enrichSnapshotEntries(snapshot.entries, standingsType);
    } else {
      const computed = await computeDivisionEntries(league, division._id);
      entries = computed.map((entry) => ({
        teamId: entry.teamId,
        playerId: entry.playerId,
        rank: entry.rank,
        placement: entry.placement,
        wins: entry.wins,
        losses: entry.losses,
        ties: entry.ties,
        points: entry.points,
        gamesPlayed: entry.gamesPlayed,
        teamName: entry.teamName,
        playerName: entry.playerId ? entry.teamName : undefined,
      }));
      computedAt = new Date();
    }

    views.push({
      divisionId: String(division._id),
      divisionName: division.name,
      computedAt,
      standingsType,
      entries,
    });
  }

  return views;
}
