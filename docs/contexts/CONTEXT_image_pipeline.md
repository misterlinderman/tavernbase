# Context: Image Upload Pipeline — Barry O's

Paste this at the start of a Cursor session when working on photo submissions, image processing, or Cloudinary integration.

---

## The Job

Patron submits a photo via the public form. We must:
1. Validate the file
2. Strip all EXIF metadata (GPS coordinates, device info, timestamps)
3. Re-encode to a clean JPEG
4. Generate a thumbnail
5. Upload both to a **private** Cloudinary folder (not publicly accessible)
6. Store metadata in MongoDB with `status: 'pending'`
7. When staff approves: move asset to **public** folder, update DB

Nothing from a patron's submission is ever publicly accessible until a staff member explicitly approves it.

---

## Dependencies

```bash
npm install multer sharp cloudinary multer-storage-cloudinary
# or use cloudinary direct upload with sharp piping (preferred — keeps binary in memory)
```

---

## Middleware: upload.ts

```typescript
// server/src/middleware/upload.ts
import multer from 'multer';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || '8000000');

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),  // keep in memory for sharp processing
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});
```

---

## Service: imagePipeline.ts

```typescript
// server/src/services/imagePipeline.ts
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const PENDING_FOLDER = process.env.CLOUDINARY_PENDING_FOLDER || 'barryos/pending';
const GALLERY_FOLDER = process.env.CLOUDINARY_PUBLIC_FOLDER  || 'barryos/gallery';

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function uploadStream(
  stream: Readable,
  folder: string,
  publicId?: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.pipe(upload);
  });
}

export interface ProcessedImage {
  imageUrl: string;
  thumbnailUrl: string;
  cloudinaryPublicId: string;
}

export async function processAndUpload(fileBuffer: Buffer): Promise<ProcessedImage> {
  // 1. Strip EXIF + re-encode to JPEG
  const cleanBuffer = await sharp(fileBuffer)
    .withMetadata({})          // withMetadata({}) strips GPS/device EXIF
    .jpeg({ quality: 88 })
    .toBuffer();

  // 2. Generate thumbnail (400px wide, auto height)
  const thumbBuffer = await sharp(cleanBuffer)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const uid = `sub_${Date.now()}`;

  // 3. Upload original to pending folder
  const { secure_url: imageUrl, public_id: cloudinaryPublicId } =
    await uploadStream(bufferToStream(cleanBuffer), PENDING_FOLDER, uid);

  // 4. Upload thumbnail to pending folder
  const { secure_url: thumbnailUrl } =
    await uploadStream(bufferToStream(thumbBuffer), PENDING_FOLDER, `${uid}_thumb`);

  return { imageUrl, thumbnailUrl, cloudinaryPublicId };
}

// Called when staff approves a submission
export async function moveToGallery(cloudinaryPublicId: string): Promise<string> {
  const galleryId = cloudinaryPublicId.replace(PENDING_FOLDER, GALLERY_FOLDER);
  const result = await cloudinary.uploader.rename(cloudinaryPublicId, galleryId);
  return result.secure_url;
}

// Called when staff rejects or deletes a submission
export async function destroyImage(cloudinaryPublicId: string): Promise<void> {
  await cloudinary.uploader.destroy(cloudinaryPublicId);
  // Also destroy thumbnail if it exists
  const thumbId = cloudinaryPublicId + '_thumb';
  await cloudinary.uploader.destroy(thumbId).catch(() => { /* ignore if missing */ });
}
```

---

## Route: POST /api/submissions

```typescript
// server/src/routes/submissions.ts (public, no auth)
import { Router, Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { uploadMiddleware } from '../middleware/upload';
import { processAndUpload } from '../services/imagePipeline';
import { submissionRateLimit } from '../middleware/rateLimit';
import { Submission } from '../models';

const router = Router();

const CONSENT_TEXT = `I took this photo (or have permission to share it), everyone
pictured is okay with it being posted, and I give Barry O's permission to use it
on their website and social media.`;

router.post(
  '/',
  submissionRateLimit,
  uploadMiddleware.single('photo'),
  asyncHandler(async (req: Request, res: Response) => {
    const { submitterName, caption, consent } = req.body;

    // Server-side consent check — non-negotiable
    if (consent !== 'true' && consent !== true) {
      throw createError('Consent is required', 400);
    }
    if (!submitterName?.trim()) {
      throw createError('Submitter name is required', 400);
    }
    if (!req.file) {
      throw createError('A photo is required', 400);
    }

    const { imageUrl, thumbnailUrl, cloudinaryPublicId } =
      await processAndUpload(req.file.buffer);

    await Submission.create({
      submitterName: submitterName.trim(),
      caption: (caption || '').trim(),
      imageUrl,
      thumbnailUrl,
      cloudinaryPublicId,
      cloudinaryFolder: 'pending',
      status: 'pending',
      consent: true,
      consentText: CONSENT_TEXT,
      exifStripped: true,
      submitterIpHash: hashIp(req.ip || ''),
    });

    res.status(201).json({
      message: "Got it — a staff member will review your photo before it goes live.",
    });
  })
);

function hashIp(ip: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export default router;
```

---

## Rate Limiting: rateLimit.ts

```typescript
// server/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const submissionRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX_SUBMISSIONS || '10'),
  message:  { error: 'Too many submissions. Please wait a while and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Cloudinary Config

```typescript
// server/src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
// CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name

export { cloudinary };
```

---

## Notes

- `sharp().withMetadata({})` with an empty object strips GPS and device EXIF while preserving safe metadata like color profiles.
- Never return `imageUrl` of a pending submission to the public API — only approved submissions are returned by GET /api/gallery.
- Cloudinary's "pending" folder should have restricted access rules in the Cloudinary dashboard (not set to public delivery).
- If Cloudinary upload fails, do NOT create the Submission record — roll back and return 500.
