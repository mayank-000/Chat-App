import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
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
router.use(verifyToken);

router.get('/conversations', getUserConversations);
router.post('/conversations', createOrGetConversation);
router.get('/conversations/:conversationId/messages', getConversationMessages);
router.get('/users', getAllUsers);
router.get('/users/search', searchUsers);
router.delete('/messages/:messageId', deleteMessage);

export default router;