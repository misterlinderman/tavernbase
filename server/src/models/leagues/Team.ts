import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  leagueId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  name: string;
  captainPlayerId?: mongoose.Types.ObjectId;
  playerIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    captainPlayerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    playerIds: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  },
  { timestamps: true }
);

TeamSchema.index({ leagueId: 1, divisionId: 1, name: 1 });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
