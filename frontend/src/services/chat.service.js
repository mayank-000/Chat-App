import api from './api';

const chatService = {
    // Get all conversations
    getConversations: async () => {
        try {
            const response = await api.get('/conversations');
            return response.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    },

    // Create or get a conversation with a specific user
    createConversation: async (participantId) => {
        try {
            const response = await api.post('/conversations', { participantId });
            return response.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    },

    // Get messages for a specific conversation
    getMessages: async (conversationId, page = 1) => {
        try {
            const response = await api.get(`/conversations/${conversationId}/messages?page=${page}`);
            return response.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    },

    // Get all Users
    getAllUsers: async () => {
        try {
            const response = await api.get('/users');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Search users to start a new conversation
    searchUsers: async (query) => {
        try {
            const response = await api.get(`/users/search?query=${query}`);
            return response.data;
        } catch (err) {
            throw err.response?.data || err;
        }
    }
};

export default chatService;