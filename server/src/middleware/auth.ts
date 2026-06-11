import { auth } from 'express-oauth2-jwt-bearer';
import { Request, Response, NextFunction } from 'express';

// Auth0 JWT validation middleware
export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});

// Use the Request type directly - express-oauth2-jwt-bearer augments it with auth property
export type AuthRequest = Request;

// Extract user ID from token
export const extractUserId = (req: Request): string | null => {
  return req.auth?.payload?.sub || null;
};

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If token exists, validate it
  checkJwt(req, res, (err) => {
    if (err) {
      // Token invalid, but optional so continue without auth
      return next();
    }
    next();
  });
};
