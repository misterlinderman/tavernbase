import mongoose, { Document, Schema } from 'mongoose';
import { ENTRANT_TYPES, REGISTRATION_STATUSES, type EntrantType, type RegistrationStatus } from '../../constants/leagues';

export interface IRegistration extends Document {
  leagueId: mongoose.Types.ObjectId;
  divisionId?: mongoose.Types.ObjectId;
  entrantType: EntrantType;
  status: RegistrationStatus;
  submittedByPlayerId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  returningTeamId?: mongoose.Types.ObjectId;
  playerIds?: mongoose.Types.ObjectId[];
  teamName?: string;
  waiverAccepted: boolean;
  waiverTextSnapshot: string;
  paymentId?: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'Division' },
    entrantType: { type: String, enum: ENTRANT_TYPES, required: true },
    status: {
      type: String,
      enum: REGISTRATION_STATUSES,
      default: 'draft',
      required: true,
    },
    submittedByPlayerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    returningTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    playerIds: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    teamName: { type: String, trim: true, maxlength: 120 },
    waiverAccepted: { type: Boolean, required: true, default: false },
    waiverTextSnapshot: { type: String, default: '', trim: true },
    paymentId: { type: Schema.Types.ObjectId },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

RegistrationSchema.index({ leagueId: 1, status: 1 });
RegistrationSchema.index({ submittedByPlayerId: 1 });

export const Registration = mongoose.model<IRegistration>('Registration', RegistrationSchema);
