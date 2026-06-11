import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission extends Document {
  submitterName: string;
  submitterEmail?: string;
  caption: string;
  imageUrl: string;
  thumbnailUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFolder: 'pending' | 'gallery';
  status: 'pending' | 'approved' | 'rejected';
  consent: boolean;
  consentText: string;
  exifStripped: boolean;
  review?: {
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt: Date;
  };
  submitterIpHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    submitterName: { type: String, required: true, trim: true, maxlength: 100 },
    submitterEmail: { type: String, trim: true },
    caption: { type: String, default: '', maxlength: 280 },
    imageUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryFolder: { type: String, enum: ['pending', 'gallery'], default: 'pending' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    consent: { type: Boolean, required: true },
    consentText: { type: String, required: true },
    exifStripped: { type: Boolean, default: true },
    review: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
    },
    submitterIpHash: { type: String },
  },
  { timestamps: true }
);

SubmissionSchema.index({ status: 1, createdAt: -1 });

export const Submission = mongoose.model<ISubmission>('Submission', SubmissionSchema);
