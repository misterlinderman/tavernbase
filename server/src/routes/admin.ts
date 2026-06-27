import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { EVENT_TYPES, type EventType } from '../constants/eventTypes';
import { SPORTS } from '../constants/leagues';
import {
  getLicensedLeagueSports,
  isSportLicensed,
} from '../config/establishment';
import {
  buildEventFieldsFromBody,
  getActiveEventsFilter,
  parseEventScheduleInput,
  sortEventsForDisplay,
  toMongoUpdatePayload,
} from '../utils/eventSchedule';
import { checkJwt, extractAuth0Sub } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { heroVideoUpload } from '../middleware/uploadHero';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Event, SiteSettings, Submission, User } from '../models';
import type { ISiteSettings } from '../models/SiteSettings';
import { uploadHeroVideo } from '../services/storage';
import { destroyImage, moveToGallery } from '../services/imagePipeline';
import type { ISubmission } from '../models/Submission';
import leaguesAdminRouter from './leagues/admin';

const router = Router();

router.use(checkJwt);

const LINK_TARGETS = ['Events', 'Featured', 'Menu', 'Contact'] as const;
type LinkTarget = (typeof LINK_TARGETS)[number];

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidButtonUrl(value: string): boolean {
  if (!value.trim()) return true;

  if (value.startsWith('/')) {
    return true;
  }

  return isValidUrl(value);
}

async function getSettingsDocument() {
  const settings = await SiteSettings.findOne();

  if (!settings) {
    throw createError('Site settings not found', 404);
  }

  return settings;
}

function validateLinkTarget(value: unknown): value is LinkTarget {
  return typeof value === 'string' && LINK_TARGETS.includes(value as LinkTarget);
}

function mergeSiteSettings(
  settings: ISiteSettings,
  body: Record<string, unknown>
): void {
  if (body.announcement !== undefined) {
    if (typeof body.announcement !== 'object' || body.announcement === null) {
      throw createError('announcement must be an object', 400);
    }

    const announcement = body.announcement as Record<string, unknown>;

    if (
      announcement.linkTarget !== undefined &&
      !validateLinkTarget(announcement.linkTarget)
    ) {
      throw createError('Invalid announcement.linkTarget', 400);
    }

    Object.assign(settings.announcement, announcement);
  }

  if (body.featuredBanner !== undefined) {
    if (typeof body.featuredBanner !== 'object' || body.featuredBanner === null) {
      throw createError('featuredBanner must be an object', 400);
    }

    const featuredBanner = body.featuredBanner as Record<string, unknown>;

    if (
      typeof featuredBanner.buttonUrl === 'string' &&
      featuredBanner.buttonUrl.trim() !== '' &&
      !isValidButtonUrl(featuredBanner.buttonUrl)
    ) {
      throw createError('Invalid featuredBanner.buttonUrl', 400);
    }

    Object.assign(settings.featuredBanner, featuredBanner);
  }

  if (body.hero !== undefined) {
    if (typeof body.hero !== 'object' || body.hero === null) {
      throw createError('hero must be an object', 400);
    }

    const hero = body.hero as Record<string, unknown>;

    if (hero.headline !== undefined && typeof hero.headline !== 'string') {
      throw createError('hero.headline must be a string', 400);
    }

    if (hero.subheadline !== undefined && typeof hero.subheadline !== 'string') {
      throw createError('hero.subheadline must be a string', 400);
    }

    Object.assign(settings.hero, body.hero);
  }

  if (body.hours !== undefined) {
    if (!Array.isArray(body.hours)) {
      throw createError('hours must be an array', 400);
    }
    settings.hours = body.hours as ISiteSettings['hours'];
  }

  if (body.contact !== undefined) {
    if (typeof body.contact !== 'object' || body.contact === null) {
      throw createError('contact must be an object', 400);
    }
    Object.assign(settings.contact, body.contact);
  }

  if (body.tagline !== undefined) {
    if (typeof body.tagline !== 'string') {
      throw createError('tagline must be a string', 400);
    }
    settings.tagline = body.tagline;
  }

  if (body.about !== undefined) {
    if (typeof body.about !== 'string') {
      throw createError('about must be a string', 400);
    }
    settings.about = body.about;
  }

  if (body.instagram !== undefined) {
    if (typeof body.instagram !== 'object' || body.instagram === null) {
      throw createError('instagram must be an object', 400);
    }
    Object.assign(settings.instagram, body.instagram);
  }

  if (body.sportsEnabled !== undefined) {
    if (typeof body.sportsEnabled !== 'object' || body.sportsEnabled === null) {
      throw createError('sportsEnabled must be an object', 400);
    }

    const sportsEnabled = body.sportsEnabled as Record<string, unknown>;

    if (sportsEnabled.pool !== undefined && typeof sportsEnabled.pool !== 'boolean') {
      throw createError('sportsEnabled.pool must be a boolean', 400);
    }

    if (sportsEnabled.darts !== undefined && typeof sportsEnabled.darts !== 'boolean') {
      throw createError('sportsEnabled.darts must be a boolean', 400);
    }

    if (
      sportsEnabled.volleyball !== undefined &&
      typeof sportsEnabled.volleyball !== 'boolean'
    ) {
      throw createError('sportsEnabled.volleyball must be a boolean', 400);
    }

    for (const sport of SPORTS) {
      if (sportsEnabled[sport] === true && !isSportLicensed(sport)) {
        throw createError(`Cannot enable ${sport} — sport is not licensed for this deployment`, 400);
      }
    }

    Object.assign(settings.sportsEnabled, sportsEnabled);
  }
}

