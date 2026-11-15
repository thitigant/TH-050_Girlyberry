import { Router } from 'express';
import { responseController } from '../controllers/responseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/responses/my-history or /api/v1/responses/my-history
router.get('/my-history', requireAuth, (req, res, next) =>
  responseController.getMyHistory(req, res, next)
);

// GET /api/responses/:id or /api/v1/responses/:id
router.get('/:id', requireAuth, (req, res, next) =>
  responseController.getResponseById(req, res, next)
);

export default router;
