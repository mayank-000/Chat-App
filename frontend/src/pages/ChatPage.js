// frontend/src/pages/ChatPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import chatService from '../services/chat.service';
import './ChatPage.css';

const ChatPage = () => {
    const { user, signout } = useAuth();
    const { 
        isConnected, 
        joinConversation, 
        leaveConversation, 
        sendMessage,
        sendTyping,
        stopTyping,
        socket
    } = useSocket();

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [loading, setLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, []);

    // Setup socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('message:receive', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('typing:display', (data) => {
            setTypingUsers(prev => ({ ...prev, [data.conversationId]: data.username }));
        });

        socket.on('typing:hide', (data) => {
            setTypingUsers(prev => {
                const updated = { ...prev };
                delete updated[data.conversationId];
                return updated;
            });
        });

        return () => {
            socket.off('message:receive');
            socket.off('typing:display');
            socket.off('typing:hide');
        };
    }, [socket]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Join/leave conversation rooms
    useEffect(() => {
        if (selectedConversation) {
            joinConversation(selectedConversation._id);
            loadMessages(selectedConversation._id);

            return () => {
                leaveConversation(selectedConversation._id);
            };
        }
    }, [selectedConversation]);

    const loadConversations = async () => {
        try {
            const response = await chatService.getConversations();
            setConversations(response.conversations);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            setLoading(true);
            const response = await chatService.getMessages(conversationId);
            setMessages(response.messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedConversation) return;

        const messageData = {
            conversationId: selectedConversation._id,
            content: messageInput.trim(),
            messageType: 'text'
        };

        sendMessage(messageData);
        setMessageInput('');
        stopTyping(selectedConversation._id);
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);

        if (!selectedConversation) return;

        if (!isTyping) {
            setIsTyping(true);
            sendTyping(selectedConversation._id, user.username);
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            stopTyping(selectedConversation._id);
        }, 1000);
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length > 0) {
            try {
                const response = await chatService.searchUsers(query);
                setSearchResults(response.users);
                setShowSearch(true);
            } catch (error) {
                console.error('Search failed:', error);
            }
        } else {
            setSearchResults([]);
            setShowSearch(false);
        }
    };

    const handleStartChat = async (participantId) => {
        try {
            const response = await chatService.createConversation(participantId);
            const newConversation = response.conversation;
            
            // Add to conversations if not already there
            const exists = conversations.find(c => c._id === newConversation._id);
            if (!exists) {
                setConversations(prev => [newConversation, ...prev]);
            }
            
            setSelectedConversation(newConversation);
            setShowSearch(false);
            setSearchQuery('');
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    const getOtherParticipant = (conversation) => {
        return conversation.participants.find(p => p._id !== user.id);
    };

    const formatTime = (date) => {
        const messageDate = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (messageDate.toDateString() === today.toDateString()) {
            return messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="chat-page">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3>{user.username}</h3>
                            <span className={`status ${isConnected ? 'online' : 'offline'}`}>
                                {isConnected ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <button onClick={signout} className="logout-btn" title="Logout">
                        Logout
                    </button>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="search-input"
                    />
                    {showSearch && searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map(searchUser => (
                                <div
                                    key={searchUser._id}
                                    className="search-result-item"
                                    onClick={() => handleStartChat(searchUser._id)}
                                >
                                    <div className="user-avatar small">
                                        {searchUser.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="search-user-info">
                                        <p className="search-username">{searchUser.username}</p>
                                        <p className="search-email">{searchUser.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="conversations-list">
                    {conversations.map(conversation => {
                        const otherUser = getOtherParticipant(conversation);

                        return (
                            <div
                                key={conversation._id}
                                className={`conversation-item ${selectedConversation?._id === conversation._id ? 'active' : ''}`}
                                onClick={() => setSelectedConversation(conversation)}
                            >
                                <div className="user-avatar">
                                    {otherUser?.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="conversation-info">
                                    <h4>{otherUser?.username}</h4>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chat Area */}
            <div className="chat-area">
                {selectedConversation ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-user-info">
                                <div className="user-avatar">
                                    {getOtherParticipant(selectedConversation)?.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3>{getOtherParticipant(selectedConversation)?.username}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="messages-container">
                            {loading ? (
                                <div className="loading">Loading messages...</div>
                            ) : (
                                <>
                                    {messages.map((message) => (
                                        <div
                                            key={message._id}
                                            className={`message ${message.sender._id === user.id ? 'sent' : 'received'}`}
                                        >
                                            <div className="message-content">
                                                {message.sender._id !== user.id && (
                                                    <span className="sender-name">{message.sender.username}</span>
                                                )}
                                                <p>{message.content}</p>
                                                <span className="message-time">
                                                    {formatTime(message.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {typingUsers[selectedConversation._id] && (
                                        <div className="typing-indicator">
                                            {typingUsers[selectedConversation._id]} is typing...
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        <form onSubmit={handleSendMessage} className="message-input-container">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={handleTyping}
                                placeholder="Type a message..."
                                className="message-input"
                            />
                            <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <h2>Welcome to Chat App</h2>
                        <p>Select a conversation or search for users to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;