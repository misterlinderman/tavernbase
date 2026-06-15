import mongoose, { Document, Schema } from 'mongoose';
import {
  SCORESHEET_SIDES,
  SCORESHEET_STATUSES,
  type ScoresheetSide,
  type ScoresheetStatus,
} from '../../constants/leagues';

export interface IScoresheet extends Document {
  matchId: mongoose.Types.ObjectId;
  submittedBy: ScoresheetSide;
  submittedByPlayerId: mongoose.Types.ObjectId;
  status: ScoresheetStatus;
  payload: Record<string, unknown>;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScoresheetSchema = new Schema<IScoresheet>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    submittedBy: { type: String, enum: SCORESHEET_SIDES, required: true },
    submittedByPlayerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    status: { type: String, enum: SCORESHEET_STATUSES, default: 'draft', required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

ScoresheetSchema.index({ matchId: 1, submittedBy: 1 }, { unique: true });

export const Scoresheet = mongoose.model<IScoresheet>('Scoresheet', ScoresheetSchema);
