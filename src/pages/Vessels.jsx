import { useState, useMemo } from 'react';
import { useFeed } from '../context/LiveFeedContext';
import StatusBadge from '../components/StatusBadge';
import './Vessels.css';

const statusTabs = ['All', 'At Port', 'In Transit', 'Loading', 'Arriving Soon'];
const statusMap = { 'All': null, 'At Port': 'at_port', 'In Transit': 'in_transit', 'Loading': 'loading', 'Arriving Soon': 'arriving_soon' };

const SORT_OPTIONS = [
    { label: 'Default', value: 'default' },
    { label: 'ETA (Earliest)', value: 'eta_asc' },
    { label: 'Capacity (Largest)', value: 'capacity_desc' },
    { label: 'Containers (Most)', value: 'containers_desc' },
    { label: 'Name (A–Z)', value: 'name_asc' },
];

export default function Vessels() {
    const { vessels } = useFeed();
    const [tab, setTab] = useState('All');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('default');

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

    return (
        <div className="vessels-page">
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
                    {filtered.map(vessel => (
                        <div key={vessel.id} className={`vessel-card vessel-${vessel.status}`}>
                            <div className="vessel-top">
                                <div className="vessel-name-row">
                                    <h3>{vessel.name}</h3>
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
                            </div>

                            <div className="vessel-msg">
                                <span className="msg-label">Last Message</span>
                                <span className="msg-code font-mono">{vessel.lastMessage}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
