import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// socket connection
const socket = io(process.env.BACKEND_SOCKET_URL || "http://localhost:7070");

function ChatApp() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prevChat) => [...prevChat, data]);
    });

    socket.emit("register", "User_" + Math.floor(Math.random() * 1000));

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const sendMessage = () => {
    socket.emit("send_message", { message });
    setMessage("");
  };

  return (
    <div>
      <div>
        {chat.map((c, index) => (
          <p key={index}>
            {c.from}: {c.message}
          </p>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message"
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default ChatApp;
