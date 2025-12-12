import express from 'express';
import { createUserAccount, loginUser, getUserProfile } from '../controllers/auth.controllers.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Authentication Routes
router.post("/signup", createUserAccount);
router.post("/signin", loginUser);
router.get("/profile", verifyToken, getUserProfile);

export default router;