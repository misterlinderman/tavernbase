import mongoose from 'mongoose';
import type { ScoresheetSide } from '../../constants/leagues';
import { Match, Scoresheet } from '../../models';
import type { IMatch } from '../../models/leagues/Match';
import { getScoresheetValidator } from './scoresheets';
import { evaluateScoresheets } from './scoresheet';

export interface SubmitScoresheetResult {
  scoresheet: ReturnType<typeof Scoresheet.prototype.toObject>;
  resolution: Awaited<ReturnType<typeof evaluateScoresheets>>;
  match: ReturnType<typeof Match.prototype.toObject> | null;
  scoresheets: {
    home: ReturnType<typeof Scoresheet.prototype.toObject> | null;
    away: ReturnType<typeof Scoresheet.prototype.toObject> | null;
  };
  created: boolean;
}

export async function submitMatchScoresheet(
  match: IMatch,
  playerId: mongoose.Types.ObjectId,
  side: ScoresheetSide,
  payload: Record<string, unknown>
): Promise<SubmitScoresheetResult> {
  const existing = await Scoresheet.findOne({ matchId: match._id, submittedBy: side });

  if (existing && existing.status !== 'draft') {
    throw new Error('Scoresheet already submitted for your side');
  }

  const scoresheet =
    existing ??
    new Scoresheet({
      matchId: match._id,
      submittedBy: side,
      submittedByPlayerId: playerId,
    });

  scoresheet.payload = { ...payload };
  scoresheet.submittedByPlayerId = playerId;
  scoresheet.status = 'submitted';
  await scoresheet.save();

  if (match.status === 'scheduled') {
    match.status = 'in_progress';
    await match.save();
  }

  const resolution = await evaluateScoresheets(match._id);
  const updatedMatch = await Match.findById(match._id).lean();
  const sheets = await Scoresheet.find({ matchId: match._id }).lean();

  return {
    scoresheet: scoresheet.toObject(),
    resolution,
    match: updatedMatch,
    scoresheets: {
      home: sheets.find((sheet) => sheet.submittedBy === 'home') ?? null,
      away: sheets.find((sheet) => sheet.submittedBy === 'away') ?? null,
    },
    created: !existing,
  };
}