function formatSubmission(doc: ISubmission | Record<string, unknown>) {
  const createdAt = doc.createdAt as Date | string;

  return {
    _id: doc._id,
    submitterName: doc.submitterName,
    caption: doc.caption,
    thumbnailUrl: doc.thumbnailUrl,
    consent: doc.consent,
    status: doc.status,
    when: new Date(createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

router.get(
  '/me',
  asyncHandler(async (req, res: Response) => {
    const auth0Sub = extractAuth0Sub(req);

    if (!auth0Sub) {
      throw createError('Unauthorized', 401);
    }

    const user = await User.findOne({ auth0Sub }).select('name email role').lean();

    if (!user) {
      throw createError('Forbidden — user not registered in staff database', 403);
    }

    if (!['manager', 'staff', 'league_admin'].includes(user.role)) {
      throw createError('Forbidden — staff access only', 403);
    }

    res.json({ data: user });
  })
);

router.get(
  '/overview',
  asyncHandler(async (_req, res: Response) => {
    const now = new Date();
    const settings = await getSettingsDocument();

    const [pendingSubmissions, upcomingEvents] = await Promise.all([
      Submission.countDocuments({ status: 'pending' }),
      Event.countDocuments(getActiveEventsFilter(now)),
    ]);

    res.json({
      data: {
        pendingSubmissions,
        upcomingEvents,
        announcement: {
          enabled: settings.announcement.enabled,
          message: settings.announcement.message,
        },
        featuredBanner: {
          enabled: settings.featuredBanner.enabled,
        },
      },
    });
  })
);

router.get(
  '/submissions',
  asyncHandler(async (req, res: Response) => {
    const status = (req.query.status as string) || 'pending';

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw createError('Invalid status filter', 400);
    }

    const submissions = await Submission.find({ status })
      .sort({ createdAt: -1 })
      .select('_id submitterName caption thumbnailUrl consent status createdAt')
      .lean();

    res.json({
      data: submissions.map((doc) => formatSubmission(doc)),
      meta: { count: submissions.length },
    });
  })
);

router.patch(
  '/submissions/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid submission id', 400);
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      throw createError('Invalid status', 400);
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      throw createError('Submission not found', 404);
    }

    const auth0Sub = extractAuth0Sub(req);
    let reviewedBy;

    if (auth0Sub) {
      const user = await User.findOne({ auth0Sub });
      if (user) {
        reviewedBy = user._id;
      }
    }

    if (status === 'approved' && submission.status !== 'approved') {
      if (submission.cloudinaryFolder === 'pending') {
        const moved = await moveToGallery(submission.cloudinaryPublicId);
        submission.imageUrl = moved.imageUrl;
        submission.thumbnailUrl = moved.thumbnailUrl;
        submission.cloudinaryPublicId = moved.cloudinaryPublicId;
        submission.cloudinaryFolder = 'gallery';
      }
    }

    submission.status = status as ISubmission['status'];

    if (status === 'approved' || status === 'rejected') {
      submission.review = {
        reviewedBy,
        reviewedAt: new Date(),
      };
    }

    if (status === 'pending') {
      submission.review = undefined;
    }

    await submission.save();

    res.json({ data: formatSubmission(submission.toObject()) });
  })
);

