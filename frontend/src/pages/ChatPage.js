import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import chatService from "../services/chat.service";
import { encryptMessage, decryptMessage } from "../services/encryption.service";
import "./ChatPage.css";


const ChatPage = () => {
  const { user, signout, userPrivateKey, listenForegroundMessages } = useAuth();
  const {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    stopTyping,
    markAsRead,
    onlineUsers,
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

  // ── Mobile panel state ──────────────────────────────────────────
  // On mobile we show either the sidebar OR the chat, not both.
  // isMobile tracks window width; chatOpen controls which panel is visible.
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [chatOpen, setChatOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // Ref so the socket handler always reads the latest selectedConversation
  // without needing it in the dependency array (which would re-register
  // all socket listeners on every conversation switch).
  const selectedConversationRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Detect mobile viewport changes (rotation, resize)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
      if (window.innerWidth > 640) {
        // Desktop: always show both panels, reset mobile state
        setChatOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for foreground FCM notifications
  useEffect(() => {
    const unsubscribe = listenForegroundMessages((payload) => {
      console.log("Foreground notification received", payload);
      if (Notification.permission === "granted" && document.visibilityState === "hidden") {
        new Notification(payload.notification?.title || "New Message", {
          body: payload.notification?.body,
          icon: "/logo192.png",
          data: payload.data,
        });
      }
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [listenForegroundMessages]);

  // Memoize decrypt function
  const decryptMessageContent = useCallback(async (message) => {
    try {
      if (!userPrivateKey) return "[Encrypted - Key not available]";

      let encryptedData;
      try {
        encryptedData = JSON.parse(message.content);
      } catch (e) {
        try {
          return await decryptMessage(message.content, userPrivateKey);
        } catch {
          return "[Failed to decrypt - old format]";
        }
      }

      const encryptedContent =
        message.sender._id === user.id
          ? encryptedData.forSender
          : encryptedData.forReceiver;

      return await decryptMessage(encryptedContent, userPrivateKey);
    } catch (error) {
      console.error("Decryption failed for message:", message._id, error);
      return "[Failed to decrypt]";
    }
  }, [userPrivateKey, user.id]);

  // Load theme + initial data
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setColor(savedTheme);
    loadConversations();
    loadAllUsers();
  }, []);

  // Decrypt all messages whenever the messages array changes
  useEffect(() => {
    const decryptAll = async () => {
      if (!userPrivateKey || messages.length === 0) return;
      const decrypted = {};
      for (const message of messages) {
        try {
          decrypted[message._id] = await decryptMessageContent(message);
        } catch {
          decrypted[message._id] = "[Failed to decrypt]";
        }
      }
      setDecryptedMessages(decrypted);
    };
    decryptAll();
  }, [messages, userPrivateKey, decryptMessageContent]);

  // ── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceive = async (message) => {
      setMessages((prev) => [...prev, message]);
      loadConversations();

      // If the conversation is currently open and it's not our own message,
      // immediately emit read so the sender gets a double-tick right away
      if (
        selectedConversationRef.current?._id === message.conversationId &&
        message.sender._id !== user.id
      ) {
        markAsRead(message._id, message.conversationId);
      }

      if (userPrivateKey) {
        try {
          const decrypted = await decryptMessageContent(message);
          setDecryptedMessages((prev) => ({ ...prev, [message._id]: decrypted }));
        } catch {
          setDecryptedMessages((prev) => ({ ...prev, [message._id]: "[Failed to decrypt]" }));
        }
      }

      // Note: push notifications when the tab is hidden are handled by
      // the FCM foreground listener in the listenForegroundMessages effect.
      // Do NOT add another new Notification() call here — it would fire twice.
    };

    socket.on("message:receive", handleMessageReceive);
    socket.on("typing:display", (data) => {
      setTypingUsers((prev) => ({ ...prev, [data.conversationId]: data.username }));
    });
    socket.on("typing:hide", (data) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[data.conversationId];
        return updated;
      });
    });

    // Read receipts — when the other person reads our message, update readBy
    socket.on("message:read:update", ({ messageId, userId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;
          const alreadyRead = msg.readBy?.some((r) => r.userId === userId);
          if (alreadyRead) return msg;
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { userId, readAt }],
          };
        })
      );
    });

    return () => {
      socket.off("message:receive", handleMessageReceive);
      socket.off("typing:display");
      socket.off("typing:hide");
      socket.off("message:read:update");
    };
  }, [socket, userPrivateKey, decryptMessageContent, markAsRead, user.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation._id);
      loadMessages(selectedConversation._id);
      return () => { leaveConversation(selectedConversation._id); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // ── Data loaders ───────────────────────────────────────────────────
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

      // Mark the last received message as read so the sender gets a tick
      const msgs = response.messages;
      const lastReceived = [...msgs].reverse().find(
        (m) => m.sender._id !== user.id
      );
      if (lastReceived) {
        markAsRead(lastReceived._id, conversationId);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const recipient = getOtherParticipant(selectedConversation);

      if (!recipient?.publicKey) {
        alert("Cannot send encrypted message: Recipient has no encryption key");
        return;
      }
      if (!userPrivateKey) {
        alert("Cannot send encrypted message: Your private key is missing");
        return;
      }

      const plainMessage = messageInput.trim();
      const encryptedForReceiver = await encryptMessage(plainMessage, recipient.publicKey);
      const encryptedForSender = await encryptMessage(plainMessage, user.publicKey);

      const dualEncrypted = JSON.stringify({
        forReceiver: encryptedForReceiver,
        forSender: encryptedForSender,
        senderId: user.id,
        recipientId: recipient._id,
      });

      sendMessage({ conversationId: selectedConversation._id, content: dualEncrypted, messageType: "text" });
      setMessageInput("");
      stopTyping(selectedConversation._id);

      // ── Cache invalidation: optimistically refresh conversations list
      // so the sidebar order updates right after sending without waiting
      // for the socket echo to come back.
      setTimeout(loadConversations, 300);
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
      setFilteredUsers(
        allUsers.filter(
          (u) =>
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(allUsers);
    }
  };

  const handleStartChat = async (participantId) => {
    try {
      const response = await chatService.createConversation(participantId);
      const newConversation = response.conversation;

      setConversations((prev) => {
        const exists = prev.find((c) => c._id === newConversation._id);
        return exists ? prev : [newConversation, ...prev];
      });

      setSelectedConversation(newConversation);
      setSearchQuery("");
      setFilteredUsers(allUsers);

      // On mobile: switch to chat panel
      if (isMobile) setChatOpen(true);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      alert("Failed to start conversation. Please try again.");
    }
  };

  // Select a recent conversation from sidebar
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) setChatOpen(true);
  };

  // Mobile back button — return to sidebar
  const handleBackToSidebar = () => {
    setChatOpen(false);
    setSelectedConversation(null);
  };

  const deleteMessage = async (messageId) => {
    try {
      const response = await chatService.deleteMessage(messageId);
      if (response.success) {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        // ── Cache invalidation: after deleting, conversation preview may change
        loadConversations();
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants) return null;
    return conversation.participants.find((p) => p._id !== user.id);
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const changeTheme = (Theme) => {
    setColor(Theme);
    localStorage.setItem("theme", Theme);
  };

  // Returns true if a given userId is currently online
  const isUserOnline = (userId) => {
    return onlineUsers[userId]?.isOnline === true;
  };

  // For sent messages: returns 'read', 'delivered', or 'sent'
  // 'read'      — recipient has a readBy entry
  // 'sent'      — just the single tick (no readBy yet)
  const getMessageStatus = (message) => {
    if (message.sender._id !== user.id) return null; // only show for own messages
    const recipient = getOtherParticipant(selectedConversation);
    if (!recipient) return "sent";
    const readByRecipient = message.readBy?.some(
      (r) => r.userId === recipient._id || r.userId?._id === recipient._id
    );
    return readByRecipient ? "read" : "sent";
  };

  // ── Derive CSS classes for mobile panel switching ──────────────────
  // On mobile:  sidebar gets "hidden" when chat is open, chat gets "active"
  // On desktop: neither class is applied — normal flex layout takes over.
  const sidebarClass = `sidebar${isMobile && chatOpen ? " hidden" : ""}`;
  const chatAreaClass = `chat-area${isMobile && chatOpen ? " active" : ""}`;

  return (
    <div className={`chat-page ${color === "dark" ? "dark-theme" : "light-theme"}`}>

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <div className={sidebarClass}>
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

        {/* All Users */}
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
                  {isUserOnline(otherUser._id) && <span className="online-dot" />}
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

        {/* Recent Conversations */}
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
                    className={`conversation-item ${selectedConversation?._id === conversation._id ? "active" : ""}`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="user-avatar">
                      {otherUser.username.charAt(0).toUpperCase()}
                      {isUserOnline(otherUser._id) && <span className="online-dot" />}
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

      {/* ── Chat Area ─────────────────────────────────────────────── */}
      <div className={chatAreaClass}>
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-user-info">
                {/* Back button shown only on mobile */}
                <button className="back-btn" onClick={handleBackToSidebar} title="Back">
                  ‹
                </button>
                <div className="user-avatar">
                  {getOtherParticipant(selectedConversation)?.username.charAt(0).toUpperCase()}
                  {isUserOnline(getOtherParticipant(selectedConversation)?._id) && (
                    <span className="online-dot" />
                  )}
                </div>
                <div>
                  <h3>{getOtherParticipant(selectedConversation)?.username}</h3>
                  <span className={`status ${isUserOnline(getOtherParticipant(selectedConversation)?._id) ? "online" : "offline"}`}>
                    {isUserOnline(getOtherParticipant(selectedConversation)?._id) ? "Online" : "Offline"}
                  </span>
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
                        className={`message ${message.sender._id === user.id ? "sent" : "received"}`}
                      >
                        <div className="message-content">
                          {message.sender._id !== user.id && (
                            <span className="sender-name">{message.sender.username}</span>
                          )}
                          <p>
                            {decryptedMessages[message._id] ||
                              (message.sender._id === user.id
                                ? "Decrypting your message..."
                                : "Decrypting...")}
                          </p>
                          <div className="message-box">
                            <div className="message-actions">
                              <span className="message-time">{formatTime(message.createdAt)}</span>
                              {message.sender._id === user.id && (
                                <span className={`read-tick ${getMessageStatus(message)}`}>
                                  {getMessageStatus(message) === "read" ? "✓✓" : "✓"}
                                </span>
                              )}
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

            <form onSubmit={handleSendMessage} className="message-input-container">
              <input
                type="text"
                value={messageInput}
                onChange={handleTyping}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="send-btn" disabled={!messageInput.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Welcome to Chat App</h2>
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;