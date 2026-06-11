import multer from 'multer';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || '8000000', 10);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});
