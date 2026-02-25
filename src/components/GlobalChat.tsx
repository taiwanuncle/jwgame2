import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import './GlobalChat.css';

const AVATARS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮'];

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  myId?: string;
}

export default function GlobalChat({ messages, onSend, myId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, expanded]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className={`global-chat ${expanded ? 'expanded' : 'collapsed'}`}>
      {expanded ? (
        <>
          <div className="chat-header" onClick={() => setExpanded(false)}>
            <span>채팅</span>
            <span className="chat-close">✕</span>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => {
              const isMine = msg.playerId === myId;
              const isSystem = msg.playerId === 'system';
              return (
                <div key={i} className={`chat-msg ${isMine ? 'mine' : ''} ${isSystem ? 'system' : ''}`}>
                  {!isMine && !isSystem && (
                    <span className="chat-avatar">{AVATARS[msg.avatarIndex] || '🎴'}</span>
                  )}
                  <div className="chat-bubble">
                    {!isMine && !isSystem && (
                      <span className="chat-sender">{msg.nickname}</span>
                    )}
                    <span className="chat-text">{msg.message}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 100))}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              maxLength={100}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              ↑
            </button>
          </div>
        </>
      ) : (
        <div className="chat-collapsed-row" onClick={() => { setExpanded(true); setTimeout(() => inputRef.current?.focus(), 100); }}>
          <span className="chat-preview">
            {lastMsg ? `${lastMsg.nickname}: ${lastMsg.message}` : '채팅'}
          </span>
          <span className="chat-expand-icon">💬</span>
        </div>
      )}
    </div>
  );
}
