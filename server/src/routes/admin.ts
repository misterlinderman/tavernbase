import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { EVENT_TYPES, type EventType } from '../constants/eventTypes';
import { checkJwt, extractAuth0Sub } from '../middleware/auth';
import { heroVideoUpload } from '../middleware/uploadHero';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Event, SiteSettings, Submission, User } from '../models';
import type { ISiteSettings } from '../models/SiteSettings';
import { uploadHeroVideo } from '../services/storage';
import { destroyImage, moveToGallery } from '../services/imagePipeline';
import type { ISubmission } from '../models/Submission';

const router = Router();

router.use(checkJwt);

const LINK_TARGETS = ['Events', 'Christmas Party', 'Menu', 'Contact'] as const;
type LinkTarget = (typeof LINK_TARGETS)[number];

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDaysUntil(date?: Date): number | null {
  if (!date) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

  if (body.christmasParty !== undefined) {
    if (typeof body.christmasParty !== 'object' || body.christmasParty === null) {
      throw createError('christmasParty must be an object', 400);
    }

    const christmasParty = body.christmasParty as Record<string, unknown>;

    if (
      typeof christmasParty.ticketUrl === 'string' &&
      christmasParty.ticketUrl.trim() !== '' &&
      !isValidUrl(christmasParty.ticketUrl)
    ) {
      throw createError('Invalid christmasParty.ticketUrl', 400);
    }

    if (christmasParty.date !== undefined && christmasParty.date !== null) {
      const parsed = new Date(String(christmasParty.date));
      if (Number.isNaN(parsed.getTime())) {
        throw createError('Invalid christmasParty.date', 400);
      }
      settings.christmasParty.date = parsed;
      delete christmasParty.date;
    }

    Object.assign(settings.christmasParty, christmasParty);
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
  '/overview',
  asyncHandler(async (_req, res: Response) => {
    const now = new Date();
    const settings = await getSettingsDocument();

    const [pendingSubmissions, upcomingEvents] = await Promise.all([
      Submission.countDocuments({ status: 'pending' }),
      Event.countDocuments({ date: { $gte: now } }),
    ]);

    res.json({
      data: {
        pendingSubmissions,
        upcomingEvents,
        announcement: {
          enabled: settings.announcement.enabled,
          message: settings.announcement.message,
        },
        christmas: {
          enabled: settings.christmasParty.enabled,
          daysUntil: getDaysUntil(settings.christmasParty.date),
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
    const events = await Event.find().sort({ date: 1 }).lean();
    res.json({ data: events });
  })
);

router.post(
  '/events',
  asyncHandler(async (req, res: Response) => {
    const { type, title, description, date, timeLabel } = req.body as {
      type?: EventType;
      title?: string;
      description?: string;
      date?: string;
      timeLabel?: string;
    };

    if (!type || !title || !date) {
      throw createError('type, title, and date are required', 400);
    }

    if (!EVENT_TYPES.includes(type)) {
      throw createError('Invalid event type', 400);
    }

    const eventDate = new Date(date);

    if (Number.isNaN(eventDate.getTime())) {
      throw createError('Invalid date', 400);
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
      title: title.trim(),
      description: description?.trim() ?? '',
      date: eventDate,
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

    const updates: Record<string, unknown> = { ...req.body };

    if (updates.type !== undefined && !EVENT_TYPES.includes(updates.type as EventType)) {
      throw createError('Invalid event type', 400);
    }

    if (updates.date !== undefined) {
      const eventDate = new Date(String(updates.date));
      if (Number.isNaN(eventDate.getTime())) {
        throw createError('Invalid date', 400);
      }
      updates.date = eventDate;
    }

    if (typeof updates.title === 'string') {
      updates.title = updates.title.trim();
    }

    if (typeof updates.description === 'string') {
      updates.description = updates.description.trim();
    }

    if (typeof updates.timeLabel === 'string') {
      updates.timeLabel = updates.timeLabel.trim();
    }

    const event = await Event.findByIdAndUpdate(id, updates, {
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
    res.json({ data: settings.toObject() });
  })
);

router.put(
  '/site',
  asyncHandler(async (req, res: Response) => {
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

export default router;
