import mongoose, { Document, Schema } from 'mongoose';
import { MATCH_STATUSES, SPORTS, type MatchStatus, type Sport } from '../../constants/leagues';
import { validateMatchParticipants } from '../../services/leagues/matchValidation';

export interface IMatchResult {
  winnerTeamId?: mongoose.Types.ObjectId;
  winnerPlayerId?: mongoose.Types.ObjectId;
  homeScore: number;
  awayScore: number;
  forfeitBy?: 'home' | 'away';
}

export interface IMatch extends Document {
  sport: Sport;
  leagueId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  homeTeamId?: mongoose.Types.ObjectId;
  awayTeamId?: mongoose.Types.ObjectId;
  homePlayerId?: mongoose.Types.ObjectId;
  awayPlayerId?: mongoose.Types.ObjectId;
  scheduledAt: Date;
  roundNumber: number;
  venue?: string;
  status: MatchStatus;
  result?: IMatchResult;
  createdAt: Date;
  updatedAt: Date;
}

const MatchResultSchema = new Schema<IMatchResult>(
  {
    winnerTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    winnerPlayerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    homeScore: { type: Number, default: 0 },
    awayScore: { type: Number, default: 0 },
    forfeitBy: { type: String, enum: ['home', 'away'] },
  },
  { _id: false }
);

const MatchSchema = new Schema<IMatch>(
  {
    sport: { type: String, enum: SPORTS, required: true },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    homeTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    awayTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    homePlayerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    awayPlayerId: { type: Schema.Types.ObjectId, ref: 'Player' },
    scheduledAt: { type: Date, required: true },
    roundNumber: { type: Number, required: true, min: 1 },
    venue: { type: String, trim: true },
    status: { type: String, enum: MATCH_STATUSES, default: 'scheduled', required: true },
    result: MatchResultSchema,
  },
  { timestamps: true, discriminatorKey: 'sport' }
);

MatchSchema.pre('validate', function validateParticipants(next) {
  try {
    validateMatchParticipants(this);
    next();
  } catch (error) {
    next(error as Error);
  }
});

MatchSchema.index({ leagueId: 1, scheduledAt: 1 });
MatchSchema.index({ divisionId: 1, status: 1 });
MatchSchema.index({ divisionId: 1, roundNumber: 1 });
MatchSchema.index({ homePlayerId: 1 }, { sparse: true });

export const Match = mongoose.model<IMatch>('Match', MatchSchema);

/** Pool-specific match fields — extended in Phase 1.1 (handicap, race format). */
export interface IPoolMatch extends IMatch {
  poolFormat?: '8_ball' | '9_ball';
  /** Games to win for player-entrant singles (race format) */
  raceTo?: number;
}

const PoolMatchSchema = new Schema<IPoolMatch>({
  poolFormat: { type: String, enum: ['8_ball', '9_ball'] },
  raceTo: { type: Number, min: 1 },
});

export const PoolMatch = Match.discriminator<IPoolMatch>('pool', PoolMatchSchema);

/** Darts-specific match fields — team leg race format (501 default). */
export interface IDartsMatch extends IMatch {
  dartsFormat?: '501' | '301' | 'cricket';
  legsToWin?: number;
  isDoubles?: boolean;
}

const DartsMatchSchema = new Schema<IDartsMatch>({
  dartsFormat: { type: String, enum: ['501', '301', 'cricket'], default: '501' },
  legsToWin: { type: Number, min: 1, default: 2 },
  isDoubles: { type: Boolean, default: false },
});

export const DartsMatch = Match.discriminator<IDartsMatch>('darts', DartsMatchSchema);

/** Volleyball-specific match fields — best of 3 (setsToWin 2) or best of 5 (setsToWin 3). */
export interface IVolleyballMatch extends IMatch {
  setsToWin?: 2 | 3;
}

const VolleyballMatchSchema = new Schema<IVolleyballMatch>({
  setsToWin: { type: Number, enum: [2, 3], default: 2 },
});

export const VolleyballMatch = Match.discriminator<IVolleyballMatch>(
  'volleyball',
  VolleyballMatchSchema
);
