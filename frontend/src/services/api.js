import axios from 'axios';

if(process.env.REACT_APP_API_URL) {
    console.log("Hii Mayank !");
}
const api = axios.create({
    baseURL: 'https://chat-app-3ltt.onrender.com/api',
    withCredentials: true, // This allows sending cookies with requests
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if(error.response?.status === 401) {
            // Token expired or invalid - redirect to login
            const currentPath = window.location.pathname;
            if(currentPath !== '/login' && currentPath !== '/signup') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
