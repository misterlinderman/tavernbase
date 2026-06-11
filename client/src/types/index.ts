import type { EventType } from '../constants/eventTypes';

export type { EventType };

export interface Event {
  _id: string;
  type: EventType;
  title: string;
  description: string;
  date: string;
  timeLabel: string;
}

export interface SiteSettings {
  announcement: {
    enabled: boolean;
    message: string;
    linkTarget: 'Events' | 'Christmas Party' | 'Menu' | 'Contact';
  };
  christmasParty: {
    enabled: boolean;
    title: string;
    date?: string;
    note: string;
    ticketUrl: string;
  };
  hero: {
    videoUrl?: string;
    posterUrl?: string;
    headline: string;
    subheadline: string;
  };
  hours: Array<{ label: string; value: string; order: number }>;
  contact: {
    address: string;
    phone: string;
  };
  tagline: string;
  about: string;
  instagram: {
    handle: string;
    showApprovedInGallery: boolean;
  };
}

export interface GallerySubmission {
  _id: string;
  submitterName: string;
  caption: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export interface PendingSubmission {
  _id: string;
  submitterName: string;
  caption: string;
  thumbnailUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface AdminSubmission {
  _id: string;
  submitterName: string;
  caption: string;
  thumbnailUrl?: string;
  consent: boolean;
  status: SubmissionStatus;
  when: string;
}

export interface OverviewStats {
  pendingSubmissions: number;
  upcomingEvents: number;
  announcement: {
    enabled: boolean;
    message: string;
  };
  christmas: {
    enabled: boolean;
    daysUntil: number | null;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  meta: { count: number };
}
