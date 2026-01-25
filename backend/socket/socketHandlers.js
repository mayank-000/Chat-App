import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';
import { sanitizeMessageContent, sanitizeUsername, containsMaliciousContent } from '../utils/sanitization.js';

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // User joins with their userId
        socket.on('user:join', async (userId) => {
            try {
                socket.userId = userId;
                socket.join(`user:${userId}`);

                // Update user status to online
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    socketId: socket.id,
                    lastSeen: new Date()
                });

                // Notify friends that user is online
                socket.broadcast.emit('user:online', { userId, isOnline: true });

                console.log(`User ${userId} is now online.`);
            } catch (error) {
                console.error('Error in user:join:', error);
            }
        });

        // User joins a room
        socket.on('conversation:join', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`User ${socket.id} joined conversation ${conversationId}`);
        });
        // User leaves a room
        socket.on('conversation:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
            console.log(`Socket ${socket.id} left conversation ${conversationId}`);
        });

        // Send a message
        socket.on('message:send', async (data) => {
            try {
                const { conversationId, content, messageType, mediaUrl } = data;

                // Validate required fields
                if (!conversationId || !content) {
                    socket.emit('message:error', { error: 'Conversation ID and content are required' });
                    return;
                }

                // Check for malicious content before processing
                if (containsMaliciousContent(content)) {
                    socket.emit('message:error', { error: 'Message contains potentially harmful content' });
                    return;
                }

                // Sanitize message content to prevent XSS
                const sanitizedContent = sanitizeMessageContent(content);

                // Validate content isn't empty after sanitization
                if (!sanitizedContent || sanitizedContent.trim().length === 0) {
                    socket.emit('message:error', { error: 'Message content is invalid or empty' });
                    return;
                }

                // Create a save message with sanitized content
                const message = new Message({
                    conversationId,
                    sender: socket.userId,
                    content: sanitizedContent,
                    messageType: messageType || 'text',
                    mediaUrl: mediaUrl || null,
                });

                await message.save();
                await message.populate('sender', 'username');

                // Update conversation's last message timestamp
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessageAt: new Date()
                });

                // Send the sanitized message to all users in the conversation
                io.to(`conversation:${conversationId}`).emit('message:receive', message);

            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('message:error', { error: 'Failed to send message' });
            }
        });

        // Typing indication
        socket.on('typing:start', (data) => {
            const { conversationId, username } = data;
            // Sanitize username to prevent XSS in typing indicators
            const sanitizedUsername = sanitizeUsername(username);
            socket.to(`conversation:${conversationId}`).emit('typing:display', {
                userId: socket.userId,
                username: sanitizedUsername,
                conversationId
            });
        }); 
        socket.on('typing:stop', (data) => {
            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit('typing:hide', {
                userId: socket.userId,
                conversationId
            });
        });
        
        // Message read receipt
        socket.on('message:read', async (data) => {
            try {
                const { messageId, conversationId } = data;

                await Message.findByIdAndUpdate(messageId, {
                    $addToSet: {
                        readBy: {
                            userId: socket.userId,
                            readAt: new Date()
                        }
                    }
                });

                // Notify all users in the conversation about the read receipt
                io.to(`conversation:${conversationId}`).emit('message:read:update', {
                    messageId,
                    userId: socket.userId,
                    readAt: new Date()
                });
            } catch (err) {
                console.error('Error updating read receipt:', err);
            }
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                if(socket.userId) {
                    await User.findByIdAndUpdate(socket.userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                        socketId: null,
                    });
                    // Notify friends that user is offline
                    socket.broadcast.emit('user:offline', {
                        userId: socket.userId,
                        isOnline: false,
                        lastSeen: new Date()
                    })
                }
                console.log(`A user disconnected: ${socket.id}`);
            } catch (err) {
                console.error('Error during disconnect:', err);
            }
        });
    });
};