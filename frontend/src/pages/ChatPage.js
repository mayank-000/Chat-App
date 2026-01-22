import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import chatService from "../services/chat.service";
import { encryptMessage, decryptMessage } from "../services/encryption.service";
import "./ChatPage.css";

const ChatPage = () => {
  const { user, signout, userPrivateKey } = useAuth();
  const {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    stopTyping,
    socket,
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  const [color, setColor] = useState("light");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Memoize decrypt function
  const decryptMessageContent = useCallback(async (message) => {
    try {
      if(!userPrivateKey) {
        return "[Encrypted - Key not available]";
      }

      let encryptedData;
      try {
        encryptedData = JSON.parse(message.content);
      } catch (e) {
        try {
          const decrypted = await decryptMessage(message.content, userPrivateKey);
          return decrypted;
        } catch (err) {
          return "[Failed to decrypt - old format]";
        }
      }
      
      let encryptedContent;
      if (message.sender._id === user.id) {
        encryptedContent = encryptedData.forSender;
      } else {
        encryptedContent = encryptedData.forReceiver;
      }

      const decrypted= await decryptMessage(encryptedContent, userPrivateKey);
      return decrypted;
    } catch (error) {
      console.error("Decryption failed for message:", message._id, error);
      return "[Failed to decrypt]";
    }
  }, [userPrivateKey, user.id]);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme) {
      setColor(savedTheme);
    }
    loadConversations();
    loadAllUsers();
  }, []);

  useEffect(() => {
    const decryptAllMessages = async () => {
      if (!userPrivateKey || messages.length === 0) return;

      const decrypted = {};
      for (const message of messages) {
        try {
          decrypted[message._id] = await decryptMessageContent(message);
        } catch (err) {
          console.error("Failed to decrypt message:", err);
          decrypted[message._id] = "[Failed to decrypt]";
        }
      }
      setDecryptedMessages(decrypted);
    };

    decryptAllMessages();
  }, [messages, userPrivateKey, user.id, decryptMessageContent]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = async (message) => {
      console.log("Message received:", message);
      setMessages((prev) => [...prev, message]);

      if (userPrivateKey) {
        try {
          const decrypted = await decryptMessageContent(message);
          setDecryptedMessages((prev) => ({
            ...prev,
            [message._id]: decrypted,
          }));
        } catch (err) {
          console.error("Failed to decrypt incoming message:", err);
          setDecryptedMessages((prev) => ({
            ...prev,
            [message._id]: "[Failed to decrypt]",
          }));
        }
      }
    };

    socket.on("message:receive", handleMessageReceive);
    socket.on("typing:display", (data) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.conversationId]: data.username,
      }));
    });
    socket.on("typing:hide", (data) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[data.conversationId];
        return updated;
      });
    });

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("typing:display");
      socket.off("typing:hide");
    };
  }, [socket, userPrivateKey, decryptMessageContent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (selectedConversation) {
      console.log("Joining conversation:", selectedConversation._id);
      joinConversation(selectedConversation._id);
      loadMessages(selectedConversation._id);

      return () => {
        console.log("Leaving conversation:", selectedConversation._id);
        leaveConversation(selectedConversation._id);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await chatService.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await chatService.getAllUsers();
      setAllUsers(response.users);
      setFilteredUsers(response.users);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const response = await chatService.getMessages(conversationId);
      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      // Get recipient from conversation
      const recipient = getOtherParticipant(selectedConversation);

      if (!recipient || !recipient.publicKey) {
        alert("Cannot send encrypted message: Recipient has no encryption key");
        return;
      }

      if (!userPrivateKey) {
        alert("Cannot send encrypted message: Your private key is missing");
        return;
      }

      const plainMessage = messageInput.trim();

      // Encrypt message with recipient's public key
      const encryptedForReceiver = await encryptMessage(
        plainMessage,
        recipient.publicKey
      );

      const encryptedForSender = await encryptMessage(
        plainMessage,
        user.publicKey
      );

      // Store both versions as JSON
      const dualEncrypted = JSON.stringify({
        forReceiver: encryptedForReceiver,
        forSender: encryptedForSender,
        senderId: user.id,
        recipientId: recipient._id,
      });

      const messageData = {
        conversationId: selectedConversation._id,
        content: dualEncrypted,
        messageType: "text",
      };

      console.log("Sending dual-encrypted message:", messageData);
      sendMessage(messageData);

      setMessageInput("");
      stopTyping(selectedConversation._id);
    } catch (error) {
      console.error("Encryption failed:", error);
      alert("Failed to encrypt message. Please try again.");
    }
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);

    if (!selectedConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      sendTyping(selectedConversation._id, user.username);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(selectedConversation._id);
    }, 1000);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 0) {
      const filtered = allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(allUsers);
    }
  };

  const handleStartChat = async (participantId) => {
    try {
      console.log("Starting chat with user:", participantId);
      const response = await chatService.createConversation(participantId);
      const newConversation = response.conversation;

      console.log("Conversation created/retrieved:", newConversation);

      // Add to conversations list if not already there
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === newConversation._id);
        if (exists) {
          return prev;
        }
        return [newConversation, ...prev];
      });

      // Set as selected conversation
      setSelectedConversation(newConversation);
      setSearchQuery("");
      setFilteredUsers(allUsers); // Reset filter
    } catch (error) {
      console.error("Failed to create conversation:", error);
      alert("Failed to start conversation. Please try again.");
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !conversation.participants) return null;
    return conversation.participants.find((p) => p._id !== user.id);
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const changeTheme = (Theme) => {
    setColor(Theme);
    localStorage.setItem("theme", Theme);
  };

  const deleteMessage = async (messageId) => {
    try {
      const response = await chatService.deleteMessage(messageId);
      if (response.success) {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== messageId)
        );
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  return (
    <div
      className={`chat-page ${color === "dark" ? "dark-theme" : "light-theme"}`}
    >
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <div className="user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{user.username}</h3>
              <span className={`status ${isConnected ? "online" : "offline"}`}>
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          <button
            onClick={() => changeTheme(color === "light" ? "dark" : "light")}
            className="theme-btn"
            title="Toggle Theme"
          >
            {color === "light" ? "🌙" : "☀️"}
          </button>
          <button onClick={signout} className="logout-btn" title="Logout">
            Logout
          </button>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        {/* All Users List */}
        <div className="users-list">
          <h4 className="section-title">All Users</h4>
          {filteredUsers.length > 0 ? (
            filteredUsers.map((otherUser) => (
              <div
                key={otherUser._id}
                className="user-item"
                onClick={() => handleStartChat(otherUser._id)}
              >
                <div className="user-avatar small">
                  {otherUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-item-info">
                  <h4>{otherUser.username}</h4>
                  <p className="user-email">{otherUser.email}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-users">No users found</div>
          )}
        </div>

        {/* Conversations List */}
        {conversations.length > 0 && (
          <>
            <h4 className="section-title">Recent Chats</h4>
            <div className="conversations-list">
              {conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                if (!otherUser) return null;

                return (
                  <div
                    key={conversation._id}
                    className={`conversation-item ${
                      selectedConversation?._id === conversation._id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="user-avatar">
                      {otherUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="conversation-info">
                      <h4>{otherUser.username}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="user-avatar">
                  {getOtherParticipant(selectedConversation)
                    ?.username.charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <h3>{getOtherParticipant(selectedConversation)?.username}</h3>
                </div>
              </div>
            </div>

            <div className="messages-container">
              {loading ? (
                <div className="loading">Loading messages...</div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div
                      className="no-messages"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`message ${
                          message.sender._id === user.id ? "sent" : "received"
                        }`}
                      >
                        <div className="message-content">
                          {message.sender._id !== user.id && (
                            <span className="sender-name">
                              {message.sender.username}
                            </span>
                          )}
                          <p>
                            {message.sender._id === user.id
                              ? decryptedMessages[message._id] ||
                                "Decrypting your message..."
                              : decryptedMessages[message._id] ||
                                "Decrypting..."}
                          </p>
                          <div className="message-box">
                            <div className="message-actions">
                              <span className="message-time">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                            {message.sender._id === user.id && (
                              <button
                                onClick={() => deleteMessage(message._id)}
                                className="delete-message-btn"
                                title="Delete message"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {typingUsers[selectedConversation._id] && (
                    <div className="typing-indicator">
                      {typingUsers[selectedConversation._id]} is typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="message-input-container"
            >
              <input
                type="text"
                value={messageInput}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="message-input"
              />
              <button
                type="submit"
                className="send-btn"
                disabled={!messageInput.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Welcome to Chat App</h2>
            <p>Click on any user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
