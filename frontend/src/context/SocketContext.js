import React, { createContext, useContext, useEffect, useState } from 'react';
import socket from '../socketConnection';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});

    useEffect(() => {
        if (user) {
            // Connect socket
            socket.connect();

            socket.on('connect', () => {
                setIsConnected(true);
                console.log('Socket connected');
                socket.emit('user:join', user.id);
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
                console.log('Socket disconnected');
            });

            socket.on('user:online', (data) => {
                setOnlineUsers(prev => ({
                    ...prev,
                    [data.userId]: { isOnline: true }
                }));
            });

            socket.on('user:offline', (data) => {
                setOnlineUsers(prev => ({
                    ...prev,
                    [data.userId]: { isOnline: false, lastSeen: data.lastSeen }
                }));
            });

            return () => {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('user:online');
                socket.off('user:offline');
                socket.disconnect();
            };
        }
    }, [user]);

    const joinConversation = (conversationId) => {
        socket.emit('conversation:join', conversationId);
    };

    const leaveConversation = (conversationId) => {
        socket.emit('conversation:leave', conversationId);
    };

    const sendMessage = (data) => {
        socket.emit('message:send', data);
    };

    const sendTyping = (conversationId, username) => {
        socket.emit('typing:start', { conversationId, username });
    };

    const stopTyping = (conversationId) => {
        socket.emit('typing:stop', { conversationId });
    };

    const markAsRead = (messageId, conversationId) => {
        socket.emit('message:read', { messageId, conversationId });
    };

    const value = {
        socket,
        isConnected,
        onlineUsers,
        joinConversation,
        leaveConversation,
        sendMessage,
        sendTyping,
        stopTyping,
        markAsRead
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};