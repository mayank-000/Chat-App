import axios from 'axios';

const BASE_URL = 'https://chat-app-3ltt.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Bare axios instance for refresh only (no interceptors) to avoid 401 → refresh → 401 loop
const refreshClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (err, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (err) reject(err);
        else resolve(token);
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        if (error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // Don't retry refresh request; don't retry if we already retried
        if (originalRequest.skipAuthRefresh || originalRequest._retry) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await refreshClient.post('/auth/refreshtoken', { refreshToken });
            processQueue(null, true);
            return api(originalRequest);
        } catch (refreshErr) {
            processQueue(refreshErr, null);
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.href = '/login';
            }
            return Promise.reject(refreshErr);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
export { refreshClient };
