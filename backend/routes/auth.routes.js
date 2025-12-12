import express from 'express';

import authController from '../controllers/auth.controller.js';

import authMiddleware from '../middlewares/auth.middleware.js';

const router  = express.Router();

// Authentication Routes
router.post("/signup", authController.createUserAccount)
router.post("/signin", authController.loginUser)

router.get("/profile", authMiddleware.verifyToken, authController.getUserProfile)

export default router;