// src/ChatPage.jsx

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatPage.css";

// Images
import ragAssistantOneAvatar from "./images/rag-assistant-2.jpg";

const models = {
  1: {
    backendId: "general-assistant-1",
    name: "Claude Sonnet 4.5 (Generalist)",
    color: "#e0ec75ff",
    initMessage:
      "Hello! I’m Claude Sonnet 4.5, your general-purpose AI assistant. I’m built for everyday reasoning, conversation, and problem solving. Whether you want to brainstorm ideas, understand a concept, analyze text, write something, or just explore a topic, I’m here for you.",
  },

  2: {
    backendId: "general-assistant-2",
    name: "Claude Opus 4.5 (Generalist)",
    color: "#e6b57dff",
    initMessage:
      "Hello! I’m Claude Opus 4.5, a highly capable general-purpose AI designed for deep reasoning, thoughtful conversation, and complex problem solving. Whether you’re exploring ideas, analyzing information, or working through a challenging task, I’m here to support you with clarity and precision.",
  },

  3: {
    backendId: "general-assistant-3",
    name: "Claude Haiku 4.5 (Generalist)",
    color: "#8CA9FF",
    initMessage: `Hi there! I’m Claude Haiku 4.5 - a fast, lightweight general assistant built for quick answers, clear explanations, and everyday problem solving. I’m optimized for speed while still providing helpful, concise, and reliable guidance.`,
  },

  4: {
    backendId: "rag-assistant-1",
    name: "David Tran the Robot 🤖",
    color: "#58d858ff",
    avatar: ragAssistantOneAvatar,
    initMessage:
      "👲 Hi, how can I help today? I'm an AI model that has been specifically trained on LLM security best practices! Ask me questions to learn more!",
  },
};

// Build initial chats: each model gets its own greeting
const buildInitialChats = () => {
  const initial = {};
  const now = Date.now();
  Object.entries(models).forEach(([id, { initMessage }]) => {
    initial[id] = initMessage
      ? [{ from: "bot", text: initMessage, timestamp: now }]
      : [];
  });
  return initial;
};

const STORAGE_KEY = "hyperchat-chats-v1";

