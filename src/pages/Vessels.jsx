import { useState, useMemo } from 'react';
import { useFeed } from '../context/LiveFeedContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import './Vessels.css';

const statusTabs = ['All', 'At Port', 'In Transit', 'Loading', 'Arriving Soon'];
const statusMap = { 'All': null, 'At Port': 'at_port', 'In Transit': 'in_transit', 'Loading': 'loading', 'Arriving Soon': 'arriving_soon' };

const ALL_STATUSES = [
    { value: 'in_transit', label: 'In Transit' },
    { value: 'arriving_soon', label: 'Arriving Soon' },
    { value: 'at_port', label: 'At Port' },
    { value: 'loading', label: 'Loading' },
];

const SORT_OPTIONS = [
    { label: 'Default', value: 'default' },
    { label: 'ETA (Earliest)', value: 'eta_asc' },
    { label: 'Capacity (Largest)', value: 'capacity_desc' },
    { label: 'Containers (Most)', value: 'containers_desc' },
    { label: 'Name (A–Z)', value: 'name_asc' },
];

const FLAG_REASONS = [
    'Suspicious Cargo',
    'Documentation Incomplete',
    'Customs Inspection Required',
    'Security Concern',
    'Manifest Mismatch',
    'Other',
];

export default function Vessels() {
    const { vessels, changeVesselStatus, flagVessel, unflagVessel, vesselFlags } = useFeed();
    const { can, user } = useAuth();
    const [tab, setTab] = useState('All');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('default');

    // Per-card UI state for the flag dialog
    const [flagDialog, setFlagDialog] = useState(null); // { vesselId, vesselName }
    const [flagReason, setFlagReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const canChangeStatus = can('canChangeStatus');
    const canFlagHold = can('canFlagHold');

    const filtered = useMemo(() => {
        let list = vessels.filter(v => !statusMap[tab] || v.status === statusMap[tab]);

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(v =>
                v.name.toLowerCase().includes(q) ||
                v.imo.includes(q)
            );
        }

        switch (sort) {
            case 'eta_asc':
                list = [...list].sort((a, b) => {
                    if (!a.eta) return 1;
                    if (!b.eta) return -1;
                    return new Date(a.eta) - new Date(b.eta);
                });
                break;
            case 'capacity_desc':
                list = [...list].sort((a, b) => {
                    const aVal = parseInt(a.capacity.replace(/\D/g, '')) || 0;
                    const bVal = parseInt(b.capacity.replace(/\D/g, '')) || 0;
                    return bVal - aVal;
                });
                break;
            case 'containers_desc':
                list = [...list].sort((a, b) => b.cargo.containers - a.cargo.containers);
                break;
            case 'name_asc':
                list = [...list].sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                break;
        }

        return list;
    }, [vessels, tab, search, sort]);

    function handleStatusChange(vesselId, newStatus) {
        changeVesselStatus(vesselId, newStatus, user?.organization || user?.role);
    }

    function openFlagDialog(vessel) {
        setFlagDialog({ vesselId: vessel.id, vesselName: vessel.name });
        setFlagReason('');
        setCustomReason('');
    }

    function confirmFlag() {
        if (!flagDialog) return;
        const reason = flagReason === 'Other' ? customReason : flagReason;
        flagVessel(flagDialog.vesselId, reason, user?.organization || user?.role);
        setFlagDialog(null);
    }

    function handleUnflag(vesselId) {
        unflagVessel(vesselId, user?.organization || user?.role);
    }

    return (
        <div className="vessels-page">
            {/* Flag/Hold Dialog */}
            {flagDialog && (
                <div className="flag-dialog-overlay" onClick={() => setFlagDialog(null)}>
                    <div className="flag-dialog" onClick={e => e.stopPropagation()}>
                        <div className="flag-dialog-header">
                            <span className="flag-dialog-icon">🚨</span>
                            <div>
                                <h3>Flag / Hold Vessel</h3>
                                <p className="flag-dialog-vessel">{flagDialog.vesselName}</p>
                            </div>
                        </div>
                        <label className="flag-label">Reason for Hold</label>
                        <div className="flag-reasons">
                            {FLAG_REASONS.map(r => (
                                <button
                                    key={r}
                                    className={`flag-reason-btn ${flagReason === r ? 'selected' : ''}`}
                                    onClick={() => setFlagReason(r)}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        {flagReason === 'Other' && (
                            <input
                                className="flag-custom-reason"
                                type="text"
                                placeholder="Describe reason…"
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                            />
                        )}
                        <div className="flag-dialog-actions">
                            <button className="btn-cancel" onClick={() => setFlagDialog(null)}>Cancel</button>
                            <button
                                className="btn-flag-confirm"
                                disabled={!flagReason || (flagReason === 'Other' && !customReason.trim())}
                                onClick={confirmFlag}
                            >
                                🚨 Confirm Hold
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="vessels-controls">
                <div className="filter-tabs">
                    {statusTabs.map(t => (
                        <button
                            key={t}
                            className={`filter-tab ${tab === t ? 'active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t}
                            {t !== 'All' && (
                                <span className="tab-count">
                                    {vessels.filter(v => v.status === statusMap[t]).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="vessels-search-sort">
                    <div className="search-wrap">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="vessel-search"
                            placeholder="Search by name or IMO…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
                        )}
                    </div>
                    <select
                        className="sort-select"
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                    >
                        {SORT_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="vessels-empty">
                    <span className="empty-icon">🔍</span>
                    <p>No vessels match <strong>"{search}"</strong> in this filter.</p>
                    <button className="btn-clear-search" onClick={() => { setSearch(''); setTab('All'); }}>Clear filters</button>
                </div>
            ) : (
                <div className="vessels-grid stagger-children">
                    {filtered.map(vessel => {
                        const flag = vesselFlags?.[vessel.id];
                        const isFlagged = !!flag;
                        return (
                            <div key={vessel.id} className={`vessel-card vessel-${vessel.status}${isFlagged ? ' vessel-flagged' : ''}`}>
                                <div className="vessel-top">
                                    <div className="vessel-name-row">
                                        <h3>{vessel.name}</h3>
                                        {isFlagged && <span className="flag-badge">🚨 HELD</span>}
                                        <span className="vessel-flag">{vessel.flag}</span>
                                    </div>
                                    <StatusBadge status={vessel.status} />
                                </div>

                                <div className="vessel-route">
                                    <div className="route-point">
                                        <div className="route-dot origin"></div>
                                        <span>{vessel.currentPort || 'At Sea'}</span>
                                    </div>
                                    <div className="route-line">
                                        <svg viewBox="0 0 100 8" preserveAspectRatio="none">
                                            <path d="M0 4 H100" stroke="url(#route-gradient)" strokeWidth="1.5" strokeDasharray="4 3" />
                                            <defs>
                                                <linearGradient id="route-gradient">
                                                    <stop offset="0%" stopColor="var(--primary)" />
                                                    <stop offset="100%" stopColor="var(--accent)" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                    <div className="route-point">
                                        <div className="route-dot destination"></div>
                                        <span>{vessel.destination}</span>
                                    </div>
                                </div>

                                <div className="vessel-details">
                                    <div className="detail-row">
                                        <span className="detail-label">IMO</span>
                                        <span className="detail-value font-mono">{vessel.imo}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Type</span>
                                        <span className="detail-value">{vessel.type}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Capacity</span>
                                        <span className="detail-value">{vessel.capacity}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Containers</span>
                                        <span className="detail-value">{vessel.cargo.containers.toLocaleString()}</span>
                                    </div>
                                    {vessel.eta && (
                                        <div className="detail-row">
                                            <span className="detail-label">ETA</span>
                                            <span className="detail-value text-accent">{vessel.eta}</span>
                                        </div>
                                    )}
                                    {vessel.etd && (
                                        <div className="detail-row">
                                            <span className="detail-label">ETD</span>
                                            <span className="detail-value text-accent">{vessel.etd}</span>
                                        </div>
                                    )}
                                    {isFlagged && (
                                        <div className="detail-row flag-info-row">
                                            <span className="detail-label">Hold Reason</span>
                                            <span className="detail-value flag-reason-text">{flag.reason}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="vessel-msg">
                                    <span className="msg-label">Last Message</span>
                                    <span className="msg-code font-mono">{vessel.lastMessage}</span>
                                </div>

                                {/* RBAC Action Controls */}
                                {(canChangeStatus || canFlagHold) && (
                                    <div className="vessel-actions">
                                        {canChangeStatus && (
                                            <div className="action-group">
                                                <label className="action-label">Change Status</label>
                                                <select
                                                    className="status-change-select"
                                                    value={vessel.status}
                                                    onChange={e => handleStatusChange(vessel.id, e.target.value)}
                                                    disabled={isFlagged}
                                                    title={isFlagged ? 'Remove hold before changing status' : 'Change vessel status'}
                                                >
                                                    {ALL_STATUSES.map(s => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {canFlagHold && (
                                            <div className="action-group">
                                                {isFlagged ? (
                                                    <button
                                                        className="btn-unflag"
                                                        onClick={() => handleUnflag(vessel.id)}
                                                    >
                                                        ✅ Release Hold
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-flag"
                                                        onClick={() => openFlagDialog(vessel)}
                                                    >
                                                        🚨 Flag / Hold
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
