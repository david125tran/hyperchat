// src/ChatPage.jsx

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatPage.css";


// ------------------------------------ Avatar Profile Pictures ------------------------------------
import ragAssistantOneAvatar from "./images/rag-assistant-2.jpg";


// ------------------------------------ Models Config ------------------------------------
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


// ------------------------------------ Initialize Chat Page ------------------------------------
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

  // ---------- Chats state with localStorage persistence ----------
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

  // Per-model file state (actual File object, NOT stored in localStorage)
  const [filesByModel, setFilesByModel] = useState({});

  const currentModel = models[selectedModel];
  const currentMessages = chats[selectedModel] || [];
  const currentFile = filesByModel[selectedModel] || null;
  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Sort models by most recent message timestamp
  const sortedModels = Object.entries(models).sort(([idA], [idB]) => {
    const msgsA = chats[idA] || [];
    const msgsB = chats[idB] || [];
    const lastA = msgsA[msgsA.length - 1];
    const lastB = msgsB[msgsB.length - 1];
    const tsA = lastA?.timestamp || 0;
    const tsB = lastB?.timestamp || 0;
    return tsB - tsA; // newest first
  });

  // Fake streaming of bot reply
  const streamBotReply = (modelId, fullText) => {
    const typingSpeedMs = 9; // adjust speed here (smaller = faster)
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

  // ---------- File Upload Handler ----------
  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setFilesByModel((prev) => ({
      ...prev,
      [selectedModel]: file,
    }));
  };

  // ---------- Send Message ----------
  const handleSend = async () => {
    // simple rate limiting: don't send if a request is in-flight
    if (isSending) return;

    const text = input.trim();
    // Don't send if no text and no file
    if (!text && !currentFile) return;

    const modelId = selectedModel;
    const historyForRequest = currentMessages; // history BEFORE this user message
    const now = Date.now();

    // 1) Add user message locally (text + file metadata)
    const userMessage = {
      from: "user",
      text: text || "",
      timestamp: now,
      file: currentFile
        ? {
            name: currentFile.name,
            size: currentFile.size,
            type: currentFile.type,
          }
        : null,
    };

    setChats((prev) => ({
      ...prev,
      [modelId]: [...(prev[modelId] || []), userMessage],
    }));
    setInput("");
    setIsSending(true);

    try {
      // 2) Build FormData instead of JSON
      const formData = new FormData();
      formData.append("modelId", modelId);
      formData.append("backendId", currentModel.backendId);
      formData.append("message", text);
      formData.append("history", JSON.stringify(historyForRequest));

      if (currentFile) {
        formData.append("file", currentFile);
      }

      const res = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        body: formData, // browser sets correct multipart boundary
      });

      const data = await res.json();
      const botText =
        data.reply || "Sorry, I didn't get a response from the model.";

      // 3) Clear the file for this model once sent
      setFilesByModel((prev) => ({
        ...prev,
        [modelId]: null,
      }));

      // 4) Stream bot reply into the chat
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

  // ---------- Clear Chat for Current Model ----------
  const handleClearChat = () => {
    setChats((prev) => ({
      ...prev,
      [selectedModel]: currentModel.initMessage
        ? [{ from: "bot", text: currentModel.initMessage, timestamp: Date.now() }]
        : [],
    }));
    // Also clear file selection for that model
    setFilesByModel((prev) => ({
      ...prev,
      [selectedModel]: null,
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
                {/* Attachment card, if a file was sent with this message */}
                {msg.file && (
                  <div className="file-attachment">
                    <div className="file-attachment-icon">📎</div>
                    <div className="file-attachment-info">
                      <div className="file-attachment-name">
                        {msg.file.name}
                      </div>
                      <div className="file-attachment-meta">
                        {msg.file.type || "File"}
                        {msg.file.size != null &&
                          ` • ${(msg.file.size / 1024).toFixed(1)} KB`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message text (if any) */}
                {msg.text && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                )}

                <div className="message-meta">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <footer className="chat-input-bar">
          {/* File upload */}
          <div className="file-upload-wrapper">
            <label className="file-upload-button">
              📎
              <input
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={isSending}
              />
            </label>
            {currentFile && (
              <span className="file-upload-name">
                {currentFile.name}
              </span>
            )}
          </div>

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
