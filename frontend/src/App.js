import React, { useEffect } from "react";
import ChatApp from "./socket";
import socket from "./socketConnection";

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <div className="App">
      <h2>React Chat App</h2>
      <ChatApp />
    </div>
  );
}

export default App;
