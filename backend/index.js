import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';

import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();

app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 6060;

import connectDB from './config/db.js';
connectDB();

app.get('/', (req, res) => {
    res.send("API is running...");
})

import authRouter from './routes/auth.routes.js';
import conversationRouter from './routes/conversation.routes.js';

app.use('/api/auth', authRouter);
app.use('/api', conversationRouter);

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
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

setupSocketHandlers(io);

app.set('io', io);

// const users = {};

// io.on("connection", (socket) => {
//     console.log(`User connected: ${socket.id}`);

//     socket.on("register", (username) => {
//         users[socket.id] = username;
//     })

//     socket.on("message", (data) => {
//         if(data.to) {
//             io.to(data.to).emit("receive_message", {
//                 from: socket.id,
//                 message: data.message,
//                 username: users[socket.id] || "Anonymous"
//             });
//         } else {
//             io.emit("receive_message", {
//                 from: socket.id,
//                 message: data.message,
//                 username: users[socket.id] || "Anonymous"
//             });
//         }
//     });

//     socket.on("disconnect", () => {
//         console.log(`User disconnected: ${socket.id}`);
//         delete users[socket.id];
//     });
// });

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

export default app;
