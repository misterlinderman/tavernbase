import mongoose, { Document, Schema } from 'mongoose';
import {
  ENTRANT_TYPES,
  LEAGUE_FORMATS,
  LEAGUE_KINDS,
  LEAGUE_STATUSES,
  POOL_FORMATS,
  REGISTRATION_CURRENCIES,
  SPORTS,
  type EntrantType,
  type LeagueFormat,
  type LeagueKind,
  type LeagueStatus,
  type PoolFormat,
  type RegistrationCurrency,
  type Sport,
} from '../../constants/leagues';

export interface ILeagueRegistration {
  enabled: boolean;
  opensAt?: Date;
  closesAt?: Date;
  entryFeeCents?: number;
  currency: RegistrationCurrency;
  maxEntrants?: number;
  requiresApproval: boolean;
  captainRosterEdits?: boolean;
  priorLeagueId?: mongoose.Types.ObjectId;
  waiverText?: string;
}

export interface ILeague extends Document {
  sport: Sport;
  name: string;
  seasonStart: Date;
  seasonEnd: Date;
  /** Season league vs one-off tournament */
  kind: LeagueKind;
  /** Teams with rosters vs individual players */
  entrantType: EntrantType;
  format: LeagueFormat;
  status: LeagueStatus;
  /** Default 8-ball / 9-ball for pool leagues; applied when generating schedules */
  poolFormat?: PoolFormat;
  registration: ILeagueRegistration;
  createdAt: Date;
  updatedAt: Date;
}

const LeagueRegistrationSchema = new Schema<ILeagueRegistration>(
  {
    enabled: { type: Boolean, default: false, required: true },
    opensAt: { type: Date },
    closesAt: { type: Date },
    entryFeeCents: { type: Number, min: 0, default: 0 },
    currency: { type: String, enum: REGISTRATION_CURRENCIES, default: 'usd', required: true },
    maxEntrants: { type: Number, min: 1 },
    requiresApproval: { type: Boolean, default: false, required: true },
    captainRosterEdits: { type: Boolean, default: false },
    priorLeagueId: { type: Schema.Types.ObjectId, ref: 'League' },
    waiverText: { type: String, trim: true, maxlength: 4000 },
  },
  { _id: false }
);

const LeagueSchema = new Schema<ILeague>(
  {
    sport: { type: String, enum: SPORTS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    seasonStart: { type: Date, required: true },
    seasonEnd: { type: Date, required: true },
    kind: { type: String, enum: LEAGUE_KINDS, default: 'league', required: true },
    entrantType: { type: String, enum: ENTRANT_TYPES, default: 'team', required: true },
    format: { type: String, enum: LEAGUE_FORMATS, default: 'round_robin', required: true },
    status: { type: String, enum: LEAGUE_STATUSES, default: 'draft', required: true },
    poolFormat: { type: String, enum: POOL_FORMATS },
    registration: {
      type: LeagueRegistrationSchema,
      default: () => ({
        enabled: false,
        currency: 'usd',
        requiresApproval: false,
        entryFeeCents: 0,
      }),
    },
  },
  { timestamps: true }
);

LeagueSchema.index({ sport: 1, status: 1 });
LeagueSchema.index({ seasonStart: 1, seasonEnd: 1 });

export const League = mongoose.model<ILeague>('League', LeagueSchema);
