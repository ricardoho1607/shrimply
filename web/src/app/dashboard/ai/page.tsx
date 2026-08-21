"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Loader2,
  BrainCircuit,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Shrimp
} from 'lucide-react';
import type { Unsubscribe } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGemini } from '@/hooks/useGemini';
import { useAuth } from '@/contexts/AuthContext';
import { hasFarmPermission } from '../../../../../shared/permissions';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
}

type PondContext = {
  id: string;
  pondName?: string;
  supplier?: string;
  plSupplier?: string;
  cycleStatus?: 'active' | 'ended';
  [key: string]: unknown;
};

const SUGGESTED_PROMPTS = [
  "Analyze today's 72-hour outlook",
  "How do I lower ammonia in A1?",
  "Check overfeeding and biomass risk",
  "What is limiting growth?"
];

const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  type: 'ai',
  message: "Hello! I'm Orson, your AI aquaculture advisor. I've analyzed your farm data and I'm ready to help you optimize growth and prevent issues. What's on your mind today?",
  timestamp: new Date()
});

const parseStoredMessages = (value: string | null): ChatMessage[] | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((message): message is ChatMessage & { timestamp: string } => {
        return message &&
          (message.type === 'user' || message.type === 'ai') &&
          typeof message.message === 'string' &&
          typeof message.id === 'string';
      })
      .map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
  } catch {
    return null;
  }
};

export default function OrsonAIPage() {
  const { user, company } = useAuth();
  const canUseOrson = hasFarmPermission(user, 'useOrson', company?.ownerId);
  const [ponds, setPonds] = useState<PondContext[]>([]);
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [createWelcomeMessage()];
    return parseStoredMessages(sessionStorage.getItem('orson_messages')) ?? [createWelcomeMessage()];
  });
  const [inputText, setInputText] = useState('');

  const { sendMessage, loading, clearChat, error } = useGemini();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubUser: Unsubscribe | undefined;
    let unsubPonds: Unsubscribe | undefined;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubUser?.();
      unsubPonds?.();
      unsubUser = undefined;
      unsubPonds = undefined;

      if (firebaseUser) {
        unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const cid = uDoc.data()?.companyId;
          setCompanyId(cid);
          if (cid) {
            unsubPonds = onSnapshot(collection(db, 'companies', cid, 'ponds'), (snapshot) => {
              setPonds(snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as PondContext))
                .filter((pond) => pond.cycleStatus !== 'ended'));
            });
          } else {
            setPonds([]);
          }
        });
      } else {
        setCompanyId(undefined);
        setPonds([]);
      }
    });

    return () => {
      unsubAuth();
      unsubUser?.();
      unsubPonds?.();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('orson_messages', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSubmit?: string) => {
    const text = textToSubmit || inputText;
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const aiResponse = await sendMessage(text.trim(), ponds, { companyId, timeZone: company?.timeZone });
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        message: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      clearChat();
      sessionStorage.removeItem('orson_messages');
      setMessages([createWelcomeMessage()]);
    }
  };

  const aiMessageCount = messages.filter(message => message.type === 'ai').length;

  if (!canUseOrson) return <div style={{ textAlign: 'center', padding: '100px' }}>You do not have permission to use Orson AI.</div>;

  return (
    <div className="dashboard-page authenticated-compact-page orson-page">
      <div className="orson-shell">
        <div className="orson-hero">
          <div className="orson-hero-main">
            <div className="orson-mark">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="section-eyebrow">Orson AI</div>
              <h2 className="orson-title">Aquaculture assistant</h2>
            </div>
          </div>
          <div className="orson-stats">
            <div className="orson-stat">
              <span>Synced ponds</span>
              <strong>{ponds.length}</strong>
            </div>
            <div className="orson-stat">
              <span>AI replies</span>
              <strong>{aiMessageCount}</strong>
            </div>
            <button
              onClick={handleClearChat}
              className="orson-reset"
            >
              <Trash2 size={15} /> Reset
            </button>
          </div>
        </div>

        <div className="orson-content">
          <section className="orson-chat-card">
            <div className="orson-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`orson-message-row ${msg.type === 'user' ? 'is-user' : 'is-ai'}`}>
                  <div className="orson-avatar">
                    {msg.type === 'user' ? 'U' : <Shrimp size={18} />}
                  </div>
                  <div className="orson-message-stack">
                    <div className="orson-bubble">
                      {msg.message}
                    </div>
                    <span className="orson-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="orson-message-row is-ai">
                  <div className="orson-avatar is-loading">
                    <Loader2 className="animate-spin" size={18} />
                  </div>
                  <div className="orson-message-stack">
                    <div className="orson-bubble is-thinking">
                      Orson is analyzing farm metrics...
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="orson-error">
                  <AlertCircle size={17} /> {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="orson-composer">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="orson-form">
                <textarea
                  placeholder="Type a question for Orson..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="orson-input"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="orson-send"
                  aria-label="Send message"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </section>

          <aside className="orson-side">
            <div className="orson-panel">
              <h4>
                <MessageSquare size={16} /> Suggested queries
              </h4>
              <div className="orson-suggestion-list">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    disabled={loading}
                    className="orson-suggestion"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="orson-panel">
              <h4>
                <TrendingUp size={16} /> Analyzed ponds
              </h4>
              {ponds.length === 0 ? (
                <p className="orson-empty">Connect pond records to give Orson live biological context before asking for analysis.</p>
              ) : (
                <div className="orson-pond-list">
                  {ponds.slice(0, 5).map(p => (
                    <div key={p.id} className="orson-pond-row">
                      <div className="orson-pond-name">
                        <span />
                        <strong>{p.pondName || 'Unnamed pond'}</strong>
                      </div>
                      <em>{p.plSupplier || p.supplier || 'N/A'}</em>
                    </div>
                  ))}
                  {ponds.length > 5 && <div className="orson-more">+ {ponds.length - 5} more ponds synced</div>}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
