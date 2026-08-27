"use client";
import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/lib/types";

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  aiOnline?: boolean;
  aiEnabled?: boolean;
  isTyping?: boolean;
  hasKey?: boolean;
}

export default function AssistantView({ messages, onSendMessage, aiOnline, aiEnabled, isTyping, hasKey }: AssistantViewProps) {
  const [input, setInput] = useState("");
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
            <div className="assistant-avatar"><span className="material-symbols-outlined">auto_awesome</span></div>
            <div>
              <strong>Timely AI</strong>
              <span><i style={{ background: dotColor, opacity: 1 }} /> {statusText}</span>
            </div>
            <button className="icon-button small" aria-label="More"><span className="material-symbols-outlined">more_horiz</span></button>
          </div>
          <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map(m => (
              <div key={m.id} className={`message ${m.user ? "user-message" : "assistant-message"}`}>
                {!m.user && <div className="message-avatar">{"\u2726"}</div>}
                <div style={{ maxWidth: m.user ? '75%' : '85%' }}>
                  <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</p>
                  <span>just now</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message assistant-message">
                <div className="message-avatar">{"\u2726"}</div>
                <div>
                  <p style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 60 }}>
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#9aa0a6', animation: 'typing 1s infinite' }} />
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#9aa0a6', animation: 'typing 1s infinite .2s' }} />
                    <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#9aa0a6', animation: 'typing 1s infinite .4s' }} />
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
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { /* submit via form */ } }}
            />
            <span className="attach-button icon-button small" aria-hidden="true"><span className="material-symbols-outlined">lock</span></span>
            <button type="submit" className="send-button" disabled={!input.trim() || !!isTyping} style={{ opacity: !input.trim() || isTyping ? .5 : 1 }}><span className="material-symbols-outlined">arrow_upward</span></button>
          </form>
          {!hasKey && aiEnabled && (
            <div style={{ padding: '8px 16px 12px', fontSize: 11, color: '#8a6d00', background: '#fff8e1', borderTop: '1px solid #f0dca0', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>vpn_key</span>
              Add your Gemini API key in <strong style={{ margin: '0 4px' }}>Profile → Gemini</strong> to get real answers. <span style={{ opacity: .7 }}>(Fallback replies work offline)</span>
            </div>
          )}
        </div>
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
      </div>
      <style>{`@keyframes typing { 0%, 60%, 100% { opacity: .3; transform: translateY(0) } 30% { opacity: 1; transform: translateY(-4px) } }`}</style>
    </div>
  );
}
