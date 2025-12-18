import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_API_URL 
    ? process.env.REACT_APP_API_URL.replace('/api', '') 
    : 'http://localhost:6060';

const socket = io(BACKEND_URL, {
    autoConnect: false, // Changed from false to true
    withCredentials: true,
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

export default socket;