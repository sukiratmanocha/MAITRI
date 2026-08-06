import { useState, useEffect } from 'react';
import { useFeed } from '../context/LiveFeedContext';
import { fetchExchangeRates } from '../services/ratesService';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PortWeather from '../components/PortWeather';
import './Dashboard.css';

export default function Dashboard() {
    const { stats, vessels, recentActivity, lastUpdated, refresh, monthlyVolume, imports, exports } = useFeed();

    const [rates, setRates] = useState(null);
    const [ratesLoading, setRatesLoading] = useState(true);
    const [tableVisible, setTableVisible] = useState(true);
    const [tablePage, setTablePage] = useState(0);

    const recentShipments = [...imports.slice(0, 3), ...exports.slice(0, 2)];
    const maxVolume = Math.max(...monthlyVolume.flatMap(d => [d.imports, d.exports]));

    // Format last updated as "HH:MM:SS"
    const lastUpdatedStr = lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Fetch exchange rates on mount, then every 60 seconds
    useEffect(() => {
        async function loadRates() {
            try {
                const r = await fetchExchangeRates();
                setRates(r);
            } catch {
                setRates(null);
            } finally {
                setRatesLoading(false);
            }
        }
        loadRates();
        const id = setInterval(loadRates, 60 * 1000);
        return () => clearInterval(id);
    }, []);

    function handleRefresh() {
        setTableVisible(false);
        setTimeout(() => {
            refresh();
            setTablePage(p => p + 1);
            setTableVisible(true);
        }, 300);
    }

    return (
        <div className="dashboard-page">
            <PortWeather />

            {/* Exchange Rate Ticker */}
            <div className="rates-ticker">
                <span className="rates-label">💱 Live Rates</span>
                {ratesLoading ? (
                    <span className="rates-skeleton" />
                ) : rates ? (
                    <>
                        <span className="rates-item">
                            <span className="rates-pair">INR / AED</span>
                            <span className="rates-value">{(rates.aed * 100).toFixed(4)}</span>
                            <span className="rates-unit">per ₹100</span>
                        </span>
                        <span className="rates-divider">·</span>
                        <span className="rates-item">
                            <span className="rates-pair">INR / USD</span>
                            <span className="rates-value">{(rates.usd * 100).toFixed(4)}</span>
                            <span className="rates-unit">per ₹100</span>
                        </span>
                        <span className="rates-divider">·</span>
                        <span className="rates-refreshed">
                            Updated {new Date(rates.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </>
                ) : (
                    <span className="rates-error">Exchange rates unavailable</span>
                )}
            </div>

            <div className="stats-header">
                <div className="stats-grid stagger-children">
                    <StatCard icon="📥" label="Total Imports" value={stats.totalImports} sub="Active shipments" color="green" />
                    <StatCard icon="📦" label="Total Exports" value={stats.totalExports} sub="Active shipments" color="blue" />
                    <StatCard icon="🚢" label="Active Vessels" value={stats.activeVessels} sub="In transit / At port" color="orange" />
                    <StatCard icon="💬" label="Messages" value={stats.messagesExchanged} sub="Data exchange volume" color="purple" trend={12} />
                </div>
                <div className="stats-footer">
                    <span className="last-updated">
                        <span className="live-dot" /> Live · Last updated {lastUpdatedStr}
                    </span>
                    <button className="btn-refresh" onClick={handleRefresh} title="Refresh data">
                        ↻ Refresh
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="dash-card chart-card">
                    <div className="card-header">
                        <h3>Monthly Trade Volume</h3>
                        <div className="chart-legend">
                            <span className="legend-item"><span className="legend-dot imports"></span>Imports</span>
                            <span className="legend-item"><span className="legend-dot exports"></span>Exports</span>
                        </div>
                    </div>
                    <div className="chart-area">
                        {monthlyVolume.map((data, i) => (
                            <div key={i} className="chart-col">
                                <div className="chart-bars">
                                    <div
                                        className="bar bar-imports"
                                        style={{ height: `${(data.imports / maxVolume) * 100}%` }}
                                        title={`Imports: ${data.imports}`}
                                    >
                                        <span className="bar-tooltip">{data.imports}</span>
                                    </div>
                                    <div
                                        className="bar bar-exports"
                                        style={{ height: `${(data.exports / maxVolume) * 100}%` }}
                                        title={`Exports: ${data.exports}`}
                                    >
                                        <span className="bar-tooltip">{data.exports}</span>
                                    </div>
                                </div>
                                <span className="chart-label">{data.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dash-card activity-card">
                    <div className="card-header">
                        <h3>Recent Activity</h3>
                        <span className="badge-live">
                            <span className="live-dot"></span>
                            Live
                        </span>
                    </div>
                    <div className="activity-feed">
                        {recentActivity.map((msg, i) => (
                            <div key={msg.id} className="activity-item" style={{ animationDelay: `${i * 0.06}s` }}>
                                <div className="activity-line"></div>
                                <div className="activity-dot"></div>
                                <div className="activity-content">
                                    <div className="activity-top">
                                        <span className="activity-type">{msg.type}</span>
                                        <span className="activity-time">{msg.timestamp.split(' ')[1]}</span>
                                    </div>
                                    <p className="activity-desc">
                                        {msg.from} → {msg.to} <span className="text-muted">· {msg.vessel}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="dash-card">
                <div className="card-header">
                    <h3>Recent Shipments</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="text-muted" style={{ fontSize: '12px' }}>{recentShipments.length} shown</span>
                        <button className="btn-refresh" onClick={handleRefresh}>↻ Refresh</button>
                    </div>
                </div>
                <div className="table-wrap" style={{ opacity: tableVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Vessel</th>
                                <th>Route</th>
                                <th>Cargo</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentShipments.map((s) => (
                                <tr key={`${s.id}-${tablePage}`}>
                                    <td className="font-mono text-accent">{s.id}</td>
                                    <td><strong>{s.vessel}</strong></td>
                                    <td className="text-secondary">{s.origin} → {s.destination}</td>
                                    <td>{s.cargoType}</td>
                                    <td><StatusBadge status={s.status} /></td>
                                    <td className="text-muted">{s.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
