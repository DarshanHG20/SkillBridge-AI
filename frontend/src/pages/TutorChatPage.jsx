import React, { useState, useEffect, useRef } from 'react';
import ApiClient from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function TutorChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [tutorStatus, setTutorStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadTutorStatus();
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const loadTutorStatus = async () => {
    try {
      const status = await ApiClient.getTutorStatus();
      setTutorStatus(status);
    } catch (err) {
      console.warn('Could not load tutor status:', err);
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.listConversations();
      const convList = Array.isArray(data) ? data : data.conversations || [];
      setConversations(convList);
      if (convList.length > 0 && !activeConv) {
        selectConversation(convList[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const normalizeMessage = (msg) => {
    if (!msg) return null;
    return {
      ...msg,
      role: msg.role || msg.sender || 'assistant',
      content: msg.content ?? msg.message_text ?? '',
      sources: msg.sources || msg.sources_json || [],
      timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
    };
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const fullConv = await ApiClient.getConversation(conv.id || conv._id);
      const rawMessages = fullConv.messages || [];
      setMessages(rawMessages.map(normalizeMessage).filter(Boolean));
    } catch (err) {
      setError('Failed to load conversation history');
    }
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newChatTitle.trim()) return;
    try {
      const newConv = await ApiClient.createConversation(newChatTitle.trim());
      setConversations([newConv, ...conversations]);
      setActiveConv(newConv);
      setMessages((newConv.messages || []).map(normalizeMessage).filter(Boolean));
      setNewChatTitle('');
      setShowNewModal(false);
    } catch (err) {
      alert(`Error creating chat: ${err.message}`);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sending) return;

    let targetConv = activeConv;
    if (!targetConv) {
      // Auto create a conversation
      try {
        targetConv = await ApiClient.createConversation(text.slice(0, 30) + '...');
        setConversations([targetConv, ...conversations]);
        setActiveConv(targetConv);
      } catch (err) {
        alert('Failed to initialize conversation');
        return;
      }
    }

    const optimisticUserMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputMessage('');
    setSending(true);

    try {
      const convId = targetConv.id || targetConv._id;
      const response = await ApiClient.sendMessage(convId, text, useRag);
      
      const rawAssistant = response.message || response;
      const assistantMsg = normalizeMessage({
        role: rawAssistant.role || rawAssistant.sender || 'assistant',
        content: rawAssistant.content ?? rawAssistant.message_text ?? rawAssistant.reply ?? 'I have processed your inquiry.',
        sources: rawAssistant.sources || rawAssistant.sources_json || response.grounding_sources || [],
        timestamp: rawAssistant.timestamp || rawAssistant.created_at || new Date().toISOString()
      });

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `Error receiving response: ${err.message}. Please check your connection or AI provider configuration.`,
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await ApiClient.deleteConversation(convId);
      const filtered = conversations.filter((c) => (c.id || c._id) !== convId);
      setConversations(filtered);
      if (activeConv && (activeConv.id || activeConv._id) === convId) {
        if (filtered.length > 0) {
          selectConversation(filtered[0]);
        } else {
          setActiveConv(null);
          setMessages([]);
        }
      }
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    }
  };

  const samplePrompts = [
    "Explain how Bayesian inference is used in adaptive mastery tracking",
    "How do I prevent SQL injection and AST vulnerabilities?",
    "What is the difference between supervised and self-supervised learning?",
    "Review the prerequisites needed to become a Full-Stack AI Engineer"
  ];

  return (
    <div className="container" style={{ padding: '30px 20px', minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="text-gradient" style={{ margin: 0, fontSize: '2rem' }}>AI Pedagogical Tutor</h1>
            <span className="badge badge-accent">Interactive RAG</span>
          </div>
          <p className="text-muted" style={{ margin: '6px 0 0 0' }}>
            Socratic learning assistant grounded with vetted curriculum documents and continuous mastery context.
          </p>
        </div>

        {/* AI Provider Status Card */}
        {tutorStatus && (
          <div className="glass-panel" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}>
            <span
              className="status-indicator"
              style={{
                background: (tutorStatus.status === 'online' || tutorStatus.is_live_llm || tutorStatus.fallback_available)
                  ? 'var(--accent-green)'
                  : '#F59E0B',
              }}
            />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Provider: {tutorStatus.provider || (tutorStatus.is_live_llm ? tutorStatus.ai_provider : `${tutorStatus.ai_provider || 'local'} (Pedagogical Fallback)`)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Model: {tutorStatus.model_name || tutorStatus.model || 'deterministic_fallback'} &bull;{' '}
                {tutorStatus.knowledge_documents_count != null
                  ? `RAG Docs: ${tutorStatus.knowledge_documents_count}`
                  : `Daily Limit: ${tutorStatus.daily_rate_limit ?? 100}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', flex: 1, minHeight: '600px' }}>
        
        {/* Left Sidebar: Conversations List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Conversations</span>
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setShowNewModal(true)}
            >
              + New Chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading ? (
              <div className="text-center text-muted" style={{ padding: '24px 0' }}>Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '30px 10px', fontSize: '0.85rem' }}>
                No active conversations yet. Click <strong>+ New Chat</strong> to begin.
              </div>
            ) : (
              conversations.map((c) => {
                const convId = c.id || c._id;
                const isActive = activeConv && (activeConv.id || activeConv._id) === convId;
                return (
                  <div
                    key={convId}
                    onClick={() => selectConversation(c)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: isActive ? 600 : 400 }}>
                        {c.title || 'Conversation'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(c.updated_at || c.created_at || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(convId, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        fontSize: '0.9rem'
                      }}
                      title="Delete chat"
                    >
                      &times;
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Messages + Input */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Top Bar inside active chat */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                {activeConv ? activeConv.title : 'New Learning Session'}
              </span>
              <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '12px' }}>
                {messages.length} exchanges
              </span>
            </div>

            {/* RAG Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                style={{ accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
              />
              <span style={{ color: useRag ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                Knowledge Base (RAG) Grounding
              </span>
            </label>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '540px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🤖</div>
                <h3 style={{ marginBottom: '8px' }}>How can I accelerate your learning today?</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
                  Ask questions about skills in your curriculum, get step-by-step code walkthroughs, or request personalized study advice.
                </p>

                {/* Sample Prompt Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Suggested inquiries:
                  </div>
                  {samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      className="glass-panel"
                      onClick={() => handleSendMessage(prompt)}
                      style={{
                        padding: '10px 14px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: 'var(--text-light)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      &ldquo;{prompt}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = (msg.role || msg.sender) === 'user';
                const msgContent = msg.content ?? msg.message_text ?? '';
                const msgSources = msg.sources || msg.sources_json || [];
                const msgTimestamp = msg.timestamp || msg.created_at;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', padding: '0 4px' }}>
                      {isUser ? 'You' : 'SkillBridge AI Tutor'} &bull; {new Date(msgTimestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '14px 18px',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        background: isUser ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(30, 41, 59, 0.85)',
                        border: isUser ? 'none' : '1px solid var(--border-color)',
                        color: '#f8fafc',
                        lineHeight: 1.6,
                        fontSize: '0.92rem',
                        whiteSpace: 'pre-wrap',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      {msgContent}

                      {/* Grounding Citations */}
                      {msgSources && msgSources.length > 0 && (
                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-blue)', display: 'block', marginBottom: '4px' }}>
                            📚 Grounded in Knowledge Base Sources:
                          </span>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            {msgSources.map((src, sIdx) => (
                              <li key={sIdx} style={{ color: 'var(--text-muted)' }}>
                                {typeof src === 'string'
                                  ? src
                                  : (src.document_title || src.title || src.filename || 'Reference Source')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  SkillBridge AI Tutor &bull; Thinking...
                </div>
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px 16px 16px 2px',
                    background: 'rgba(30, 41, 59, 0.85)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Synthesizing pedagogical guidance...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '12px' }}
            >
              <input
                type="text"
                className="input-control"
                placeholder={useRag ? "Ask question grounded in curriculum library..." : "Type your question or request an explanation..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sending}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputMessage.trim() || sending}
                style={{ minWidth: '90px' }}
              >
                {sending ? 'Sending...' : 'Ask Tutor'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Start New Chat Session</h3>
            <form onSubmit={handleCreateConversation}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Topic or Title
                </label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. Asynchronous Python & Celery"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
