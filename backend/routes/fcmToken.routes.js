import express from 'express';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';
import { generalLimiter } from '../middlewares/rateLimit.middleware.js';
import { saveFCMToken, deleteFCMToken } from '../controllers/fcmToken.controller.js';

const router = express.Router();

router.use(verifyAccessToken);

router.post('/token', generalLimiter, saveFCMToken);
router.delete('/token', generalLimiter, deleteFCMToken);

export default router;