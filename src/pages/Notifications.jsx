import { useState, useMemo } from 'react';
import { useFeed } from '../context/LiveFeedContext';
import './Notifications.css';

const TYPE_TABS = ['All', 'Departures', 'Arrivals', 'Loading'];
const TYPE_MAP = {
    'All': null,
    'Departures': 'departure',
    'Arrivals': 'arrival',
    'Loading': 'loading',
};

const TYPE_COLORS = {
    departure: 'notif-departure',
    arrival: 'notif-arrival',
    loading: 'notif-loading',
    update: 'notif-update',
};

function timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - new Date(timestamp.replace(' ', 'T'))) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return timestamp.slice(0, 10);
}

export default function Notifications() {
    const { notifications, unreadCount, markAllRead, markRead } = useFeed();
    const [tab, setTab] = useState('All');
    const navigate = useNavigate();

    const filtered = useMemo(() => {
        const filter = TYPE_MAP[tab];
        return filter ? notifications.filter(n => n.type === filter) : notifications;
    }, [notifications, tab]);

    return (
        <div className="notifications-page">
            <div className="notif-header-row">
                <div>
                    <div className="filter-tabs">
                        {TYPE_TABS.map(t => (
                            <button
                                key={t}
                                className={`filter-tab ${tab === t ? 'active' : ''}`}
                                onClick={() => setTab(t)}
                            >
                                {t}
                                {t !== 'All' && notifications.filter(n => n.type === TYPE_MAP[t]).length > 0 && (
                                    <span className="tab-count">
                                        {notifications.filter(n => n.type === TYPE_MAP[t]).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button className="btn-mark-read" onClick={markAllRead}>
                        ✓ Mark all read ({unreadCount})
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="notif-empty">
                    <span className="notif-empty-icon">🔔</span>
                    <p>No notifications yet. Vessel events will appear here as the fleet moves.</p>
                    <span className="notif-empty-sub">Events update every ~8 seconds</span>
                </div>
            ) : (
                <div className="notif-list">
                    {filtered.map(n => (
                        <div
                            key={n.id}
                            className={`notif-card ${TYPE_COLORS[n.type]} ${!n.read ? 'unread' : ''}`}
                            onClick={() => markRead(n.id)}
                        >
                            <div className="notif-icon-wrap">
                                <span className="notif-icon">{n.icon}</span>
                                {!n.read && <span className="notif-unread-dot" />}
                            </div>
                            <div className="notif-body">
                                <div className="notif-top">
                                    <span className={`notif-type-badge notif-badge-${n.type}`}>
                                        {n.type.charAt(0).toUpperCase() + n.type.slice(1)}
                                    </span>
                                    <span className="notif-time">{timeAgo(n.timestamp)}</span>
                                </div>
                                <p className="notif-vessel">{n.vesselName}</p>
                                <p className="notif-message">{n.message}</p>
                                <div className="notif-status-change">
                                    <span className={`status-pill pill-${n.fromStatus}`}>{n.fromStatus.replace('_', ' ')}</span>
                                    <span className="status-arrow">→</span>
                                    <span className={`status-pill pill-${n.toStatus}`}>{n.toStatus.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