export default function ChatPage() {
  const [selectedModel, setSelectedModel] = useState("1"); // keep as string to match object keys

  // ---------- chats state with localStorage persistence ----------
  const [chats, setChats] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error("Failed to parse saved chats", err);
    }
    return buildInitialChats();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (err) {
      console.error("Failed to save chats", err);
    }
  }, [chats]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const currentModel = models[selectedModel];
  const currentMessages = chats[selectedModel] || [];

  // ---------- helpers ----------

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // sort models by most recent message timestamp
  const sortedModels = Object.entries(models).sort(([idA], [idB]) => {
    const msgsA = chats[idA] || [];
    const msgsB = chats[idB] || [];
    const lastA = msgsA[msgsA.length - 1];
    const lastB = msgsB[msgsB.length - 1];
    const tsA = lastA?.timestamp || 0;
    const tsB = lastB?.timestamp || 0;
    return tsB - tsA; // newest first
  });

  // fake streaming of bot reply
  const streamBotReply = (modelId, fullText) => {
    const typingSpeedMs = 15; // adjust speed here (smaller = faster)
    const timestamp = Date.now();

    // 1) Add an empty bot message as a placeholder
    setChats((prev) => {
      const prevMsgs = prev[modelId] || [];
      const newMsgs = [...prevMsgs, { from: "bot", text: "", timestamp }];
      return { ...prev, [modelId]: newMsgs };
    });

    let i = 0;
    const intervalId = setInterval(() => {
      i += 1;

      setChats((prev) => {
        const prevMsgs = prev[modelId] || [];
        if (prevMsgs.length === 0) return prev;

        const lastIndex = prevMsgs.length - 1;
        const lastMsg = prevMsgs[lastIndex];

        if (lastMsg.from !== "bot") return prev;

        const updatedLast = {
          ...lastMsg,
          text: fullText.slice(0, i),
        };

        const newMsgs = [...prevMsgs];
        newMsgs[lastIndex] = updatedLast;

        return { ...prev, [modelId]: newMsgs };
      });

      if (i >= fullText.length) {
        clearInterval(intervalId);
        setIsSending(false);
      }
    }, typingSpeedMs);
  };

  // ---------- send message ----------
  const handleSend = async () => {
    // simple rate limiting: don't send if a request is in-flight
    if (isSending) return;

    const text = input.trim();
    if (!text) return;

    const modelId = selectedModel;
    const historyForRequest = currentMessages; // history BEFORE this user message
    const now = Date.now();

    // 1) Add user message locally
    const userMessage = { from: "user", text, timestamp: now };
    setChats((prev) => ({
      ...prev,
      [modelId]: [...(prev[modelId] || []), userMessage],
    }));
    setInput("");
    setIsSending(true);

    try {
      // 2) Call backend
      const res = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          backendId: currentModel.backendId,
          message: text,
          history: historyForRequest, // send history so backend can use it
        }),
      });

      const data = await res.json();
      const botText =
        data.reply || "Sorry, I didn't get a response from the model.";

      // 3) Stream bot reply into the chat
      streamBotReply(modelId, botText);
    } catch (err) {
      console.error(err);
      setChats((prev) => ({
        ...prev,
        [modelId]: [
          ...(prev[modelId] || []),
          {
            from: "bot",
            text: "⚠️ Error talking to the model. Check the backend logs.",
            timestamp: Date.now(),
          },
        ],
      }));
      setIsSending(false);
    }
  };

  // ---------- clear chat for current model ----------
  const handleClearChat = () => {
    setChats((prev) => ({
      ...prev,
      [selectedModel]: currentModel.initMessage
        ? [{ from: "bot", text: currentModel.initMessage, timestamp: Date.now() }]
        : [],
    }));
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <div className="sidebar-header">Hyperchat 💬</div>
        <div className="sidebar-section-label">AI Models</div>

        {sortedModels.map(([id, { name, color, avatar }]) => {
          const modelMessages = chats[id] || [];
          const lastMsg = modelMessages[modelMessages.length - 1];

          // preview text
          let previewText = "";
          if (lastMsg && lastMsg.text) {
            const cleaned = lastMsg.text.replace(/\s+/g, " ").trim();
            const maxLen = 60;
            previewText =
              cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "…" : cleaned;
          }

          // timestamp
          const lastTimestamp = lastMsg?.timestamp;
          const timeLabel = lastTimestamp ? formatTime(lastTimestamp) : "";

          // unread if last message is from bot and this model is not selected
          const hasUnread =
            id !== selectedModel && lastMsg && lastMsg.from === "bot";

          return (
            <button
              key={id}
              className={`sidebar-item ${
                id === selectedModel ? "sidebar-item-active" : ""
              }`}
              onClick={() => setSelectedModel(id)}
            >
              <div className="sidebar-left">
              <div className="sidebar-circle-wrapper">
                <div className="sidebar-circle" style={{ background: color }}>
                  {avatar ? <img src={avatar} alt={name} /> : "🤖"}
                </div>
                {id === selectedModel && <div className="presence-indicator" />}
                {hasUnread && <span className="sidebar-unread-badge" />}
              </div>
                <div className="sidebar-item-text">
                  <div className="sidebar-item-title-row">
                    <span className="sidebar-item-title">{name}</span>
                    {timeLabel && (
                      <span className="sidebar-item-timestamp">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  <div className="sidebar-item-preview">
                    {previewText || "No messages yet"}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div>
            <div className="chat-title">{currentModel.name} • Hyperchat</div>
            <div className="chat-subtitle">You • AI assistant</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="clear-chat-button" onClick={handleClearChat}>
              Clear chat
            </button>
            <div className="chat-header-status">
              {isSending ? "Thinking..." : "Available"}
            </div>
          </div>
        </header>

        <div className="chat-body">
          {currentMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-row ${
                msg.from === "user" ? "outgoing" : "incoming"
              }`}
            >
              <div className="avatar-wrapper">
                <div className={`avatar ${msg.from === "user" ? "self" : ""}`}>
                  {msg.from === "user" ? (
                    "User"
                  ) : currentModel.avatar ? (
                    <img src={currentModel.avatar} alt={currentModel.name} />
                  ) : (
                    "🤖"
                  )}
                </div>

                {/* status dot bottom-right of each avatar */}
                <div className="presence-indicator" />
              </div>


              <div className="message-bubble">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
                <div className="message-meta">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="chat-input-bar">
          <input
            className="chat-input"
            placeholder={
              isSending
                ? "Please wait for the assistant to respond..."
                : "Type a new message"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
            disabled={isSending} // front-end rate limiting
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? "Thinking..." : "Send"}
          </button>
        </footer>
      </main>
    </div>
  );
}
