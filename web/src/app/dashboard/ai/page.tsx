"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Trash2, 
  Loader2, 
  Waves,
  BrainCircuit,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Zap
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGemini } from '@/hooks/useGemini';

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
  "Check overfeeding and biomass risk",
  "Review water-quality risk",
  "Explain FCR and growth confidence"
];

export default function OrsonAIPage() {
  const [ponds, setPonds] = useState<PondContext[]>([]);
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { sendMessage, loading, clearChat, error } = useGemini();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onSnapshot(doc(db, 'users', firebaseUser.uid), (uDoc) => {
          const cid = uDoc.data()?.companyId;
          setCompanyId(cid);
          if (cid) {
            onSnapshot(collection(db, 'companies', cid, 'ponds'), (snapshot) => {
              setPonds(snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as PondContext))
                .filter((pond) => pond.cycleStatus !== 'ended'));
            });
          }
        });
      }
    });

    if (!isInitialized) {
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        type: 'ai',
        message: "🦐 Hello! I'm Orson, your AI aquaculture advisor. I've analyzed your farm data and I'm ready to help you optimize growth and prevent issues. What's on your mind today?",
        timestamp: new Date()
      };
      
      const saved = sessionStorage.getItem('orson_messages');
      if (saved) {
        setMessages(JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } else {
        setMessages([welcomeMsg]);
      }
      setIsInitialized(true);
    }

    return () => unsubAuth();
  }, [isInitialized]);

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
      const aiResponse = await sendMessage(text.trim(), ponds, { companyId });
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
      setMessages([{
        id: Date.now().toString(),
        type: 'ai',
        message: "History cleared. I'm ready for fresh analysis!",
        timestamp: new Date()
      }]);
    }
  };

  const aiMessageCount = messages.filter(message => message.type === 'ai').length;

  return (
    <div className="dashboard-page" style={{ height: 'calc(100vh - 140px)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-mid)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>Synced ponds</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{ponds.length}</div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-mid)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>AI replies</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{aiMessageCount}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleClearChat}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: '#FFF', color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            <Trash2 size={16} /> Reset
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '24px', minHeight: 0 }}>
        
        {/* Chat Interface */}
        <div className="glass-card" style={{ background: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                gap: '16px',
                maxWidth: '85%',
                alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: msg.type === 'user' ? 'var(--primary)' : 'var(--bg-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: msg.type === 'user' ? '#FFF' : 'var(--primary)'
                }}>
                  {msg.type === 'user' ? 'U' : <Sparkles size={18} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: msg.type === 'user' ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
                    background: msg.type === 'user' ? 'var(--primary)' : 'var(--bg-mid)',
                    color: msg.type === 'user' ? '#FFF' : 'var(--text-primary)',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    boxShadow: msg.type === 'user' ? '0 4px 12px rgba(15, 76, 117, 0.2)' : 'none'
                  }}>
                    {msg.message}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', gap: '16px', alignSelf: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Loader2 className="animate-spin" size={18} />
                </div>
                <div style={{ padding: '16px 20px', borderRadius: '4px 20px 20px 20px', background: 'var(--bg-mid)', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                  Orson is analyzing your farm metrics...
                </div>
              </div>
            )}
            
            {error && (
              <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '14px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
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
                  style={{
                    width: '100%', minHeight: '56px', maxHeight: '160px', padding: '16px 20px',
                    borderRadius: '16px', border: '1px solid var(--border)', background: '#FFF',
                    fontSize: '15px', outline: 'none', resize: 'none', transition: 'border-color 0.2s',
                    fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
              <button 
                type="submit" 
                disabled={!inputText.trim() || loading}
                className="btn-primary"
                style={{ width: '56px', height: '56px', borderRadius: '16px', padding: '0', flexShrink: 0 }}
              >
                <Send size={22} />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ background: '#FFFFFF', padding: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--primary)" /> Suggested Queries
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SUGGESTED_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'transparent', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-dim)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ background: '#FFFFFF', padding: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#059669" /> Analyzed Ponds
            </h4>
            {ponds.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Connect pond records to give Orson live biological context before asking for analysis.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ponds.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.pondName || 'Unnamed pond'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{p.plSupplier || p.supplier || 'N/A'}</span>
                  </div>
                ))}
                {ponds.length > 5 && <div style={{ fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '4px' }}>+ {ponds.length - 5} more ponds synced</div>}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
