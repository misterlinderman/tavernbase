import rateLimit from 'express-rate-limit';

export const submissionRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_SUBMISSIONS || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many submissions. Please wait a while and try again.',
    });
  },
});
