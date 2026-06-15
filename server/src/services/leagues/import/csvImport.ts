import mongoose from 'mongoose';
import { isSport, type MatchStatus, type Sport } from '../../../constants/leagues';
import { Division, League, Match, Player, Team } from '../../../models';
import type { IMatchResult } from '../../../models/leagues/Match';
import { recomputeStandingsForLeague } from '../standings';
import { generateRoundRobinPairings, scheduledAtForRound } from '../schedule/roundRobin';
import { parseDateTime, pickField } from './parseCsv';
import { prepareCsvRecords, type CsvImportFormat } from './compusportAliases';

export type CsvImportType = 'teams' | 'players' | 'schedule' | 'results';

export interface CsvImportResult {
  type: CsvImportType;
  format: CsvImportFormat;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function getOrCreateDivision(
  leagueId: mongoose.Types.ObjectId,
  divisionName: string,
  order: number
) {
  const existing = await Division.findOne({
    leagueId,
    name: { $regex: new RegExp(`^${escapeRegex(divisionName)}$`, 'i') },
  });

  if (existing) return existing;

  return Division.create({ leagueId, name: divisionName.trim(), order });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getTeamByName(
  leagueId: mongoose.Types.ObjectId,
  divisionId: mongoose.Types.ObjectId,
  teamName: string
) {
  return Team.findOne({
    leagueId,
    divisionId,
    name: { $regex: new RegExp(`^${escapeRegex(teamName)}$`, 'i') },
  });
}

const RESULT_IMPORT_STATUSES: MatchStatus[] = ['final', 'forfeit', 'cancelled'];

function buildResultFromScores(
  homeTeamId: mongoose.Types.ObjectId,
  awayTeamId: mongoose.Types.ObjectId,
  homeScore: number,
  awayScore: number
): IMatchResult {
  const result: IMatchResult = { homeScore, awayScore };

  if (homeScore > awayScore) {
    result.winnerTeamId = homeTeamId;
  } else if (awayScore > homeScore) {
    result.winnerTeamId = awayTeamId;
  }

  return result;
}

function sportMatchDefaults(sport: Sport): Record<string, unknown> {
  if (sport === 'darts') {
    return { dartsFormat: '501', legsToWin: 2, isDoubles: false };
  }

  if (sport === 'volleyball') {
    return { setsToWin: 2 };
  }

  return {};
}

export async function importTeamsCsv(
  leagueId: string,
  csv: string,
  defaultDivisionName = 'Division 1'
): Promise<CsvImportResult> {
  const league = await League.findById(leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const { format, records } = prepareCsvRecords(csv);
  const result: CsvImportResult = {
    type: 'teams',
    format,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const divisionOrder = await Division.countDocuments({ leagueId: league._id });

  for (const [index, record] of records.entries()) {
    const teamName = pickField(record, ['team', 'team_name', 'name', 'Team Name']);
    const divisionName =
      pickField(record, ['division', 'division_name', 'flight', 'Division']) ||
      defaultDivisionName;

    if (!teamName) {
      result.errors.push(`Row ${index + 2}: missing team name`);
      result.skipped += 1;
      continue;
    }

    try {
      const division = await getOrCreateDivision(
        league._id,
        divisionName,
        divisionOrder + index
      );

      const existing = await getTeamByName(league._id, division._id, teamName);

      if (existing) {
        result.skipped += 1;
        continue;
      }

      await Team.create({
        leagueId: league._id,
        divisionId: division._id,
        name: teamName,
      });
      result.created += 1;
    } catch (error) {
      result.errors.push(
        `Row ${index + 2}: ${error instanceof Error ? error.message : 'import failed'}`
      );
      result.skipped += 1;
    }
  }

  return result;
}

export async function importPlayersCsv(leagueId: string, csv: string): Promise<CsvImportResult> {
  const league = await League.findById(leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const { format, records } = prepareCsvRecords(csv);
  const result: CsvImportResult = {
    type: 'players',
    format,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const [index, record] of records.entries()) {
    const name = pickField(record, ['name', 'player', 'player_name', 'Player Name']);
    const email = pickField(record, ['email', 'e_mail', 'Email']);
    const phone = pickField(record, ['phone', 'Phone']);
    const teamName = pickField(record, ['team', 'team_name', 'Team']);
    const divisionName = pickField(record, ['division', 'division_name', 'flight', 'Division']);
    const isCaptain = ['yes', 'true', '1', 'captain', 'y'].includes(
      pickField(record, ['captain', 'is_captain', 'Captain']).toLowerCase()
    );

    if (!name) {
      result.errors.push(`Row ${index + 2}: missing player name`);
      result.skipped += 1;
      continue;
    }

    try {
      let player = email
        ? await Player.findOne({ email: email.toLowerCase(), establishmentSlug: 'default' })
        : null;

      if (!player) {
        player = await Player.create({
          name,
          email: email || undefined,
          phone: phone || undefined,
        });
        result.created += 1;
      } else {
        result.updated += 1;
      }

      if (teamName && divisionName) {
        const division = await Division.findOne({
          leagueId: league._id,
          name: { $regex: new RegExp(`^${escapeRegex(divisionName)}$`, 'i') },
        });

        if (!division) {
          result.errors.push(`Row ${index + 2}: division "${divisionName}" not found`);
          continue;
        }

        const team = await getTeamByName(league._id, division._id, teamName);

        if (!team) {
          result.errors.push(`Row ${index + 2}: team "${teamName}" not found in ${divisionName}`);
          continue;
        }

        if (!team.playerIds.some((id) => id.equals(player!._id))) {
          team.playerIds.push(player._id);
        }

        if (isCaptain) {
          team.captainPlayerId = player._id;
        }

        await team.save();
      }
    } catch (error) {
      result.errors.push(
        `Row ${index + 2}: ${error instanceof Error ? error.message : 'import failed'}`
      );
      result.skipped += 1;
    }
  }

  return result;
}

export async function importScheduleCsv(leagueId: string, csv: string): Promise<CsvImportResult> {
  const league = await League.findById(leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const { format, records } = prepareCsvRecords(csv);
  const result: CsvImportResult = {
    type: 'schedule',
    format,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const [index, record] of records.entries()) {
    const divisionName = pickField(record, ['division', 'division_name', 'flight', 'Division']);
    const homeTeam = pickField(record, ['home', 'home_team', 'Home Team']);
    const awayTeam = pickField(record, ['away', 'away_team', 'Away Team']);
    const dateStr = pickField(record, ['date', 'match_date', 'scheduled_date', 'Date']);
    const timeStr = pickField(record, ['time', 'match_time', 'Time']);
    const roundStr = pickField(record, ['round', 'round_number', 'week', 'Round']);

    if (!divisionName || !homeTeam || !awayTeam || !dateStr) {
      result.errors.push(`Row ${index + 2}: division, home, away, and date are required`);
      result.skipped += 1;
      continue;
    }

    try {
      const division = await Division.findOne({
        leagueId: league._id,
        name: { $regex: new RegExp(`^${escapeRegex(divisionName)}$`, 'i') },
      });

      if (!division) {
        result.errors.push(`Row ${index + 2}: division "${divisionName}" not found`);
        result.skipped += 1;
        continue;
      }

      const home = await getTeamByName(league._id, division._id, homeTeam);
      const away = await getTeamByName(league._id, division._id, awayTeam);

      if (!home || !away) {
        result.errors.push(`Row ${index + 2}: home or away team not found`);
        result.skipped += 1;
        continue;
      }

      const scheduledAt = parseDateTime(dateStr, timeStr || undefined);
      const roundNumber = roundStr ? Number(roundStr) : 1;

      const existing = await Match.findOne({
        leagueId: league._id,
        divisionId: division._id,
        homeTeamId: home._id,
        awayTeamId: away._id,
        scheduledAt,
      });

      if (existing) {
        result.skipped += 1;
        continue;
      }

      await Match.create({
        sport: league.sport,
        leagueId: league._id,
        divisionId: division._id,
        homeTeamId: home._id,
        awayTeamId: away._id,
        scheduledAt,
        roundNumber: Number.isInteger(roundNumber) && roundNumber > 0 ? roundNumber : 1,
        status: 'scheduled',
      });
      result.created += 1;
    } catch (error) {
      result.errors.push(
        `Row ${index + 2}: ${error instanceof Error ? error.message : 'import failed'}`
      );
      result.skipped += 1;
    }
  }

  return result;
}

export async function importResultsCsv(leagueId: string, csv: string): Promise<CsvImportResult> {
  const league = await League.findById(leagueId);

  if (!league) {
    throw new Error('League not found');
  }

  const { format, records } = prepareCsvRecords(csv);
  const result: CsvImportResult = {
    type: 'results',
    format,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const [index, record] of records.entries()) {
    const divisionName = pickField(record, [
      'divisionname',
      'division',
      'division_name',
      'flight',
      'Division',
      'DivnID',
    ]);
    const homeTeam = pickField(record, [
      'hometeamname',
      'home',
      'home_team',
      'Home Team',
      'HomeTeam',
    ]);
    const awayTeam = pickField(record, [
      'awayteamname',
      'away',
      'away_team',
      'Away Team',
      'AwayTeam',
    ]);
    const dateStr = pickField(record, [
      'scheduledat',
      'date',
      'match_date',
      'scheduled_date',
      'Date',
      'MatchDate',
    ]);
    const timeStr = pickField(record, ['time', 'match_time', 'Time', 'MatchTime']);
    const homeScoreStr = pickField(record, ['homescore', 'home_score', 'HomeScore']);
    const awayScoreStr = pickField(record, ['awayscore', 'away_score', 'AwayScore']);
    const statusStr = (
      pickField(record, ['status', 'match_status', 'Status']) || 'final'
    ).toLowerCase();
    const roundStr = pickField(record, ['round', 'round_number', 'week', 'Round']);

    if (!divisionName || !homeTeam || !awayTeam || !dateStr) {
      result.errors.push(
        `Row ${index + 2}: division, home team, away team, and scheduled date are required`
      );
      result.skipped += 1;
      continue;
    }

    if (!RESULT_IMPORT_STATUSES.includes(statusStr as MatchStatus)) {
      result.errors.push(
        `Row ${index + 2}: status must be final, forfeit, or cancelled`
      );
      result.skipped += 1;
      continue;
    }

    const homeScore = Number(homeScoreStr);
    const awayScore = Number(awayScoreStr);

    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      result.errors.push(`Row ${index + 2}: homeScore and awayScore must be non-negative numbers`);
      result.skipped += 1;
      continue;
    }

    try {
      const division = await Division.findOne({
        leagueId: league._id,
        name: { $regex: new RegExp(`^${escapeRegex(divisionName)}$`, 'i') },
      });

      if (!division) {
        result.errors.push(`Row ${index + 2}: division "${divisionName}" not found`);
        result.skipped += 1;
        continue;
      }

      const home = await getTeamByName(league._id, division._id, homeTeam);
      const away = await getTeamByName(league._id, division._id, awayTeam);

      if (!home || !away) {
        result.errors.push(`Row ${index + 2}: home or away team not found`);
        result.skipped += 1;
        continue;
      }

      const scheduledAt = parseDateTime(dateStr, timeStr || undefined);
      const roundNumber = roundStr ? Number(roundStr) : 1;
      const matchStatus = statusStr as MatchStatus;
      const matchResult =
        matchStatus === 'final' ? buildResultFromScores(home._id, away._id, homeScore, awayScore) : undefined;

      const existing = await Match.findOne({
        leagueId: league._id,
        divisionId: division._id,
        homeTeamId: home._id,
        awayTeamId: away._id,
        scheduledAt,
      });

      if (existing) {
        if (existing.status === 'final') {
          result.skipped += 1;
          continue;
        }

        existing.status = matchStatus;
        existing.roundNumber =
          Number.isInteger(roundNumber) && roundNumber > 0 ? roundNumber : existing.roundNumber;
        existing.result = matchResult;
        await existing.save();
        result.updated += 1;
        continue;
      }

      await Match.create({
        sport: league.sport,
        leagueId: league._id,
        divisionId: division._id,
        homeTeamId: home._id,
        awayTeamId: away._id,
        scheduledAt,
        roundNumber: Number.isInteger(roundNumber) && roundNumber > 0 ? roundNumber : 1,
        status: matchStatus,
        result: matchResult,
        ...sportMatchDefaults(league.sport),
      });
      result.created += 1;
    } catch (error) {
      result.errors.push(
        `Row ${index + 2}: ${error instanceof Error ? error.message : 'import failed'}`
      );
      result.skipped += 1;
    }
  }

  if (result.created > 0 || result.updated > 0) {
    await recomputeStandingsForLeague(league._id);
  }

  return result;
}

export async function runCsvImport(
  leagueId: string,
  type: CsvImportType,
  csv: string,
  options?: { defaultDivisionName?: string }
): Promise<CsvImportResult> {
  switch (type) {
    case 'teams':
      return importTeamsCsv(leagueId, csv, options?.defaultDivisionName);
    case 'players':
      return importPlayersCsv(leagueId, csv);
    case 'schedule':
      return importScheduleCsv(leagueId, csv);
    case 'results':
      return importResultsCsv(leagueId, csv);
    default:
      throw new Error(`Unknown import type: ${String(type)}`);
  }
}

/** CompuSport-style bulk bootstrap: teams CSV then optional auto round-robin if format matches. */
export async function importCompuSportBundle(
  leagueId: string,
  teamsCsv: string,
  playersCsv?: string,
  scheduleCsv?: string
): Promise<{ teams: CsvImportResult; players?: CsvImportResult; schedule?: CsvImportResult }> {
  const teams = await importTeamsCsv(leagueId, teamsCsv);
  const players = playersCsv ? await importPlayersCsv(leagueId, playersCsv) : undefined;
  const schedule = scheduleCsv ? await importScheduleCsv(leagueId, scheduleCsv) : undefined;

  return { teams, players, schedule };
}

export function validateImportSport(sport: string): sport is Sport {
  return isSport(sport);
}

// Re-export round robin for docs reference — schedule CSV takes precedence over generator
export { generateRoundRobinPairings, scheduledAtForRound };
