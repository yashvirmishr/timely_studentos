"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  aiOnline?: boolean;
  aiEnabled?: boolean;
  isTyping?: boolean;
  hasKey?: boolean;
  savedChats?: { id: string; title: string; updatedAt: number }[];
  activeSavedChatId?: string | null;
  onSaveChat?: () => void;
  onLoadChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onNewChat?: () => void;
}

export default function AssistantView({
  messages,
  onSendMessage,
  aiOnline,
  aiEnabled,
  isTyping,
  hasKey,
  savedChats = [],
  activeSavedChatId,
  onSaveChat,
  onLoadChat,
  onDeleteChat,
  onNewChat,
}: AssistantViewProps) {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  const dotColor = aiEnabled && hasKey && aiOnline ? "#4caf50" : aiEnabled && hasKey ? "#f5a623" : "#aaa";
  const statusText = !aiEnabled ? "Gemini disabled — enable in Profile" : !hasKey ? "Gemini key missing — paste in Profile" : aiOnline ? "Connected to Gemini" : "Gemini offline — using fallback";

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }, []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your study co-pilot</p>
          <h1>Ask <span className="blue-underline">anything</span></h1>
          <p className="heading-subtitle">Timely knows your schedule, tasks, and subjects — so you don&apos;t have to keep it all in your head.</p>
        </div>
      </div>
      <div className="assistant-layout">
        <div className="chat-window paper-card">
          <div className="chat-header">
            <div>
              <strong>Timely AI</strong>
              <span><i style={{ background: dotColor, opacity: 1 }} /> {statusText}</span>
            </div>
            <div className="chat-header-actions">
              {onSaveChat && messages.some(m => m.user) && (
                <button
                  className="icon-button small"
                  aria-label="Save chat"
                  title={activeSavedChatId ? "Update saved chat" : "Save this chat"}
                  onClick={onSaveChat}
                >
                  <span className="material-symbols-outlined">{activeSavedChatId ? "cloud_done" : "bookmark"}</span>
                </button>
              )}
              {onNewChat && (
                <button className="icon-button small" aria-label="New chat" onClick={onNewChat}>
                  <span className="material-symbols-outlined">add</span>
                </button>
              )}
              <button
                className="icon-button small"
                aria-label="Chat history"
                onClick={() => setShowHistory(!showHistory)}
                data-active={showHistory || undefined}
              >
                <span className="material-symbols-outlined">history</span>
              </button>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id} className={`message ${m.user ? "user-message" : "assistant-message"}`}>
                <div className={m.user ? 'message-body user-body' : 'message-body'}>
                  <p className="message-text">{m.text}</p>
                  <span>{formatTime(parseInt(m.id.slice(1)) || 0)}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message assistant-message">
                <div>
                  <p className="typing-indicator">
                    <span className="typing-dot" />
                    <span className="typing-dot delay-1" />
                    <span className="typing-dot delay-2" />
                  </p>
                  <span>Timely is thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>
          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isTyping ? "Timely is thinking…" : "Ask about your day..."}
              disabled={!!isTyping}
            />
            <span className="attach-button" aria-hidden="true"><span className="material-symbols-outlined">lock</span></span>
            <button type="submit" className="send-button" disabled={!input.trim() || !!isTyping}><span className="material-symbols-outlined">arrow_upward</span></button>
          </form>
          {!hasKey && aiEnabled && (
            <div className="chat-api-warning">
              <span className="material-symbols-outlined">vpn_key</span>
              Add your Gemini API key in <strong>Profile → Gemini</strong> to get real answers. <span className="chat-api-warning-hint">(Fallback replies work offline)</span>
            </div>
          )}
        </div>

        {/* Chat history sidebar */}
        {showHistory && (
          <div className="chat-history-sidebar paper-card">
            <div className="chat-history-header">
              <strong>Recent chats</strong>
              {onNewChat && (
                <button className="icon-button small" aria-label="Start new chat" onClick={onNewChat} title="New chat">
                  <span className="material-symbols-outlined">add</span>
                </button>
              )}
            </div>
            <div className="chat-history-list">
              {savedChats.length === 0 ? (
                <div className="chat-history-empty">
                  <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: .3 }}>chat_bubble_outline</span>
                  <p>No saved chats yet</p>
                  <span>Start a conversation and tap the save icon to keep it here.</span>
                </div>
              ) : (
                savedChats.map(chat => (
                  <button
                    key={chat.id}
                    className={`chat-history-item ${chat.id === activeSavedChatId ? "active" : ""}`}
                    onClick={() => onLoadChat?.(chat.id)}
                  >
                    <div className="chat-history-item-content">
                      <span className="chat-history-item-title">{chat.title}</span>
                      <span className="chat-history-item-time">{formatTime(chat.updatedAt)}</span>
                    </div>
                    <button
                      className="chat-history-item-delete"
                      aria-label={`Delete "${chat.title}"`}
                      onClick={(e) => { e.stopPropagation(); onDeleteChat?.(chat.id); }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {!showHistory && (
          <div className="assistant-side">
            <div className="side-note paper-card assistant-help-note">
              <span className="material-symbols-outlined">tips_and_updates</span>
              <h3>Ask naturally</h3>
              <p>Tell Timely what you need help with, and it will use your schedule, tasks, and subjects to guide you.</p>
            </div>
            <div className="side-note assistant-blue-note paper-card assistant-help-note">
              <span className="material-symbols-outlined">history</span>
              <h3>Your conversation</h3>
              <p>Your recent messages stay here so you can continue planning without repeating yourself.</p>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes typing { 0%, 60%, 100% { opacity: .3; transform: translateY(0) } 30% { opacity: 1; transform: translateY(-4px) } }`}</style>
    </div>
  );
}
