import type { EventType } from '../constants/eventTypes';
import type { EventScheduleType } from '../constants/eventSchedule';

export type { EventType, EventScheduleType };

export interface Event {
  _id: string;
  type: EventType;
  scheduleType: EventScheduleType;
  title: string;
  description: string;
  date?: string;
  dayOfWeek?: number;
  startDate?: string;
  endDate?: string;
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
  sportsEnabled: {
    pool: boolean;
    darts: boolean;
    volleyball: boolean;
  };
  /** Present on admin GET /api/admin/site — deployment license tier from establishment.json */
  sportsLicensed?: {
    pool: boolean;
    darts: boolean;
    volleyball: boolean;
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
