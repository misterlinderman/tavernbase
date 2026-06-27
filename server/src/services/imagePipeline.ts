import { Readable } from 'stream';
import sharp from 'sharp';
import { cloudinary } from '../config/cloudinary';

const PENDING_FOLDER = process.env.CLOUDINARY_PENDING_FOLDER || 'tavern/pending';
const GALLERY_FOLDER = process.env.CLOUDINARY_PUBLIC_FOLDER || 'tavern/gallery';

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
        if (err || !result) {
          reject(err ?? new Error('Cloudinary upload failed'));
          return;
        }
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
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured');
  }

  const cleanBuffer = await sharp(fileBuffer)
    .rotate()
    .withMetadata({})
    .jpeg({ quality: 88 })
    .toBuffer();

  const thumbBuffer = await sharp(cleanBuffer)
    .resize({ width: 400, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const uid = `sub_${Date.now()}`;

  const { secure_url: imageUrl, public_id: cloudinaryPublicId } = await uploadStream(
    bufferToStream(cleanBuffer),
    PENDING_FOLDER,
    uid
  );

  const { secure_url: thumbnailUrl } = await uploadStream(
    bufferToStream(thumbBuffer),
    PENDING_FOLDER,
    `${uid}_thumb`
  );

  return { imageUrl, thumbnailUrl, cloudinaryPublicId };
}

export interface MovedImage {
  imageUrl: string;
  thumbnailUrl: string;
  cloudinaryPublicId: string;
}

export async function moveToGallery(cloudinaryPublicId: string): Promise<MovedImage> {
  const galleryId = cloudinaryPublicId.replace(PENDING_FOLDER, GALLERY_FOLDER);
  const thumbPendingId = `${cloudinaryPublicId}_thumb`;
  const thumbGalleryId = `${galleryId}_thumb`;

  const result = await cloudinary.uploader.rename(cloudinaryPublicId, galleryId);

  let thumbnailUrl = result.secure_url;
  try {
    const thumbResult = await cloudinary.uploader.rename(thumbPendingId, thumbGalleryId);
    thumbnailUrl = thumbResult.secure_url;
  } catch {
    /* keep main image url if thumb rename fails */
  }

  return {
    imageUrl: result.secure_url,
    thumbnailUrl,
    cloudinaryPublicId: galleryId,
  };
}

export async function destroyImage(cloudinaryPublicId: string): Promise<void> {
  await cloudinary.uploader.destroy(cloudinaryPublicId);
  const thumbId = `${cloudinaryPublicId}_thumb`;
  await cloudinary.uploader.destroy(thumbId).catch(() => {
    /* ignore if missing */
  });
}
