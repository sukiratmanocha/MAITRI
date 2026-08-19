import { useState, useEffect, useRef, useCallback } from 'react';
import { messageTypes, messageExchangeLog } from '../data/messages';
import { integrationStatus } from '../data/ports';
import {
    contactDirectory,
    MESSAGE_CATEGORIES,
    getOrCreateConversation,
    getConversations,
    sendMessage,
    getMessages,
} from '../data/tradeStore';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import './Messages.css';

export default function Messages() {
    const { user } = useAuth();
    const [msgTab, setMsgTab] = useState('all');

    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newText, setNewText] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [showNewConvo, setShowNewConvo] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const chatMessagesRef = useRef(null);
    const activeConvoRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);

    const userId = user?.userId || 'unknown';

    // Helper to scroll chat container internally without affecting outer window scroll
    const scrollToBottom = useCallback((behavior = 'auto') => {
        if (chatMessagesRef.current) {
            const { scrollHeight, clientHeight } = chatMessagesRef.current;
            if (behavior === 'smooth') {
                chatMessagesRef.current.scrollTo({
                    top: scrollHeight - clientHeight,
                    behavior: 'smooth',
                });
            } else {
                chatMessagesRef.current.scrollTop = scrollHeight - clientHeight;
            }
        }
    }, []);

    // Keep a ref in sync with activeConvo so the polling interval
    // always reads the latest value without re-creating the interval.
    useEffect(() => {
        activeConvoRef.current = activeConvo;
    }, [activeConvo]);

    // Load conversations from the API
    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations(userId);
            setConversations(prev => {
                if (prev.length === data.length) {
                    const isSame = prev.every((c, i) => {
                        const d = data[i];
                        return (c._id || c.id) === (d._id || d.id) &&
                            c.lastMessageAt === d.lastMessageAt &&
                            c.lastMessage === d.lastMessage;
                    });
                    if (isSame) return prev;
                }
                return data;
            });
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }, [userId]);

    // Load messages for the active conversation from the API
    const loadMessages = useCallback(async (isInitial = false) => {
        const convo = activeConvoRef.current;
        if (!convo) return;
        try {
            const convoId = convo._id || convo.id;
            const data = await getMessages(convoId);
            setMessages(prev => {
                if (!isInitial && prev.length === data.length) {
                    const lastPrev = prev[prev.length - 1];
                    const lastData = data[data.length - 1];
                    if ((!lastPrev && !lastData) || (lastPrev && lastData && (lastPrev._id || lastPrev.id) === (lastData._id || lastData.id))) {
                        return prev;
                    }
                }
                return data;
            });
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Load messages whenever the active conversation changes
    useEffect(() => {
        if (activeConvo) {
            loadMessages(true);
            setTimeout(() => {
                scrollToBottom('auto');
            }, 60);
        } else {
            setMessages([]);
        }
    }, [activeConvo, loadMessages, scrollToBottom]);

    // Poll for new messages / conversations every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadConversations();
            if (activeConvoRef.current) {
                loadMessages(false);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [loadConversations, loadMessages]);

    // Scroll chat to bottom only when new messages actually arrive and container is already near bottom
    useEffect(() => {
        if (messages.length > 0) {
            if (chatMessagesRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
                if (isNearBottom || messages.length - prevMessagesLengthRef.current === 1) {
                    scrollToBottom(prevMessagesLengthRef.current === 0 ? 'auto' : 'smooth');
                }
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages, scrollToBottom]);

    // Filter message types
    const filteredMsgTypes = msgTab === 'all'
        ? messageTypes
        : messageTypes.filter(m => m.category.toLowerCase() === msgTab);

    // Start new conversation
    async function startConversation(contact) {
        setLoading(true);
        try {
            const convo = await getOrCreateConversation(userId, contact.id, contact.name);
            setActiveConvo(convo);
            setShowNewConvo(false);
            setContactSearch('');
            await loadConversations();
            const convoId = convo._id || convo.id;
            const msgs = await getMessages(convoId);
            setMessages(msgs);
            setTimeout(() => scrollToBottom('auto'), 60);
        } catch (err) {
            console.error('Failed to start conversation:', err);
        } finally {
            setLoading(false);
        }
    }

    // Send message
    async function handleSend(e) {
        e.preventDefault();
        if (!newText.trim() || !activeConvo) return;

        const convoId = activeConvo._id || activeConvo.id;
        try {
            await sendMessage({
                conversationId: convoId,
                senderId: userId,
                senderName: user?.organization || 'You',
                text: newText.trim(),
                category: newCategory,
                relatedShipment: null,
            });

            setNewText('');
            // Immediately reload messages and conversations to show the sent message
            const msgs = await getMessages(convoId);
            setMessages(msgs);
            await loadConversations();
            setTimeout(() => scrollToBottom('smooth'), 60);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    // Filtered contacts for new conversation
    const filteredContacts = contactDirectory.filter(c => {
        if (c.id === userId) return false;
        if (!contactSearch) return true;
        return c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
            c.role.toLowerCase().includes(contactSearch.toLowerCase());
    });

    // Helper: get conversation ID (works with both _id and id)
    const getConvoId = (c) => c?._id || c?.id;

    return (
        <div className="messages-page">
            <div className="messages-grid">
                {/* Message Types Panel */}
                <div className="dash-card msg-panel">
                    <div className="card-header">
                        <h3>Marine & Customs Messages</h3>
                        <div className="filter-tabs mini">
                            {['all', 'marine', 'customs'].map(t => (
                                <button
                                    key={t}
                                    className={`filter-tab ${msgTab === t ? 'active' : ''}`}
                                    onClick={() => setMsgTab(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="msg-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMsgTypes.map(msg => (
                                    <tr key={msg.code}>
                                        <td className="text-muted">{msg.sno}</td>
                                        <td className="font-mono text-accent" style={{ fontWeight: 600 }}>{msg.code}</td>
                                        <td>{msg.name}</td>
                                        <td>
                                            <span className={`category-tag ${msg.category.toLowerCase()}`}>
                                                {msg.category}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={msg.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Message Exchange Log */}
                <div className="dash-card log-panel">
                    <div className="card-header">
                        <h3>Exchange Log</h3>
                        <span className="badge-live">
                            <span className="live-dot"></span>
                            Live
                        </span>
                    </div>
                    <div className="msg-log">
                        {messageExchangeLog.map((msg, i) => (
                            <div key={msg.id} className="log-item" style={{ animationDelay: `${i * 0.06}s` }}>
                                <div className="log-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13m11-11l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </div>
                                <div className="log-content">
                                    <div className="log-top">
                                        <span className="log-type font-mono">{msg.type}</span>
                                        <StatusBadge status={msg.status} />
                                    </div>
                                    <p className="log-desc">
                                        {msg.from} → {msg.to}
                                        <span className="text-muted"> · {msg.vessel}</span>
                                    </p>
                                    <span className="log-time font-mono">{msg.timestamp}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ Inter-Party Messaging ═══ */}
            <div className="dash-card chat-section">
                <div className="card-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: 'text-bottom', marginRight: '8px' }}>
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        Trade Messaging
                    </h3>
                    <button className="btn-new-convo" onClick={() => setShowNewConvo(!showNewConvo)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 5v14m-7-7h14" />
                        </svg>
                        New Conversation
                    </button>
                </div>

                <div className="chat-container">
                    {/* Conversations sidebar */}
                    <div className="convo-sidebar">
                        <div className="convo-sidebar-header">
                            <span className="convo-count">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
                        </div>
                        {conversations.length === 0 ? (
                            <div className="convo-empty">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                <p>No conversations yet</p>
                                <span>Start one to exchange trade info</span>
                            </div>
                        ) : (
                            <div className="convo-list">
                                {conversations.map(c => {
                                    const otherName = c.participantA === userId
                                        ? c.contactName
                                        : (contactDirectory.find(cd => cd.id === c.participantA)?.name || 'Unknown');
                                    const otherAvatar = contactDirectory.find(cd =>
                                        cd.id === (c.participantA === userId ? c.participantB : c.participantA)
                                    )?.avatar || '??';

                                    return (
                                        <div
                                            key={getConvoId(c)}
                                            className={`convo-item ${getConvoId(activeConvo) === getConvoId(c) ? 'active' : ''}`}
                                            onClick={() => setActiveConvo(c)}
                                        >
                                            <div className="convo-avatar">{otherAvatar}</div>
                                            <div className="convo-info">
                                                <span className="convo-name">{otherName}</span>
                                                <span className="convo-preview">{c.lastMessage || 'No messages yet'}</span>
                                            </div>
                                            {c.lastMessageAt && (
                                                <span className="convo-time">{c.lastMessageAt.split(' ')[1]?.slice(0, 5)}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Chat area */}
                    <div className="chat-area">
                        {/* Loading overlay */}
                        {loading && (
                            <div className="chat-placeholder">
                                <p>Loading…</p>
                            </div>
                        )}

                        {/* New conversation picker overlay */}
                        {showNewConvo && (
                            <div className="new-convo-overlay">
                                <div className="new-convo-header">
                                    <h4>Start New Conversation</h4>
                                    <button className="slideover-close" onClick={() => { setShowNewConvo(false); setContactSearch(''); }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="new-convo-search">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search organisations…"
                                        value={contactSearch}
                                        onChange={e => setContactSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="contact-list">
                                    {filteredContacts.map(c => (
                                        <div
                                            key={c.id}
                                            className="contact-item"
                                            onClick={() => startConversation(c)}
                                        >
                                            <div className="convo-avatar">{c.avatar}</div>
                                            <div className="contact-info">
                                                <span className="contact-name">{c.name}</span>
                                                <span className="contact-role">{c.role} · {c.port}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredContacts.length === 0 && (
                                        <p className="contact-empty">No matching contacts</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* No conversation selected */}
                        {!activeConvo && !showNewConvo && !loading && (
                            <div className="chat-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeLinecap="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                <h4>Select a conversation</h4>
                                <p>Choose from existing conversations or start a new one to exchange trade information with other parties.</p>
                            </div>
                        )}

                        {/* Active conversation */}
                        {activeConvo && !showNewConvo && !loading && (
                            <>
                                {/* Chat header */}
                                <div className="chat-header">
                                    <div className="chat-header-info">
                                        <div className="convo-avatar small">
                                            {contactDirectory.find(cd =>
                                                cd.id === (activeConvo.participantA === userId ? activeConvo.participantB : activeConvo.participantA)
                                            )?.avatar || '??'}
                                        </div>
                                        <div>
                                            <span className="chat-header-name">
                                                {activeConvo.participantA === userId
                                                    ? activeConvo.contactName
                                                    : (contactDirectory.find(cd => cd.id === activeConvo.participantA)?.name || 'Unknown')}
                                            </span>
                                            <span className="chat-header-role">
                                                {contactDirectory.find(cd =>
                                                    cd.id === (activeConvo.participantA === userId ? activeConvo.participantB : activeConvo.participantA)
                                                )?.role || ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="chat-messages" ref={chatMessagesRef}>
                                    {messages.length === 0 ? (
                                        <div className="chat-no-messages">
                                            <p>No messages yet — start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map(m => {
                                            const isMine = m.senderId === userId;
                                            const msgKey = m._id || m.id;
                                            return (
                                                <div key={msgKey} className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                                                    <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                        {!isMine && <span className="bubble-sender">{m.senderName}</span>}
                                                        <p className="bubble-text">{m.text}</p>
                                                        <div className="bubble-meta">
                                                            {m.category !== 'General' && (
                                                                <span className="bubble-category">{m.category}</span>
                                                            )}
                                                            <span className="bubble-time">{m.timestamp.split(' ')[1]?.slice(0, 5)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Compose */}
                                <form className="chat-compose" onSubmit={handleSend}>
                                    <select
                                        className="compose-category"
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        title="Message category"
                                    >
                                        {MESSAGE_CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        className="compose-input"
                                        placeholder="Type a message…"
                                        value={newText}
                                        onChange={e => setNewText(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="compose-send"
                                        disabled={!newText.trim()}
                                        title="Send message"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 2L11 13m11-11l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Corridor Integration Status */}
            <div className="dash-card">
                <div className="card-header">
                    <h3>Corridor Integration Status</h3>
                </div>
                <div className="corridors-grid">
                    {integrationStatus.map(route => (
                        <div key={route.id} className="corridor-card">
                            <div className="corridor-header">
                                <h4>{route.route}</h4>
                                {route.bidirectional && <span className="bi-badge">↔ Bidirectional</span>}
                            </div>
                            <div className="entity-list">
                                {route.entities.map((entity, i) => (
                                    <div key={i} className="entity-row">
                                        <span className="entity-name">{entity.name}</span>
                                        <StatusBadge status={entity.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

