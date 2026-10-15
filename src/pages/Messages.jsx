import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { messageTypes, messageExchangeLog } from '../data/messages';
import { integrationStatus } from '../data/ports';
import {
    getContactDirectory,
    findContact,
    MESSAGE_CATEGORIES,
    getOrCreateConversation,
    getConversations,
    sendMessage,
    getMessages,
    subscribe,
} from '../data/tradeStore';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import './Messages.css';

export default function Messages() {
    const { user, logout } = useAuth();
    const [msgTab, setMsgTab] = useState('all');

    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newText, setNewText] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [showNewConvo, setShowNewConvo] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [convoSearch, setConvoSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const chatMessagesRef = useRef(null);
    const activeConvoRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);

    const userId = user?.userId || 'unknown';
    const userName = user?.organization || user?.name || user?.role || 'You';

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

    // Keep activeConvo ref in sync
    useEffect(() => {
        activeConvoRef.current = activeConvo;
    }, [activeConvo]);

    // Helper: get conversation ID (works with both _id and id)
    const getConvoId = useCallback((c) => c?._id || c?.id, []);

    // Load conversations for the current user
    const loadConversations = useCallback(async () => {
        if (!userId || userId === 'unknown') return;
        try {
            const data = await getConversations(userId);
            setConversations(prev => {
                if (prev.length === data.length) {
                    const isSame = prev.every((c, i) => {
                        const d = data[i];
                        return getConvoId(c) === getConvoId(d) &&
                            c.lastMessageAt === d.lastMessageAt &&
                            c.lastMessage === d.lastMessage;
                    });
                    if (isSame) return prev;
                }
                return data;
            });

            // Update activeConvo reference if it was updated
            if (activeConvoRef.current) {
                const currentActiveId = getConvoId(activeConvoRef.current);
                const updatedActive = data.find(c => getConvoId(c) === currentActiveId);
                if (updatedActive) {
                    setActiveConvo(updatedActive);
                }
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        }
    }, [userId, getConvoId]);

    // Load messages for the active conversation
    const loadMessages = useCallback(async (isInitial = false) => {
        const convo = activeConvoRef.current;
        if (!convo) return;
        const convoId = convo._id || convo.id;
        try {
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

    // Initial load & real-time store subscription
    useEffect(() => {
        loadConversations();
        const unsubscribe = subscribe(() => {
            loadConversations();
            if (activeConvoRef.current) {
                loadMessages(false);
            }
        });
        return unsubscribe;
    }, [loadConversations, loadMessages]);

    // Load messages whenever active conversation changes
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

    // Polling interval (every 2.5s for fast multi-tab and multi-user chat response)
    useEffect(() => {
        const interval = setInterval(() => {
            loadConversations();
            if (activeConvoRef.current) {
                loadMessages(false);
            }
        }, 2500);
        return () => clearInterval(interval);
    }, [loadConversations, loadMessages]);

    // Scroll chat to bottom when messages update
    useEffect(() => {
        if (messages.length > 0 && chatMessagesRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;
            if (isNearBottom || messages.length - prevMessagesLengthRef.current === 1) {
                scrollToBottom(prevMessagesLengthRef.current === 0 ? 'auto' : 'smooth');
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages, scrollToBottom]);

    // Auto-select first conversation if none selected and conversations exist
    useEffect(() => {
        if (!activeConvo && conversations.length > 0 && !showNewConvo) {
            setActiveConvo(conversations[0]);
        }
    }, [conversations, activeConvo, showNewConvo]);

    // Filter message types for reference table
    const filteredMsgTypes = msgTab === 'all'
        ? messageTypes
        : messageTypes.filter(m => m.category.toLowerCase() === msgTab);

    // Filter conversations by search term
    const filteredConversations = useMemo(() => {
        if (!convoSearch.trim()) return conversations;
        const q = convoSearch.toLowerCase();
        return conversations.filter(c => {
            const isA = c.participantA === userId;
            const otherName = isA ? (c.participantBName || c.contactName) : c.participantAName;
            const otherRole = isA ? c.participantBRole : c.participantARole;
            const lastMsg = c.lastMessage || '';
            return (otherName && otherName.toLowerCase().includes(q)) ||
                   (otherRole && otherRole.toLowerCase().includes(q)) ||
                   lastMsg.toLowerCase().includes(q);
        });
    }, [conversations, convoSearch, userId]);

    // Start or open a separate 1-on-1 conversation
    async function startConversation(contact) {
        setLoading(true);
        try {
            const convo = await getOrCreateConversation(user, contact);
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

    // Send a message in the active conversation
    async function handleSend(e) {
        e.preventDefault();
        if (!newText.trim() || !activeConvo || sending) return;

        const convoId = activeConvo._id || activeConvo.id;
        const text = newText.trim();
        setNewText('');
        setSending(true);

        try {
            await sendMessage({
                conversationId: convoId,
                senderId: userId,
                senderName: userName,
                text,
                category: newCategory,
                relatedShipment: null,
            });

            // Immediately fetch latest messages & conversation preview
            const msgs = await getMessages(convoId);
            setMessages(msgs);
            await loadConversations();
            setTimeout(() => scrollToBottom('smooth'), 50);
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    }

    // Filter contacts for New Conversation dialog (exclude self)
    const allDirectoryContacts = getContactDirectory().filter(c => c.id !== userId);
    const filteredContacts = allDirectoryContacts.filter(c => {
        if (!contactSearch.trim()) return true;
        const q = contactSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
               (c.role && c.role.toLowerCase().includes(q)) ||
               (c.port && c.port.toLowerCase().includes(q));
    });

    // Helper to extract active partner details
    const activeIsA = activeConvo?.participantA === userId;
    const activePartnerId = activeIsA ? activeConvo?.participantB : activeConvo?.participantA;
    const activePartnerContact = findContact(activePartnerId);
    const activePartnerName = activeIsA
        ? (activeConvo?.participantBName || activePartnerContact?.name || activePartnerId)
        : (activeConvo?.participantAName || activePartnerContact?.name || activePartnerId);
    const activePartnerRole = activeIsA
        ? (activeConvo?.participantBRole || (activePartnerContact ? `${activePartnerContact.role} · ${activePartnerContact.port}` : ''))
        : (activeConvo?.participantARole || (activePartnerContact ? `${activePartnerContact.role} · ${activePartnerContact.port}` : ''));
    const activePartnerAvatar = activeIsA
        ? (activeConvo?.participantBAvatar || activePartnerContact?.avatar || (activePartnerId || '??').slice(0, 2).toUpperCase())
        : (activeConvo?.participantAAvatar || activePartnerContact?.avatar || (activePartnerId || '??').slice(0, 2).toUpperCase());

    return (
        <div className="messages-page">
            {/* Top row: Reference tables */}
            <div className="messages-grid">
                {/* Message Types Reference Panel */}
                <div className="dash-card msg-panel">
                    <div className="card-header">
                        <h3>Marine & Customs Message Types</h3>
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

                {/* Exchange Log */}
                <div className="dash-card log-panel">
                    <div className="card-header">
                        <h3>Exchange Log</h3>
                        <span className="badge-live">
                            <span className="live-dot"></span>
                            Live Feed
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

            {/* ═══ Inter-Party Direct Trade Messaging ═══ */}
            <div className="dash-card chat-section">
                <div className="card-header chat-section-header">
                    <div className="chat-title-group">
                        <h3>
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ verticalAlign: 'text-bottom', marginRight: '8px' }}>
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                            Direct Trade Messaging
                        </h3>
                        <span className="current-user-tag">
                            👤 Logged in as: <strong>{userName}</strong> ({user?.role || 'Stakeholder'})
                        </span>
                    </div>

                    <div className="chat-actions">
                        <button className="btn-new-convo" onClick={() => setShowNewConvo(true)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M12 5v14m-7-7h14" />
                            </svg>
                            New Chat
                        </button>
                    </div>
                </div>

                <div className="chat-container">
                    {/* Conversations Sidebar */}
                    <div className="convo-sidebar">
                        <div className="convo-sidebar-header">
                            <span className="convo-count">
                                {conversations.length} Chat{conversations.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Search in conversations */}
                        <div className="convo-search-wrap">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search chats..."
                                value={convoSearch}
                                onChange={e => setConvoSearch(e.target.value)}
                            />
                        </div>

                        {filteredConversations.length === 0 ? (
                            <div className="convo-empty">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                <p>{conversations.length === 0 ? 'No conversations yet' : 'No matching chats'}</p>
                                <span>{conversations.length === 0 ? 'Start a private chat with any corridor partner' : 'Try a different search term'}</span>
                                {conversations.length === 0 && (
                                    <button className="btn-empty-start" onClick={() => setShowNewConvo(true)}>
                                        Start First Chat
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="convo-list">
                                {filteredConversations.map(c => {
                                    const isA = c.participantA === userId;
                                    const partnerId = isA ? c.participantB : c.participantA;
                                    const partnerContact = findContact(partnerId);
                                    const partnerName = isA
                                        ? (c.participantBName || partnerContact?.name || partnerId)
                                        : (c.participantAName || partnerContact?.name || partnerId);
                                    const partnerAvatar = isA
                                        ? (c.participantBAvatar || partnerContact?.avatar || (partnerId || '??').slice(0, 2).toUpperCase())
                                        : (c.participantAAvatar || partnerContact?.avatar || (partnerId || '??').slice(0, 2).toUpperCase());
                                    const partnerRole = isA
                                        ? (c.participantBRole || partnerContact?.role || '')
                                        : (c.participantARole || partnerContact?.role || '');

                                    const isMineLast = c.lastSenderId === userId;
                                    const prefix = isMineLast ? 'You: ' : '';
                                    const active = getConvoId(activeConvo) === getConvoId(c);

                                    return (
                                        <div
                                            key={getConvoId(c)}
                                            className={`convo-item ${active ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveConvo(c);
                                                setShowNewConvo(false);
                                            }}
                                        >
                                            <div className="convo-avatar-wrap">
                                                <div className="convo-avatar">{partnerAvatar}</div>
                                                <span className="online-dot" />
                                            </div>
                                            <div className="convo-info">
                                                <div className="convo-top-row">
                                                    <span className="convo-name">{partnerName}</span>
                                                    {c.lastMessageAt && (
                                                        <span className="convo-time">
                                                            {c.lastMessageAt.split(' ')[1]?.slice(0, 5) || c.lastMessageAt.slice(11, 16)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="convo-role-sub">{partnerRole}</span>
                                                <span className="convo-preview">
                                                    {c.lastMessage ? `${prefix}${c.lastMessage}` : 'No messages yet'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className="chat-area">
                        {loading && (
                            <div className="chat-loading-overlay">
                                <span className="btn-spinner" />
                                <p>Loading conversation…</p>
                            </div>
                        )}

                        {/* New Conversation Modal Overlay */}
                        {showNewConvo && (
                            <div className="new-convo-overlay">
                                <div className="new-convo-header">
                                    <div>
                                        <h4>Start New Private Chat</h4>
                                        <p className="new-convo-sub">Choose any corridor stakeholder to open a separate 1-on-1 thread</p>
                                    </div>
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
                                        placeholder="Search by name, role, port..."
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
                                            <span className="contact-action-tag">Message →</span>
                                        </div>
                                    ))}
                                    {filteredContacts.length === 0 && (
                                        <div className="contact-empty">
                                            <p>No matching corridor contacts found</p>
                                            <span>Try searching for 'Customs', 'Port', 'Maersk', 'Tata', etc.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* No conversation selected state */}
                        {!activeConvo && !showNewConvo && !loading && (
                            <div className="chat-placeholder">
                                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.2" strokeLinecap="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                                <h4>Select a Conversation</h4>
                                <p>Select an existing chat from the left or click "New Chat" to connect with any corridor stakeholder.</p>
                                <button className="btn-new-convo" onClick={() => setShowNewConvo(true)}>
                                    + Start New Chat
                                </button>
                            </div>
                        )}

                        {/* Active Conversation */}
                        {activeConvo && !showNewConvo && (
                            <>
                                {/* Chat Header */}
                                <div className="chat-header">
                                    <div className="chat-header-info">
                                        <div className="convo-avatar-wrap">
                                            <div className="convo-avatar small">
                                                {activePartnerAvatar}
                                            </div>
                                            <span className="online-dot" />
                                        </div>
                                        <div>
                                            <span className="chat-header-name">
                                                {activePartnerName}
                                            </span>
                                            <div className="chat-header-sub">
                                                <span className="chat-header-role">{activePartnerRole}</span>
                                                <span className="chat-header-badge">Online · Direct Chat</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="chat-header-actions">
                                        <span className="chat-security-tag">
                                            🔒 End-to-End Trade Corridor Encryption
                                        </span>
                                    </div>
                                </div>

                                {/* Messages Stream */}
                                <div className="chat-messages" ref={chatMessagesRef}>
                                    {messages.length === 0 ? (
                                        <div className="chat-no-messages">
                                            <div className="empty-chat-hero">
                                                <div className="empty-chat-icon">💬</div>
                                                <h4>No messages yet</h4>
                                                <p>Send a message to <strong>{activePartnerName}</strong> to start exchanging trade intelligence, documentation, or customs queries.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map(m => {
                                            const isMine = m.senderId === userId;
                                            const msgKey = m._id || m.id;
                                            return (
                                                <div key={msgKey} className={`chat-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                                                    <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                        {!isMine && <span className="bubble-sender">{m.senderName || activePartnerName}</span>}
                                                        <p className="bubble-text">{m.text}</p>
                                                        <div className="bubble-meta">
                                                            {m.category && m.category !== 'General' && (
                                                                <span className="bubble-category">{m.category}</span>
                                                            )}
                                                            <span className="bubble-time">
                                                                {m.timestamp?.split(' ')[1]?.slice(0, 5) || m.timestamp?.slice(11, 16) || ''}
                                                            </span>
                                                            {isMine && (
                                                                <span className="bubble-check" title="Delivered">✓✓</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Compose Bar */}
                                <form className="chat-compose" onSubmit={handleSend}>
                                    <div className="compose-category-wrap">
                                        <label htmlFor="msg-cat-select" className="sr-only">Category</label>
                                        <select
                                            id="msg-cat-select"
                                            className="compose-category"
                                            value={newCategory}
                                            onChange={e => setNewCategory(e.target.value)}
                                            title="Message category"
                                        >
                                            {MESSAGE_CATEGORIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <input
                                        type="text"
                                        className="compose-input"
                                        placeholder={`Message ${activePartnerName}...`}
                                        value={newText}
                                        onChange={e => setNewText(e.target.value)}
                                        disabled={sending}
                                    />

                                    <button
                                        type="submit"
                                        className="compose-send"
                                        disabled={!newText.trim() || sending}
                                        title="Send message (Enter)"
                                    >
                                        {sending ? (
                                            <span className="btn-spinner mini" />
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 2L11 13m11-11l-7 20-4-9-9-4 20-7z" />
                                            </svg>
                                        )}
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
