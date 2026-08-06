import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeed } from '../context/LiveFeedContext';
import './Topbar.css';

const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview of trade activity' },
    '/imports': { title: 'Import Shipments', subtitle: 'Track incoming cargo' },
    '/exports': { title: 'Export Shipments', subtitle: 'Track outgoing cargo' },
    '/vessels': { title: 'Vessel Tracking', subtitle: 'Fleet status & routes' },
    '/messages': { title: 'Data Exchange', subtitle: 'Marine & customs messages' },
};

const TYPE_TABS = ['All', 'Departures', 'Arrivals', 'Loading'];
const TYPE_MAP = {
    All: null,
    Departures: 'departure',
    Arrivals: 'arrival',
    Loading: 'loading',
};

function timeAgo(timestamp) {
    const diff = Math.floor(
        (Date.now() - new Date(timestamp.replace(' ', 'T'))) / 1000
    );
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return timestamp.slice(0, 10);
}

export default function Topbar({ onMenuToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAllRead, markRead } = useFeed();
    const page = pageTitles[location.pathname] || { title: 'MAITRI', subtitle: '' };

    const [panelOpen, setPanelOpen] = useState(false);
    const [tab, setTab] = useState('All');
    const panelRef = useRef(null);
    const bellRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (
                panelOpen &&
                panelRef.current &&
                !panelRef.current.contains(e.target) &&
                bellRef.current &&
                !bellRef.current.contains(e.target)
            ) {
                setPanelOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [panelOpen]);

    useEffect(() => {
        setPanelOpen(false);
    }, [location.pathname]);

    const filtered = useMemo(() => {
        const filter = TYPE_MAP[tab];
        return filter
            ? notifications.filter((n) => n.type === filter)
            : notifications;
    }, [notifications, tab]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const userInitials = user?.avatar || 'PA';
    const userOrg = user?.organization || user?.role || 'Port Authority';
    const userPort = user?.port?.split('(')[0]?.trim() || 'JNPA';
    const userIcon = user?.roleIcon || '👤';

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button className="menu-toggle" onClick={onMenuToggle} title="Toggle sidebar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                </button>
                <div className="page-info">
                    <h1 className="page-title">{page.title}</h1>
                    {page.subtitle && <span className="page-subtitle">{page.subtitle}</span>}
                </div>
            </div>

            <div className="topbar-right">
                <div className="topbar-search">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input type="text" placeholder="Search shipments, vessels..." />
                </div>

                <div className="notif-bell-wrap">
                    <button
                        ref={bellRef}
                        className="topbar-btn notif-bell"
                        title="Notifications"
                        onClick={() => setPanelOpen((o) => !o)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    {panelOpen && (
                        <div className="notif-panel" ref={panelRef}>
                            <div className="notif-panel-header">
                                <h3 className="notif-panel-title">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        className="notif-panel-mark-read"
                                        onClick={markAllRead}
                                    >
                                        ✓ Mark all read
                                    </button>
                                )}
                            </div>

                            <div className="notif-panel-tabs">
                                {TYPE_TABS.map((t) => (
                                    <button
                                        key={t}
                                        className={`notif-panel-tab ${tab === t ? 'active' : ''}`}
                                        onClick={() => setTab(t)}
                                    >
                                        {t}
                                        {t !== 'All' &&
                                            notifications.filter(
                                                (n) => n.type === TYPE_MAP[t]
                                            ).length > 0 && (
                                                <span className="notif-panel-tab-count">
                                                    {
                                                        notifications.filter(
                                                            (n) => n.type === TYPE_MAP[t]
                                                        ).length
                                                    }
                                                </span>
                                            )}
                                    </button>
                                ))}
                            </div>

                            <div className="notif-panel-body">
                                {filtered.length === 0 ? (
                                    <div className="notif-panel-empty">
                                        <span className="notif-panel-empty-icon">🔔</span>
                                        <p>No notifications yet</p>
                                        <span className="notif-panel-empty-sub">
                                            Vessel events update every ~8s
                                        </span>
                                    </div>
                                ) : (
                                    filtered.map((n) => (
                                        <div
                                            key={n.id}
                                            className={`notif-panel-item ${!n.read ? 'unread' : ''}`}
                                            onClick={() => markRead(n.id)}
                                        >
                                            <span className="notif-panel-item-icon">
                                                {n.icon}
                                                {!n.read && <span className="notif-panel-unread-dot" />}
                                            </span>
                                            <div className="notif-panel-item-body">
                                                <div className="notif-panel-item-top">
                                                    <span className={`notif-panel-type notif-panel-type--${n.type}`}>
                                                        {n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                                                    </span>
                                                    <span className="notif-panel-item-time">
                                                        {timeAgo(n.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="notif-panel-item-vessel">{n.vesselName}</p>
                                                <p className="notif-panel-item-msg">{n.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-user">
                    <div className="user-avatar">{userInitials}</div>
                    <div className="user-info">
                        <span className="user-name">{userIcon} {userOrg}</span>
                        <span className="user-role">{userPort}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Logout">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
