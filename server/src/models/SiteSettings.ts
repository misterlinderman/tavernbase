import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteSettings extends Document {
  announcement: {
    enabled: boolean;
    message: string;
    linkTarget: 'Events' | 'Featured' | 'Menu' | 'Contact';
  };
  featuredBanner: {
    enabled: boolean;
    title: string;
    subtitle: string;
    note: string;
    buttonLabel: string;
    buttonUrl: string;
  };
  hero: {
    videoUrl?: string;
    posterUrl?: string;
    headline: string;
    subheadline: string;
  };
  hours: Array<{ label: string; value: string; order: number }>;
  contact: { address: string; phone: string };
  tagline: string;
  about: string;
  instagram: { handle: string; showApprovedInGallery: boolean };
  sportsEnabled: {
    pool: boolean;
    darts: boolean;
    volleyball: boolean;
  };
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    announcement: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: '' },
      linkTarget: {
        type: String,
        enum: ['Events', 'Featured', 'Menu', 'Contact'],
        default: 'Events',
      },
    },
    featuredBanner: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Featured Event' },
      subtitle: { type: String, default: '', maxlength: 120 },
      note: { type: String, default: '', maxlength: 400 },
      buttonLabel: { type: String, default: 'Learn More', maxlength: 40 },
      buttonUrl: { type: String, default: '' },
    },
    hero: {
      videoUrl: String,
      posterUrl: String,
      headline: { type: String, default: 'A Neighborhood Tradition', maxlength: 120 },
      subheadline: { type: String, default: 'Your Local Tavern', maxlength: 80 },
    },
    hours: [{ label: String, value: String, order: Number }],
    contact: { address: String, phone: String },
    tagline: {
      type: String,
      default: 'Good Times. Cold Drinks. Great People.',
      maxlength: 200,
    },
    about: { type: String, default: '', maxlength: 400 },
    instagram: {
      handle: { type: String, default: '' },
      showApprovedInGallery: { type: Boolean, default: true },
    },
    sportsEnabled: {
      pool: { type: Boolean, default: false },
      darts: { type: Boolean, default: false },
      volleyball: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
