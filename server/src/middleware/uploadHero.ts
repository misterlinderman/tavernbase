import multer from 'multer';

const MAX_HERO_BYTES = 500 * 1024 * 1024;

export const heroVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_HERO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
      return;
    }
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
}).single('video');
