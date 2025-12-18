import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';
import { Conversation } from '../models/conversation.model.js';

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

                // Create a save message
                const  message = new Message({
                    conversationId,
                    sender: socket.userId,
                    content,
                    messageType: messageType || 'text',
                    mediaUrl: mediaUrl || null,
                });

                await message.save();
                await message.populate('sender', 'username');

                // update conversation's last message
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessageAt: new Date()
                });

                // Send the message to all users presents in the conversation(as Parcipants)
                io.to(`conversation:${conversationId}`).emit('message:receive', message);

            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('message:error', {error: 'Failed to send message' });
            }
        });

        // Typing indication
        socket.on('typing:start', (data) => {
            const { conversationId, username } = data;
            socket.to(`conversation:${conversationId}`).emit('typing:display', {
                userId: socket.userId,
                username,
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