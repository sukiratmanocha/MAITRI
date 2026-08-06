import { useState, useEffect, useCallback } from 'react';
import { imports as seedImports } from '../data/shipments';
import { vessels } from '../data/vessels';
import { countries } from '../data/ports';
import { addImport, getUserImports, subscribe } from '../data/tradeStore';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import SlideOverModal from '../components/SlideOverModal';
import './Imports.css';

const statusFilters = ['All', 'In Transit', 'Cleared', 'Pending', 'Customs Hold'];
const statusMap = { 'All': null, 'In Transit': 'in_transit', 'Cleared': 'cleared', 'Pending': 'pending', 'Customs Hold': 'under_inspection' };

const allPorts = countries.flatMap(c => c.ports.map(p => p.name));
const vesselNames = vessels.map(v => v.name);

const emptyForm = {
    vessel: '',
    origin: '',
    destination: '',
    cargoType: '',
    billOfEntry: '',
    containers: '',
    weight: '',
    date: new Date().toISOString().slice(0, 10),
};

export default function Imports() {
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...emptyForm });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);
    const [userImports, setUserImports] = useState(() => getUserImports());

    // Subscribe to store changes
    useEffect(() => {
        const unsub = subscribe(() => setUserImports(getUserImports()));
        return unsub;
    }, []);

    // Merge seed data + user-submitted data
    const allImports = [...userImports, ...seedImports];

    const filtered = allImports.filter(imp => {
        const matchesSearch = !search ||
            imp.id.toLowerCase().includes(search.toLowerCase()) ||
            imp.vessel.toLowerCase().includes(search.toLowerCase()) ||
            imp.cargoType.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusMap[statusFilter] || imp.status === statusMap[statusFilter];
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: allImports.length,
        inTransit: allImports.filter(i => i.status === 'in_transit').length,
        cleared: allImports.filter(i => i.status === 'cleared').length,
        pending: allImports.filter(i => i.status === 'pending' || i.status === 'under_inspection').length,
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

    function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        const record = addImport({
            ...form,
            weight: form.weight ? `${form.weight} MT` : '0 MT',
            submittedBy: user?.organization || 'Unknown',
        });
        setSuccess(record);
    }

    function resetForm() {
        setForm({ ...emptyForm });
        setErrors({});
        setSuccess(null);
    }

    function closePanel() {
        setShowForm(false);
        setTimeout(resetForm, 350);
    }

    return (
        <div className="shipments-page">
            <div className="quick-stats stagger-children">
                <div className="quick-stat">
                    <span className="qs-value">{stats.total}</span>
                    <span className="qs-label">Total</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-info">{stats.inTransit}</span>
                    <span className="qs-label">In Transit</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-success">{stats.cleared}</span>
                    <span className="qs-label">Cleared</span>
                </div>
                <div className="quick-stat">
                    <span className="qs-value text-warning">{stats.pending}</span>
                    <span className="qs-label">Pending</span>
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
                        New Import
                    </button>
                </div>
            </div>

            <div className="dash-card" style={{ padding: 0 }}>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Vessel</th>
                                <th>Origin</th>
                                <th>Destination</th>
                                <th>Bill of Entry</th>
                                <th>Cargo</th>
                                <th>Containers</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((imp) => (
                                <tr key={imp.id} className={imp.userSubmitted ? 'user-submitted-row' : ''}>
                                    <td className="font-mono text-accent">
                                        {imp.id}
                                        {imp.userSubmitted && <span className="user-badge" title="User submitted">✦</span>}
                                    </td>
                                    <td><strong>{imp.vessel}</strong></td>
                                    <td>{imp.origin}</td>
                                    <td>{imp.destination}</td>
                                    <td className="font-mono text-muted">{imp.billOfEntry}</td>
                                    <td>{imp.cargoType}</td>
                                    <td className="text-secondary">{imp.containers}</td>
                                    <td><StatusBadge status={imp.status} /></td>
                                    <td className="text-muted">{imp.date}</td>
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
                </div>
            </div>

            <SlideOverModal open={showForm} onClose={closePanel} title="Add New Import">
                {success ? (
                    <div className="so-success">
                        <div className="so-success-icon">✓</div>
                        <h3>Import Submitted</h3>
                        <p>Your import shipment has been registered successfully.</p>
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
                        <div className={`so-field ${errors.vessel ? 'has-error' : ''}`}>
                            <label htmlFor="imp-vessel">Vessel</label>
                            <select id="imp-vessel" value={form.vessel} onChange={e => updateField('vessel', e.target.value)}>
                                <option value="">Select vessel…</option>
                                {vesselNames.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            {errors.vessel && <span className="so-error">{errors.vessel}</span>}
                        </div>

                        <div className="so-row">
                            <div className={`so-field ${errors.origin ? 'has-error' : ''}`}>
                                <label htmlFor="imp-origin">Origin Port</label>
                                <select id="imp-origin" value={form.origin} onChange={e => updateField('origin', e.target.value)}>
                                    <option value="">Select port…</option>
                                    {allPorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errors.origin && <span className="so-error">{errors.origin}</span>}
                            </div>
                            <div className={`so-field ${errors.destination ? 'has-error' : ''}`}>
                                <label htmlFor="imp-dest">Destination Port</label>
                                <select id="imp-dest" value={form.destination} onChange={e => updateField('destination', e.target.value)}>
                                    <option value="">Select port…</option>
                                    {allPorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errors.destination && <span className="so-error">{errors.destination}</span>}
                            </div>
                        </div>

                        <div className={`so-field ${errors.cargoType ? 'has-error' : ''}`}>
                            <label htmlFor="imp-cargo">Cargo Type</label>
                            <input
                                id="imp-cargo"
                                type="text"
                                placeholder="e.g. Electronics, Machinery"
                                value={form.cargoType}
                                onChange={e => updateField('cargoType', e.target.value)}
                            />
                            {errors.cargoType && <span className="so-error">{errors.cargoType}</span>}
                        </div>

                        <div className="so-field">
                            <label htmlFor="imp-boe">Bill of Entry Number (optional)</label>
                            <input
                                id="imp-boe"
                                type="text"
                                placeholder="Auto-generated if blank"
                                value={form.billOfEntry}
                                onChange={e => updateField('billOfEntry', e.target.value)}
                            />
                        </div>

                        <div className="so-row">
                            <div className={`so-field ${errors.containers ? 'has-error' : ''}`}>
                                <label htmlFor="imp-containers">Containers</label>
                                <input
                                    id="imp-containers"
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 120"
                                    value={form.containers}
                                    onChange={e => updateField('containers', e.target.value)}
                                />
                                {errors.containers && <span className="so-error">{errors.containers}</span>}
                            </div>
                            <div className="so-field">
                                <label htmlFor="imp-weight">Weight (MT)</label>
                                <input
                                    id="imp-weight"
                                    type="text"
                                    placeholder="e.g. 1,450"
                                    value={form.weight}
                                    onChange={e => updateField('weight', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="so-field">
                            <label htmlFor="imp-date">Date</label>
                            <input
                                id="imp-date"
                                type="date"
                                value={form.date}
                                onChange={e => updateField('date', e.target.value)}
                            />
                        </div>

                        <button type="submit" className="so-submit">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M12 5v14m-7-7h14" />
                            </svg>
                            Submit Import
                        </button>
                    </form>
                )}
            </SlideOverModal>
        </div>
    );
}
