import express from 'express';
import { verifyAccessToken } from '../middlewares/auth.middleware.js';
import { chatLimiter, generalLimiter } from '../middlewares/rateLimit.middleware.js';
import {
    getUserConversations,
    createOrGetConversation,
    getConversationMessages,
    searchUsers,
    getAllUsers,
    deleteMessage
} from '../controllers/conversation.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyAccessToken);

// Conversation Routes with rate limiting
router.get('/conversations', generalLimiter, getUserConversations);
router.post('/conversations', generalLimiter, createOrGetConversation);
router.get('/conversations/:conversationId/messages', chatLimiter, getConversationMessages);
router.get('/users', generalLimiter, getAllUsers);
router.get('/users/search', generalLimiter, searchUsers);
router.delete('/messages/:messageId', chatLimiter, deleteMessage);

export default router;