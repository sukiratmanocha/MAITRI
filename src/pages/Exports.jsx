import { useState, useEffect, useCallback } from 'react';
import { vessels } from '../data/vessels';
import { countries } from '../data/ports';
import { addExport, getUserExports, subscribe } from '../data/tradeStore';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import SlideOverModal from '../components/SlideOverModal';
import './Imports.css';

const statusFilters = ['All', 'In Transit', 'Loading', 'Cleared', 'Pending'];
const statusMap = { 'All': null, 'In Transit': 'in_transit', 'Loading': 'loading', 'Cleared': 'cleared', 'Pending': 'pending' };

const allPorts = countries.flatMap(c => c.ports.map(p => p.name));
const vesselNames = vessels.map(v => v.name);

const emptyForm = {
    vessel: '',
    origin: '',
    destination: '',
    cargoType: '',
    shippingBill: '',
    containers: '',
    weight: '',
    date: new Date().toISOString().slice(0, 10),
};

export default function Exports() {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);
    const [allExports, setAllExports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Fetch all exports from the API
    const fetchExports = useCallback(async () => {
        try {
            const data = await getUserExports();
            setAllExports(data);
        } catch (err) {
            console.error('Failed to load exports:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        fetchExports();
    }, [fetchExports]);

    // Re-fetch when tradeStore fires a change event
    useEffect(() => {
        const unsub = subscribe(() => fetchExports());
        return unsub;
    }, [fetchExports]);

    const filtered = allExports.filter(exp => {
        const matchesSearch = !search ||
            exp.id.toLowerCase().includes(search.toLowerCase()) ||
            exp.vessel.toLowerCase().includes(search.toLowerCase()) ||
            exp.cargoType.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusMap[statusFilter] || exp.status === statusMap[statusFilter];
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: allExports.length,
        loading: allExports.filter(e => e.status === 'loading').length,
        inTransit: allExports.filter(e => e.status === 'in_transit').length,
        cleared: allExports.filter(e => e.status === 'cleared').length,
    };

    // Form handlers
    const updateField = useCallback((field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    }, []);

    function validate() {
        const errs = {};
        if (!form.vessel) errs.vessel = 'Vessel is required';
        if (!form.origin) errs.origin = 'Origin port is required';
        if (!form.destination) errs.destination = 'Destination port is required';
        if (!form.cargoType.trim()) errs.cargoType = 'Cargo type is required';
        if (!form.containers || Number(form.containers) <= 0) errs.containers = 'Enter a valid count';
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setSubmitting(true);
        try {
            const record = await addExport({
                ...form,
                weight: form.weight ? `${form.weight} MT` : '0 MT',
                submittedBy: user?.organization || 'Unknown',
            });
            setSuccess({ id: record.shipmentId || record.id });
            // Refresh the list
            await fetchExports();
        } catch (err) {
            console.error('Failed to submit export:', err);
            setErrors({ submit: err.message || 'Failed to submit. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    }

    function resetForm() {
        setForm({ ...emptyForm });
        setErrors({});
        setSuccess(null);
    }

    function closePanel() {
        setShowForm(false);
        setTimeout(resetForm, 350); // wait for animation
    }

    return (
        <div className="shipments-page">
            <div className="quick-stats stagger-children">
                <div className="quick-stat">
                    <span className="qs-value">{stats.total}</span>
                    <span className="qs-label">Total</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-info">{stats.loading}</span>
                    <span className="qs-label">Loading</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-info">{stats.inTransit}</span>
                    <span className="qs-label">In Transit</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-success">{stats.cleared}</span>
                    <span className="qs-label">Cleared</span>
                </div>
            </div>

            <div className="table-controls">
                <div className="search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by ID, vessel, cargo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="filter-tabs">
                        {statusFilters.map(f => (
                            <button
                                key={f}
                                className={`filter-tab ${statusFilter === f ? 'active' : ''}`}
                                onClick={() => setStatusFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button className="btn-add-shipment" onClick={() => setShowForm(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 5v14m-7-7h14" />
                        </svg>
                        New Export
                    </button>
                </div>
            </div>

            <div className="dash-card" style={{ padding: 0 }}>
                <div className="table-wrap">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            Loading shipments from database…
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Vessel</th>
                                    <th>Origin</th>
                                    <th>Destination</th>
                                    <th>Shipping Bill</th>
                                    <th>Cargo</th>
                                    <th>EGM</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((exp) => (
                                    <tr key={exp.id} className={exp.userSubmitted ? 'user-submitted-row' : ''}>
                                        <td className="font-mono text-accent">
                                            {exp.id}
                                            {exp.userSubmitted && <span className="user-badge" title="User submitted">✦</span>}
                                        </td>
                                        <td><strong>{exp.vessel}</strong></td>
                                        <td>{exp.origin}</td>
                                        <td>{exp.destination}</td>
                                        <td className="font-mono text-muted">{exp.shippingBill}</td>
                                        <td>{exp.cargoType}</td>
                                        <td><StatusBadge status={exp.egmStatus} /></td>
                                        <td><StatusBadge status={exp.status} /></td>
                                        <td className="text-muted">{exp.date}</td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                            No shipments found matching your criteria
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <SlideOverModal open={showForm} onClose={closePanel} title="Add New Export">
                {success ? (
                    <div className="so-success">
                        <div className="so-success-icon">✓</div>
                        <h3>Export Submitted</h3>
                        <p>Your export shipment has been registered successfully.</p>
                        <span className="so-success-id">{success.id}</span>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                            <button className="so-btn-outline" onClick={() => { resetForm(); }}>
                                Add Another
                            </button>
                            <button className="so-btn-outline" onClick={closePanel}>
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="so-form" onSubmit={handleSubmit}>
                        {errors.submit && (
                            <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                                {errors.submit}
                            </div>
                        )}
                        <div className={`so-field ${errors.vessel ? 'has-error' : ''}`}>
                            <label htmlFor="exp-vessel">Vessel</label>
                            <select id="exp-vessel" value={form.vessel} onChange={e => updateField('vessel', e.target.value)}>
                                <option value="">Select vessel…</option>
                                {vesselNames.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            {errors.vessel && <span className="so-error">{errors.vessel}</span>}
                        </div>

                        <div className="so-row">
                            <div className={`so-field ${errors.origin ? 'has-error' : ''}`}>
                                <label htmlFor="exp-origin">Origin Port</label>
                                <select id="exp-origin" value={form.origin} onChange={e => updateField('origin', e.target.value)}>
                                    <option value="">Select port…</option>
                                    {allPorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errors.origin && <span className="so-error">{errors.origin}</span>}
                            </div>
                            <div className={`so-field ${errors.destination ? 'has-error' : ''}`}>
                                <label htmlFor="exp-dest">Destination Port</label>
                                <select id="exp-dest" value={form.destination} onChange={e => updateField('destination', e.target.value)}>
                                    <option value="">Select port…</option>
                                    {allPorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errors.destination && <span className="so-error">{errors.destination}</span>}
                            </div>
                        </div>

                        <div className={`so-field ${errors.cargoType ? 'has-error' : ''}`}>
                            <label htmlFor="exp-cargo">Cargo Type</label>
                            <input
                                id="exp-cargo"
                                type="text"
                                placeholder="e.g. Textiles & Garments"
                                value={form.cargoType}
                                onChange={e => updateField('cargoType', e.target.value)}
                            />
                            {errors.cargoType && <span className="so-error">{errors.cargoType}</span>}
                        </div>

                        <div className="so-field">
                            <label htmlFor="exp-sb">Shipping Bill Number (optional)</label>
                            <input
                                id="exp-sb"
                                type="text"
                                placeholder="Auto-generated if blank"
                                value={form.shippingBill}
                                onChange={e => updateField('shippingBill', e.target.value)}
                            />
                        </div>

                        <div className="so-row">
                            <div className={`so-field ${errors.containers ? 'has-error' : ''}`}>
                                <label htmlFor="exp-containers">Containers</label>
                                <input
                                    id="exp-containers"
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 120"
                                    value={form.containers}
                                    onChange={e => updateField('containers', e.target.value)}
                                />
                                {errors.containers && <span className="so-error">{errors.containers}</span>}
                            </div>
                            <div className="so-field">
                                <label htmlFor="exp-weight">Weight (MT)</label>
                                <input
                                    id="exp-weight"
                                    type="text"
                                    placeholder="e.g. 1,450"
                                    value={form.weight}
                                    onChange={e => updateField('weight', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="so-field">
                            <label htmlFor="exp-date">Date</label>
                            <input
                                id="exp-date"
                                type="date"
                                value={form.date}
                                onChange={e => updateField('date', e.target.value)}
                            />
                        </div>

                        <button type="submit" className="so-submit" disabled={submitting}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 5v14m-7-7h14" />
                            </svg>
                            {submitting ? 'Submitting…' : 'Submit Export'}
                        </button>
                    </form>
                )}
            </SlideOverModal>
        </div>
    );
}
