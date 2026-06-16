import mongoose, { Document, Schema } from 'mongoose';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, type PaymentProvider, type PaymentStatus } from '../../constants/payments';

export interface IPayment extends Document {
  registrationId: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  provider: PaymentProvider;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
      index: true,
    },
    leagueId: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, default: 'stripe', required: true },
    stripeSessionId: { type: String, trim: true, sparse: true, unique: true },
    stripePaymentIntentId: { type: String, trim: true, sparse: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd', trim: true, lowercase: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', required: true },
    paidAt: { type: Date },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

PaymentSchema.index({ leagueId: 1, status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
