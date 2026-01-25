import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';
import catchAsync from '../utils/catchAsync.js';
import { sanitizeTextInput } from '../utils/sanitization.js';

// Get all conversations for a user
export const getUserConversations = catchAsync(async (req, res) => {
    const userId = req.userId;
    console.log("Fetching conversations for user:", userId);

    const conversations = await Conversation.find({
        participants: userId
    })
    .populate('participants', 'username email publicKey')
    .sort({ lastMessageAt: -1 });

    console.log('Conversations found:', conversations.length);

    res.status(200).json({
        success: true,
        conversations 
    });
});

// Create or get existing conversation between two users
export const createOrGetConversation = catchAsync(async (req, res) => {
    const { participantId } = req.body;
    const userId = req.userId;

    console.log("Creating or getting conversation between users:", userId, participantId);

    if(!participantId) {
        return res.status(400).json({ success: false, message: 'Participant ID is required' });
    }

    // Chaeking for participant existence
    const participant = await User.findById(participantId);
    if(!participant) {
        return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
        isGroupChat: false,
        participants: { $all: [userId, participantId], $size: 2 }
    })
    .populate('participants', 'username email publicKey');

    if(!conversation) {
        // Create new conversation
        conversation = new Conversation({
            participants: [userId, participantId],
            isGroupChat: false
        });
        await conversation.save();
        await conversation.populate('participants', 'username email');
    } else {
        console.log('Existing conversation found with ID:', conversation._id);
    }

    res.status(200).json({
        success: true,
        conversation 
    });
});

// Adding Pagination to get messages in a conversation
export const getConversationMessages = catchAsync(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

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

// Get all Users
export const getAllUsers = catchAsync(async (req, res) => {
    const userId = req.userId;
    
    console.log("Fetching all users excluding current user:", userId);

    const allUsers = await User.find({
        _id: { $ne: userId }
    })
    .select('username email publicKey')
    .sort({ lastMessageAt: 1 });

    console.log('Users found:', allUsers.length);

    res.status(200).json({
        success: true,
        users: allUsers 
    });
})

// Search Users to start a conversation
export const searchUsers = catchAsync(async (req, res) => {
    const { query } = req.query;
    const userId = req.userId;

    // Sanitize search query to prevent XSS and injection
    const sanitizedQuery = sanitizeTextInput(query);

    console.log("Searching users with sanitized query:", sanitizedQuery);
    console.log("Excluding current user ID:", userId);

    if(!sanitizedQuery) {
        return res.status(400).json({ success: false, message: 'Valid search query is required' });
    }
    const foundUser = await User.find({
        _id: { $ne: userId }, // Exclude current user
        $or: [
            { username: { $regex: sanitizedQuery, $options: 'i' } },
            { email: { $regex: sanitizedQuery, $options: 'i' } }
        ]
    })
    .select('username email publicKey')
    .limit(10);

    console.log('Users found:', foundUser._id);
    
    res.status(200).json({
        success: true,
        users: foundUser
    });
});

// Delete a Message
export const deleteMessage = catchAsync(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.userId;

    if(!messageId) {
        return res.status(400).json({ success: false, message: 'Message ID is required' });
    }

    const message = await Message.findById(messageId);
    if(!message) {
        return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if(message.sender.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Only the sender can delete this message' });
    }

    console.log("Deleting message with ID:", messageId);

    await Message.findByIdAndDelete(messageId);
    res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
    });
});
