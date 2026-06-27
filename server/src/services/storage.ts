import { Readable } from 'stream';
import { cloudinary } from '../config/cloudinary';

const HERO_FOLDER = process.env.CLOUDINARY_HERO_FOLDER || 'tavern/hero';

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export async function uploadHeroVideo(fileBuffer: Buffer): Promise<string> {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('Cloudinary is not configured');
  }

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: HERO_FOLDER,
        resource_type: 'video',
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error('Hero video upload failed'));
          return;
        }
        resolve(result.secure_url);
      }
    );

    bufferToStream(fileBuffer).pipe(upload);
  });
}
