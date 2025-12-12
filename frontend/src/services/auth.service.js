import api from './api';

const authService = {
    // Sign up a new user
    signup: async (userData) => {
        try {
            const response = await api.post('/auth/signup', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Sign in an existing user
    signin: async (Credentials) => {
        try {
            const response = await api.post('/auth/signin', Credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Get User profile
    getProfile: async () => {
        try {
            const response = await api.get('/auth/profile');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Sign out the user
    signout: () => {
        window.location.href = '/login';
    }
};

export default authService;