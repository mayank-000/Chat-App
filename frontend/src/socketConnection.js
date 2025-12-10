import { io } from "socket.io-client";

const socket = io(process.env.BACKEND_SOCKET_URL || "http://localhost:7070");

export default socket;