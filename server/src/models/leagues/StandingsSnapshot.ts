import mongoose, { Document, Schema } from 'mongoose';

export interface IStandingsEntry {
  teamId?: mongoose.Types.ObjectId;
  playerId?: mongoose.Types.ObjectId;
  rank: number;
  placement?: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  gamesPlayed: number;
}

export interface IStandingsSnapshot extends Document {
  leagueId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  computedAt: Date;
  entries: IStandingsEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const StandingsEntrySchema = new Schema<IStandingsEntry>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    rank: { type: Number, required: true },
    placement: { type: Number, min: 1 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  },
  { _id: false }
);

const StandingsSnapshotSchema = new Schema<IStandingsSnapshot>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    computedAt: { type: Date, required: true, default: Date.now },
    entries: [StandingsEntrySchema],
  },
  { timestamps: true }
);

StandingsSnapshotSchema.index({ leagueId: 1, divisionId: 1, computedAt: -1 });

export const StandingsSnapshot = mongoose.model<IStandingsSnapshot>(
  'StandingsSnapshot',
  StandingsSnapshotSchema
);
