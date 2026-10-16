"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUp,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { app, auth, db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AgentCards from '@/components/orson/AgentCards';
import AgentInputTools from '@/components/orson/AgentInputTools';
import { useAgentOperations } from '../../../../../orson/useAgentOperations';
import { linkOperationToReply, unlinkedDraftOperationIds, upsertReplyWithOperations } from '../../../../../orson/conversationOperations';
import { agentActivityLabel } from '../../../../../shared/orsonAgentPresentation';
import { orsonIdentityKey, OrsonSessionChangedError } from '../../../../../orson/session';
import { cleanOrsonResponse } from '../../../../../orson/promptBuilder';
import { parseOrsonMessageBlocks } from '../../../../../orson/messageBlocks';
import { OrsonIncompleteResponseError } from '../../../../../orson/responseCompletion';
import type { OrsonResponsePreview } from '../../../../../orson/responsePreview';
import { useGemini } from '@/hooks/useGemini';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: Date;
  retryPrompt?: string;
  operationIds?: string[];
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
      .map((message) => ({
        ...message,
        operationIds: Array.isArray(message.operationIds)
          ? message.operationIds.filter((id): id is string => typeof id === 'string').slice(-10)
          : undefined,
        timestamp: new Date(message.timestamp),
      }));
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
  const { currentLanguage } = useLanguage();
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
  const [preview, setPreview] = useState<OrsonResponsePreview | null>(null);
  const [analyzingDots, setAnalyzingDots] = useState('.');

  const { sendMessage, loading, clearChat, error } = useGemini();
  const agentTransport = useCallback(async (name: string, data: Record<string, unknown>) => {
    if (auth.currentUser?.uid !== uid || !navigator.onLine) throw new Error('Reconnect and sign in to use farm actions.');
    return (await httpsCallable(getFunctions(app), name, { timeout: 150000 })(data)).data;
  }, [uid]);
  const agent = useAgentOperations(companyId, uid, agentTransport, typeof window === 'undefined' ? undefined : window.localStorage, loading);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) {
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
  }, [messages, loading, preview]);

  const handleSend = async (textToSubmit?: string, retryId?: string) => {
    const text = textToSubmit || inputText;
    if (!text.trim() || loading || agent.busy || !pondsReady || auth.currentUser?.uid !== uid) return;
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
    setPreview(null);
    let previewOpen = true;
    const replyId = retryId || `orson-${replyTimestamp.getTime()}-${currentGeneration}`;
    const upsertReply = (message: string, retryPrompt?: string) => {
      if (!isCurrent()) return;
      setMessages((previous) => upsertReplyWithOperations(previous, {
        id: replyId, type: 'ai', message, timestamp: replyTimestamp, ...(retryPrompt ? { retryPrompt } : {}),
      }));
    };

    try {
      const aiResponse = await sendMessage(text.trim(), ponds, {
        companyId,
        onPreview: value => { if (isCurrent() && previewOpen) setPreview(value); },
        onActivity: event => { if (isCurrent()) agent.onActivity(event); },
        onOperation: operation => {
          if (!isCurrent()) return;
          agent.receive(operation);
          setMessages(previous => linkOperationToReply(previous, {
            id: replyId, type: 'ai', message: '', timestamp: replyTimestamp,
          }, operation.id));
        },
        agentOperationIds: agent.operations.map(op => op.id),
        timeZone: company?.timeZone,
        conversationHistory: messages
          .filter((message) => message.id !== 'welcome' && !message.retryPrompt && message.id !== retryId)
          .slice(-20)
          .map((message) => ({ role: message.type === 'ai' ? 'model' : 'user', text: message.message })),
        onPartialResponse: (partialResponse) => {
          if (!isCurrent() || !partialResponse.trim()) return;
          previewOpen = false;
          setPreview(null);
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
      previewOpen = false;
      if (isCurrent()) { setPreview(null); setStreamingReplyId(null); agent.clearActivity(); }
    }
  };

  const handleClearChat = () => {
    if (window.confirm(copy('Clear conversation history?'))) {
      generation.current += 1;
      setPreview(null);
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
                <div key={msg.id} className={`orson-message-row ${msg.type === 'user' ? 'is-user' : 'is-ai'} ${msg.operationIds?.length ? 'has-operation' : ''}`}>
                  <div className="orson-message-stack">
                    {(msg.message || msg.retryPrompt) && <div className="orson-bubble">
                      {msg.type === 'ai' ? parseOrsonMessageBlocks(cleanOrsonResponse(msg.message)).map((block,index) => block.type === 'text'
                        ? <span key={index}>{block.text}</span>
                        : <div key={index} role="region" aria-label="Pond readings table" tabIndex={0} style={{maxWidth:'100%',overflowX:'auto',margin:'12px 0',whiteSpace:'normal'}}>
                          <p style={{fontSize:12,color:'#60758a',marginBottom:8}}>Scroll sideways to see all columns.</p>
                          <table style={{borderCollapse:'collapse',fontSize:13,width:'100%'}}>
                            <thead><tr>{block.headers.map((cell,column)=><th scope="col" key={column} style={{textAlign:'left',padding:'10px 12px',background:'#edf4f8',borderBottom:'2px solid #c8d8e4',whiteSpace:'nowrap'}}>{cell}</th>)}</tr></thead>
                            <tbody>{block.rows.map((row,line)=><tr key={line}>{row.map((cell,column)=><td key={column} style={{padding:'10px 12px',borderBottom:'1px solid #d9e4ec',verticalAlign:'top',minWidth:110}}>{cell}</td>)}</tr>)}</tbody>
                          </table>
                        </div>) : msg.message}
                      {msg.retryPrompt && <div role="status">{copy('Response interrupted.')} <button type="button" disabled={loading || !pondsReady} onClick={() => handleSend(msg.retryPrompt, msg.id)}>{copy('Retry')}</button></div>}
                    </div>}
                    {msg.type === 'ai' && !!msg.operationIds?.length && <AgentCards agent={agent} operationIds={msg.operationIds} showStatus={false} />}
                    <span className="orson-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                );
              })}

              {loading && !streamingReplyId && preview && (
                <div className="orson-message-row is-ai" role="status" aria-live="polite">
                  <div className="orson-message-stack">
                    <div className="orson-bubble"><strong>{preview.title}</strong>{'\n'}{preview.text}</div>
                  </div>
                </div>
              )}
              {loading && !agent.activityFinished && (!streamingReplyId || (agent.activity && agent.activity.step !== 'answer')) && (
                <div className="orson-message-row is-ai">
                  <div className="orson-message-stack">
                    <div className="orson-bubble is-thinking">
                      {agentActivityLabel(agent.activity?.step || 'working', currentLanguage)}{agent.elapsed >= 10 ? ` (${agent.elapsed}s)` : ''}
                      <span className="orson-loading-dots">{analyzingDots}</span>
                    </div>
                  </div>
                </div>
              )}

              <AgentCards agent={agent} operationIds={unlinkedDraftOperationIds(messages, agent.operations)} />

              {error && (
                <div className="orson-error">
                  <AlertCircle size={17} /> {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="orson-composer">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="orson-form">
                <AgentInputTools language={currentLanguage} companyId={companyId} uid={uid} agent={agent} disabled={loading || agent.busy} onTranscript={text => setInputText(previous => `${previous}${previous ? " " : ""}${text}`)} />
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
                  disabled={!inputText.trim() || loading || agent.busy || !pondsReady}
                  className="orson-send"
                  aria-label={copy('Send message')}
                >
                  <ArrowUp size={21} strokeWidth={2.4} />
                </button>
              </form>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
