import mongoose, { Document, Schema } from 'mongoose';

export interface IProcessedStripeEvent extends Document {
  stripeEventId: string;
  eventType: string;
  processedAt: Date;
}

const ProcessedStripeEventSchema = new Schema<IProcessedStripeEvent>({
  stripeEventId: { type: String, required: true, unique: true, trim: true },
  eventType: { type: String, required: true, trim: true },
  processedAt: { type: Date, default: Date.now, required: true },
});

export const ProcessedStripeEvent = mongoose.model<IProcessedStripeEvent>(
  'ProcessedStripeEvent',
  ProcessedStripeEventSchema
);
