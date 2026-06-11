import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { User } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/users/me - Get current user profile
router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    
    if (!auth0Id) {
      throw createError('User ID not found in token', 401);
    }

    const user = await User.findOne({ auth0Id });

    // If user doesn't exist, they might be new - return basic info
    if (!user) {
      res.json({
        auth0Id,
        isNew: true,
        message: 'User profile not yet created',
      });
      return;
    }

    res.json(user);
  })
);

// PUT /api/users/me - Update current user profile
router.put(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    
    if (!auth0Id) {
      throw createError('User ID not found in token', 401);
    }

    const { email, name, picture } = req.body;

    // Find and update, or create if doesn't exist
    const user = await User.findOneAndUpdate(
      { auth0Id },
      {
        auth0Id,
        email,
        name,
        picture,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.json(user);
  })
);

// DELETE /api/users/me - Delete current user
router.delete(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    
    if (!auth0Id) {
      throw createError('User ID not found in token', 401);
    }

    const user = await User.findOneAndDelete({ auth0Id });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({ message: 'User deleted successfully' });
  })
);

export default router;
