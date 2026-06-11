import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Item } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/items - Get all items for current user
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    
    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const { completed, sort = '-createdAt', limit = 50, page = 1 } = req.query;

    // Build query
    const query: Record<string, unknown> = { user: userId };
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Item.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

// GET /api/items/:id - Get single item
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const item = await Item.findOne({ _id: id, user: userId });

    if (!item) {
      throw createError('Item not found', 404);
    }

    res.json(item);
  })
);

// POST /api/items - Create new item
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);

    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const { title, description } = req.body;

    if (!title || !title.trim()) {
      throw createError('Title is required', 400);
    }

    const item = await Item.create({
      title: title.trim(),
      description: description?.trim(),
      user: userId,
    });

    res.status(201).json(item);
  })
);

// PUT /api/items/:id - Update item
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const { title, description, completed } = req.body;

    // Build update object with only provided fields
    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description?.trim();
    if (completed !== undefined) update.completed = completed;

    const item = await Item.findOneAndUpdate(
      { _id: id, user: userId },
      update,
      { new: true, runValidators: true }
    );

    if (!item) {
      throw createError('Item not found', 404);
    }

    res.json(item);
  })
);

// DELETE /api/items/:id - Delete item
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const item = await Item.findOneAndDelete({ _id: id, user: userId });

    if (!item) {
      throw createError('Item not found', 404);
    }

    res.json({ message: 'Item deleted successfully' });
  })
);

// POST /api/items/:id/toggle - Toggle item completion
router.post(
  '/:id/toggle',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!userId) {
      throw createError('User ID not found in token', 401);
    }

    const item = await Item.findOne({ _id: id, user: userId });

    if (!item) {
      throw createError('Item not found', 404);
    }

    item.completed = !item.completed;
    await item.save();

    res.json(item);
  })
);

export default router;
