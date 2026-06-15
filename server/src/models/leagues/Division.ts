import mongoose, { Document, Schema } from 'mongoose';
import type { PoolHandicapRules } from '../../types/leagues';

export interface IDivision extends Document {
  leagueId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  handicapRules?: PoolHandicapRules;
  /** Individual entrants when league.entrantType === 'player'; order = bracket seed */
  playerIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DivisionSchema = new Schema<IDivision>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    handicapRules: { type: Schema.Types.Mixed },
    playerIds: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  },
  { timestamps: true }
);

DivisionSchema.index({ leagueId: 1, order: 1 });

export const Division = mongoose.model<IDivision>('Division', DivisionSchema);
