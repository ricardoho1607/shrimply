"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { orsonIdentityKey, OrsonSessionChangedError } from '../../../../../orson/session';
import { cleanOrsonResponse } from '../../../../../orson/promptBuilder';
import { OrsonIncompleteResponseError } from '../../../../../orson/responseCompletion';
import { useGemini } from '@/hooks/useGemini';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  retryPrompt?: string;
}

type PondContext = {
  id: string;
  pondName?: string;
  supplier?: string;
  plSupplier?: string;
  cycleStatus?: 'active' | 'ended';
  [key: string]: unknown;
};

const createWelcomeMessage = (copy: (text: string) => string): ChatMessage => ({
  id: 'welcome',
  type: 'ai',
  message: copy("Hello! I'm Orson, your AI aquaculture advisor. I've analyzed your farm data and I'm ready to help you optimize growth and prevent issues. What's on your mind today?"),
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
  const { user, company, loading, companyLoading } = useAuth();
  const identity = !loading && !companyLoading && user?.companyId === company?.id
    ? orsonIdentityKey(user?.uid, company?.id) : null;
  if (!identity) return null;
  return <OrsonChat key={identity} identity={identity} companyId={company!.id} uid={user!.uid} />;
}

function OrsonChat({ identity, companyId, uid }: { identity: string; companyId: string; uid: string }) {
  const copy = useDashboardCopy();
  const { company } = useAuth();
  const hasPermission = useFarmPermissions();
  const canUseOrson = hasPermission('useOrson');
  const [ponds, setPonds] = useState<PondContext[]>([]);
  const [pondsReady, setPondsReady] = useState(false);
  const storageKey = `orson_messages_v3:${identity}:`;
  const generation = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [createWelcomeMessage(copy)];
    return parseStoredMessages(sessionStorage.getItem(storageKey)) ?? [createWelcomeMessage(copy)];
  });
  const [inputText, setInputText] = useState('');
  const [streamingReplyId, setStreamingReplyId] = useState<string | null>(null);
  const [analyzingDots, setAnalyzingDots] = useState('.');

  const { sendMessage, loading, clearChat, error } = useGemini();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading || streamingReplyId) {
      return;
    }
    const interval = setInterval(() => {
      setAnalyzingDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, [loading, streamingReplyId]);

  useEffect(() => {
    sessionStorage.removeItem('orson_messages');
    let active = true;
    const unsubscribe = onSnapshot(collection(db, 'companies', companyId, 'ponds'), (snapshot) => {
      if (!active || auth.currentUser?.uid !== uid) return;
      setPonds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PondContext))
        .filter(pond => pond.cycleStatus !== 'ended'));
      setPondsReady(true);
    });
    return () => { active = false; generation.current += 1; unsubscribe(); };
  }, [companyId, uid]);

  useEffect(() => {
    const persistenceTimer = window.setTimeout(() => {
      if (auth.currentUser?.uid === uid && messages.length > 0) sessionStorage.setItem(storageKey, JSON.stringify(messages));
    }, 250);
    return () => window.clearTimeout(persistenceTimer);
  }, [messages, storageKey, uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSubmit?: string, retryId?: string) => {
    const text = textToSubmit || inputText;
    if (!text.trim() || loading || !pondsReady || auth.currentUser?.uid !== uid) return;
    const currentGeneration = ++generation.current;
    const isCurrent = () => generation.current === currentGeneration && auth.currentUser?.uid === uid;

    const replyTimestamp = new Date();
    const userMessage: ChatMessage = {
      id: `user-${replyTimestamp.getTime()}-${currentGeneration}`,
      type: 'user',
      message: text.trim(),
      timestamp: new Date(),
    };

    if (!retryId) setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setAnalyzingDots('.');
    const replyId = retryId || `orson-${replyTimestamp.getTime()}-${currentGeneration}`;
    const upsertReply = (message: string, retryPrompt?: string) => {
      if (!isCurrent()) return;
      setMessages((previous) => {
        const existing = previous.findIndex((item) => item.id === replyId);
        const reply: ChatMessage = { id: replyId, type: 'ai', message, timestamp: replyTimestamp, ...(retryPrompt ? { retryPrompt } : {}) };
        if (existing < 0) return [...previous, reply];
        return previous.map((item, index) => index === existing ? reply : item);
      });
    };

    try {
      const aiResponse = await sendMessage(text.trim(), ponds, {
        companyId,
        timeZone: company?.timeZone,
        conversationHistory: messages
          .filter((message) => message.id !== 'welcome' && !message.retryPrompt && message.id !== retryId)
          .slice(-20)
          .map((message) => ({ role: message.type === 'ai' ? 'model' : 'user', text: message.message })),
        onPartialResponse: (partialResponse) => {
          if (!isCurrent()) return;
          setStreamingReplyId(replyId);
          upsertReply(partialResponse);
        },
      });
      upsertReply(aiResponse);
    } catch (err) {
      if (!isCurrent() || err instanceof OrsonSessionChangedError) return;
      if (err instanceof OrsonIncompleteResponseError) upsertReply(err.partialText || copy('No answer received.'), text.trim());
      else upsertReply(copy('No answer received.'), text.trim());
    } finally {
      if (isCurrent()) setStreamingReplyId(null);
    }
  };

  const handleClearChat = () => {
    if (window.confirm(copy('Clear conversation history?'))) {
      generation.current += 1;
      setStreamingReplyId(null);
      clearChat();
      sessionStorage.removeItem(storageKey);
      setMessages([createWelcomeMessage(copy)]);
    }
  };

  const aiMessageCount = messages.filter(message => message.type === 'ai').length;

  if (!canUseOrson) return <div style={{ textAlign: 'center', padding: '100px' }}>{copy('You do not have permission to use Orson AI.')}</div>;

  return (
    <div className="dashboard-page authenticated-compact-page orson-page">
      <div className="orson-shell">
        <div className="orson-hero">
          <div className="orson-hero-main">
            <div>
              <div className="section-eyebrow">Orson AI</div>
              <h2 className="orson-title">{copy('Aquaculture assistant')}</h2>
            </div>
          </div>
          <div className="orson-stats">
            <div className="orson-stat">
              <span>{copy('Synced ponds')}</span>
              <strong>{ponds.length}</strong>
            </div>
            <div className="orson-stat">
              <span>{copy('AI replies')}</span>
              <strong>{aiMessageCount}</strong>
            </div>
            <button
              onClick={handleClearChat}
              className="orson-reset"
            >
              <Trash2 size={15} /> {copy('Reset')}
            </button>
          </div>
        </div>

        <div className="orson-content">
          <section className="orson-chat-card">
            <div className="orson-messages">
              {messages.map((storedMessage) => {
                const msg = storedMessage.id === 'welcome' ? createWelcomeMessage(copy) : storedMessage;
                return (
                <div key={msg.id} className={`orson-message-row ${msg.type === 'user' ? 'is-user' : 'is-ai'}`}>
                  <div className="orson-message-stack">
                    <div className="orson-bubble">
                      {msg.type === 'ai' ? cleanOrsonResponse(msg.message) : msg.message}
                      {msg.retryPrompt && <div role="status">{copy('Response interrupted.')} <button type="button" disabled={loading || !pondsReady} onClick={() => handleSend(msg.retryPrompt, msg.id)}>{copy('Retry')}</button></div>}
                    </div>
                    <span className="orson-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                );
              })}

              {loading && !streamingReplyId && (
                <div className="orson-message-row is-ai">
                  <div className="orson-message-stack">
                    <div className="orson-bubble is-thinking">
                      {copy('Orson is analyzing farm metrics...').replace(/\.{1,3}$/, '')}
                      <span className="orson-loading-dots">{analyzingDots}</span>
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
                  placeholder={copy('Type a question for Orson...')}
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
                  disabled={!inputText.trim() || loading || !pondsReady}
                  className="orson-send"
                  aria-label={copy('Send message')}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
