import { Router, Response } from 'express';
import { Event, SiteSettings, Submission } from '../models';
import type { ISiteSettings } from '../models/SiteSettings';
import { intersectSportsWithLicense } from '../config/establishment';
import { asyncHandler, createError } from '../middleware/errorHandler';
import {
  filterActiveEventsForDisplay,
  getActiveEventsFilter,
  sortEventsForDisplay,
} from '../utils/eventSchedule';

const router = Router();

function toPublicSiteSettings(doc: ISiteSettings) {
  const hours = [...doc.hours].sort((a, b) => a.order - b.order);

  return {
    announcement: {
      enabled: doc.announcement.enabled,
      message: doc.announcement.message,
      linkTarget: doc.announcement.linkTarget,
    },
    christmasParty: {
      enabled: doc.christmasParty.enabled,
      title: doc.christmasParty.title,
      date: doc.christmasParty.date,
      note: doc.christmasParty.note,
      ticketUrl: doc.christmasParty.ticketUrl,
    },
    hero: {
      videoUrl: doc.hero?.videoUrl,
      posterUrl: doc.hero?.posterUrl,
      headline: doc.hero?.headline ?? 'A Neighborhood Tradition',
      subheadline: doc.hero?.subheadline ?? 'Old Market Tavern',
    },
    hours: hours.map(({ label, value, order }) => ({ label, value, order })),
    contact: {
      address: doc.contact?.address,
      phone: doc.contact?.phone,
    },
    tagline: doc.tagline ?? 'Good Times. Cold Drinks. Great People.',
    about: doc.about,
    instagram: {
      handle: doc.instagram.handle,
      showApprovedInGallery: doc.instagram.showApprovedInGallery,
    },
    sportsEnabled: intersectSportsWithLicense({
      pool: doc.sportsEnabled?.pool ?? false,
      darts: doc.sportsEnabled?.darts ?? false,
      volleyball: doc.sportsEnabled?.volleyball ?? false,
    }),
  };
}

router.get(
  '/site',
  asyncHandler(async (_req, res: Response) => {
    const settings = await SiteSettings.findOne();

    if (!settings) {
      throw createError('Site settings not found', 404);
    }

    res.json({ data: toPublicSiteSettings(settings) });
  })
);

router.get(
  '/events',
  asyncHandler(async (_req, res: Response) => {
    const now = new Date();
    const events = await Event.find(getActiveEventsFilter(now))
      .select(
        'type scheduleType title description date dayOfWeek startDate endDate timeLabel'
      )
      .lean();

    const active = filterActiveEventsForDisplay(events, now);
    const sorted = sortEventsForDisplay(active, now);

    res.json({ data: sorted, meta: { count: sorted.length } });
  })
);

router.get(
  '/gallery',
  asyncHandler(async (_req, res: Response) => {
    const submissions = await Submission.find({ status: 'approved' })
      .sort({ updatedAt: -1 })
      .select('_id submitterName caption imageUrl thumbnailUrl')
      .lean();

    res.json({ data: submissions, meta: { count: submissions.length } });
  })
);

export default router;
