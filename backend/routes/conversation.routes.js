import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
    getUserConversations,
    createOrGetConversation,
    getConversationMessages,
    searchUsers,
} from '../controllers/conversation.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

router.get('/conversations', getUserConversations);
router.post('/conversations', createOrGetConversation);
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.get('/users/search', searchUsers);

export default router;