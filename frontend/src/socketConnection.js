import { io } from "socket.io-client";

const socket = io("http://localhost:6060", {
    autoConnect: false,
});

export default socket;