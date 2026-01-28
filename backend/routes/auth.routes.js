import express from 'express';
import { createUserAccount, loginUser, getUserProfile, refreshAccessToken, logout } from '../controllers/auth.controllers.js';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';
import { authLimiter, generalLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Authentication Routes with rate limiting
router.post("/signup", authLimiter, createUserAccount);
router.post("/signin", authLimiter, loginUser);
router.post("/refreshtoken", generalLimiter, refreshAccessToken);
router.get("/profile", generalLimiter, verifyAccessToken, getUserProfile);
router.get("/logout", logout);

export default router;