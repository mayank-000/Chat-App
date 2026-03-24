import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT;

import connectDB from './config/db.js';
connectDB();

app.get('/', (req, res) => {
    res.send("API is running...")
})

import authRouter from './routes/auth.routes.js';
import conversationRouter from './routes/conversation.routes.js';
import fcmTokenRouter from './routes/fcmToken.routes.js'

// Routes with rate limiting handled individually in each route file
app.use('/api/auth', authRouter);
app.use('/api', conversationRouter);
app.use('/api/fcm', fcmTokenRouter);

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found",
        status: "error"
    })
})

const server = http.createServer(app);

import { Server } from "socket.io";
import { setupSocketHandlers } from './socket/socketHandlers.js';

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

setupSocketHandlers(io);

app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

export default app;