router.delete(
  '/submissions/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid submission id', 400);
    }

    const submission = await Submission.findById(id);

    if (!submission) {
      throw createError('Submission not found', 404);
    }

    await destroyImage(submission.cloudinaryPublicId);
    await submission.deleteOne();

    res.json({ data: { id } });
  })
);

router.get(
  '/events',
  asyncHandler(async (_req, res: Response) => {
    const events = await Event.find().lean();
    res.json({ data: sortEventsForDisplay(events) });
  })
);

router.post(
  '/events',
  asyncHandler(async (req, res: Response) => {
    const { type, title, description, timeLabel, scheduleType, date, dayOfWeek, startDate, endDate } =
      req.body as {
        type?: EventType;
        title?: string;
        description?: string;
        timeLabel?: string;
        scheduleType?: string;
        date?: string;
        dayOfWeek?: number;
        startDate?: string;
        endDate?: string;
      };

    if (!type || !title?.trim()) {
      throw createError('type and title are required', 400);
    }

    if (!EVENT_TYPES.includes(type)) {
      throw createError('Invalid event type', 400);
    }

    let schedule;

    try {
      schedule = parseEventScheduleInput({
        scheduleType,
        date,
        dayOfWeek,
        startDate,
        endDate,
      });
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid schedule', 400);
    }

    const auth0Sub = extractAuth0Sub(req);
    let createdBy;

    if (auth0Sub) {
      const user = await User.findOne({ auth0Sub });
      if (user) {
        createdBy = user._id;
      }
    }

    const event = await Event.create({
      type,
      scheduleType: schedule.scheduleType,
      title: title.trim(),
      description: description?.trim() ?? '',
      date: schedule.date,
      dayOfWeek: schedule.dayOfWeek,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      timeLabel: timeLabel?.trim() ?? 'TBD',
      createdBy,
    });

    res.status(201).json({ data: event.toObject() });
  })
);

router.patch(
  '/events/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid event id', 400);
    }

    const body = req.body as Record<string, unknown>;

    if (body.type !== undefined && !EVENT_TYPES.includes(body.type as EventType)) {
      throw createError('Invalid event type', 400);
    }

    let fields;

    try {
      fields = buildEventFieldsFromBody(body);
    } catch (error) {
      throw createError(error instanceof Error ? error.message : 'Invalid event data', 400);
    }

    if (Object.keys(fields.set).length === 0 && fields.unset.length === 0) {
      throw createError('No valid fields to update', 400);
    }

    const event = await Event.findByIdAndUpdate(id, toMongoUpdatePayload(fields), {
      new: true,
      runValidators: true,
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    res.json({ data: event.toObject() });
  })
);

router.delete(
  '/events/:id',
  asyncHandler(async (req, res: Response) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw createError('Invalid event id', 400);
    }

    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      throw createError('Event not found', 404);
    }

    res.json({ data: { id } });
  })
);

router.get(
  '/site',
  asyncHandler(async (_req, res: Response) => {
    const settings = await getSettingsDocument();
    res.json({
      data: {
        ...settings.toObject(),
        sportsLicensed: getLicensedLeagueSports(),
      },
    });
  })
);

router.put(
  '/site',
  requireRole('staff'),
  asyncHandler(async (req, res: Response) => {
    const auth0Sub = extractAuth0Sub(req);
    const user = auth0Sub ? await User.findOne({ auth0Sub }) : null;

    if (user?.role === 'league_admin') {
      throw createError('Forbidden — site settings require manager or staff access', 403);
    }

    const settings = await getSettingsDocument();
    mergeSiteSettings(settings, req.body);
    await settings.save();
    res.json({ data: settings.toObject() });
  })
);

router.post(
  '/media/hero',
  (req, res, next) => {
    heroVideoUpload(req, res, (err: unknown) => {
      if (err instanceof Error) {
        next(createError(err.message, 400));
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res: Response) => {
    if (!req.file) {
      throw createError('No video file provided', 400);
    }

    if (!process.env.CLOUDINARY_URL) {
      throw createError('Cloudinary is not configured', 500);
    }

    const videoUrl = await uploadHeroVideo(req.file.buffer);
    const settings = await getSettingsDocument();
    settings.hero.videoUrl = videoUrl;
    await settings.save();

    res.json({ data: { videoUrl } });
  })
);

router.use('/leagues', leaguesAdminRouter);

export default router;
