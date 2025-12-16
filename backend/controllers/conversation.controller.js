import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';
import catchAsync from '../utils/catchAsync.js';

// Get all conversations for a user
export const getUserConversations = catchAsync(async (req, res) => {
    const userId = req.userId;

    const conversations = await Conversation.find({
        participants: userId
    })
    .populate('participants', 'username email')
    .sort({ lastMessageAt: -1 });

    res.status(200).json({
        success: true,
        conversations 
    });
});

// Create or get existing conversation between two users
export const createOrGetConversation = catchAsync(async (req, res) => {
    const { participantId } = req.body;
    const userId = req.userId;

    if(!participantId) {
        return res.status(400).json({ success: false, message: 'Participant ID is required' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
        isGroupChat: false,
        participants: { $all: [userId, participantId], $size: 2 }
    })
    .populate('participants', 'username email');

    if(!conversation) {
        // Create new conversation
        conversation = new Conversation({
            isGroupChat: false,
            participants: [userId, participantId]
        });
        await conversation.save();
        await conversation.populate('participants', 'username email');
    }

    res.status(200).json({
        success: true,
        conversation 
    });
});

// Adding Pagination to get messages in a conversation
export const getConversationMessages = catchAsync(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
        conversationId
    })
    .populate('sender', 'username')
    .sort({ createdAt: -1 })
    .limit(limit*1)
    .skip((page - 1) * limit);

    const totalMessages = await Message.countDocuments({ conversationId });

    res.status(200).json({
        success: true,
        messages: messages.reverse(), 
        totalPages: Math.ceil(totalMessages / limit),
        currentPage: page
    });
});

// Search Users to start a conversation
export const searchUsers = catchAsync(async (req, res) => {
    const { query } = req.query;
    const userId = req.userId;

    if(!query) {
        return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    const user = await User.find({
        _id: { $ne: userId },
        $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
        ]
    })
    .select('username email');
    
    res.status(200).json({
        success: true,
        users: user 
    });
});
