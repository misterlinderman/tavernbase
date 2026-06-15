import mongoose from 'mongoose';
import type { ScoresheetSide } from '../../constants/leagues';
import { Match, Scoresheet } from '../../models';
import type { IMatch } from '../../models/leagues/Match';
import { getScoresheetValidator } from './scoresheets';
import { recomputeStandingsAfterMatch } from './standings';

export {
  validatePoolScoresheetPayload,
  type PoolScoresheetPayload,
} from './scoresheets/pool';

export async function finalizeMatchFromPayload(
  match: IMatch,
  payload: Record<string, unknown>
): Promise<void> {
  const validator = getScoresheetValidator(match.sport);
  match.result = validator.toMatchResult(match, payload);
  match.status = 'final';
  await match.save();
  await recomputeStandingsAfterMatch(match.leagueId, match.divisionId);
}

export type ScoresheetResolution = 'pending' | 'final' | 'disputed';

export async function evaluateScoresheets(matchId: mongoose.Types.ObjectId): Promise<ScoresheetResolution> {
  const [match, sheets] = await Promise.all([
    Match.findById(matchId),
    Scoresheet.find({ matchId }),
  ]);

  if (!match || match.status === 'final' || match.status === 'cancelled') {
    return match?.status === 'final' ? 'final' : 'pending';
  }

  const homeSheet = sheets.find((sheet) => sheet.submittedBy === 'home');
  const awaySheet = sheets.find((sheet) => sheet.submittedBy === 'away');

  if (!homeSheet || !awaySheet) {
    return 'pending';
  }

  if (homeSheet.status === 'approved' && awaySheet.status === 'approved') {
    return 'final';
  }

  if (homeSheet.status !== 'submitted' && awaySheet.status !== 'submitted') {
    if (homeSheet.status === 'disputed' || awaySheet.status === 'disputed') {
      return 'disputed';
    }
    return 'pending';
  }

  if (homeSheet.status !== 'submitted' || awaySheet.status !== 'submitted') {
    return 'pending';
  }

  const validator = getScoresheetValidator(match.sport);

  if (validator.payloadsMatch(homeSheet.payload, awaySheet.payload)) {
    const payload = validator.validate(homeSheet.payload, { match });
    homeSheet.status = 'approved';
    awaySheet.status = 'approved';
    await Promise.all([homeSheet.save(), awaySheet.save(), finalizeMatchFromPayload(match, payload)]);
    return 'final';
  }

  homeSheet.status = 'disputed';
  awaySheet.status = 'disputed';
  await Promise.all([homeSheet.save(), awaySheet.save()]);
  return 'disputed';
}

export function captainSideForTeam(
  match: Pick<IMatch, 'homeTeamId' | 'awayTeamId'>,
  teamId: mongoose.Types.ObjectId
): ScoresheetSide | null {
  if (match.homeTeamId?.equals(teamId)) return 'home';
  if (match.awayTeamId?.equals(teamId)) return 'away';
  return null;
}

export function participantSideForPlayer(
  match: Pick<IMatch, 'homePlayerId' | 'awayPlayerId'>,
  playerId: mongoose.Types.ObjectId
): ScoresheetSide | null {
  if (match.homePlayerId?.equals(playerId)) return 'home';
  if (match.awayPlayerId?.equals(playerId)) return 'away';
  return null;
}
