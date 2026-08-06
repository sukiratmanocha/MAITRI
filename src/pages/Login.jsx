import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext';
import './Login.css';

const ROLES = Object.keys(ROLE_PERMISSIONS);

const PORTS = [
    { name: 'JNPA (Nhava Sheva)', country: '🇮🇳 India' },
    { name: 'DPA (Deendayal Port)', country: '🇮🇳 India' },
    { name: 'Kandla', country: '🇮🇳 India' },
    { name: 'Mumbai Port', country: '🇮🇳 India' },
    { name: 'Mundra', country: '🇮🇳 India' },
    { name: 'Jebel Ali', country: '🇦🇪 UAE' },
    { name: 'Khalifa Port', country: '🇦🇪 UAE' },
    { name: 'Fujairah', country: '🇦🇪 UAE' },
    { name: 'Khor Fakkan', country: '🇦🇪 UAE' },
];

const DEPARTMENTS = {
    'Port Authority': ['Harbor Master', 'Marine Operations', 'Traffic Control', 'Safety & Security', 'Commercial'],
    'Customs Officer': ['Assessment', 'Examination', 'Preventive', 'Audit', 'Valuation'],
    'Customs Superintendent': ['Assessment Wing', 'Preventive Wing', 'Audit Wing', 'Appeals'],
    'Shipping Line': ['Operations', 'Documentation', 'Commercial', 'Equipment Control'],
    'Exporter': ['Shipping', 'Documentation', 'Quality Control', 'Logistics'],
    'Importer': ['Procurement', 'Logistics', 'Quality Assurance', 'Clearance'],
    'CHA (Customs House Agent)': ['Clearance', 'Documentation', 'Compliance', 'Advisory'],
    'Terminal Operator': ['Yard Operations', 'Vessel Operations', 'Gate Operations', 'Equipment'],
    'Freight Forwarder': ['Sea Freight', 'Air Freight', 'Land Transport', 'Customs Brokerage'],
    'Trade Finance (Bank)': ['Letter of Credit', 'Trade Documentation', 'Risk Assessment', 'Compliance'],
};

export default function Login() {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [role, setRole] = useState(ROLES[0]);
    const [port, setPort] = useState(PORTS[0].name);
    const [orgName, setOrgName] = useState('');
    const [department, setDepartment] = useState('');
    const [loading, setLoading] = useState(false);

    const rolePerms = ROLE_PERMISSIONS[role] || {};
    const departments = DEPARTMENTS[role] || [];

    // If already logged in, redirect directly
    useEffect(() => {
        if (user) navigate('/dashboard', { replace: true });
    }, [user, navigate]);

    // Reset department when role changes
    useEffect(() => {
        setDepartment('');
    }, [role]);

    function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            login({ role, port, organization: orgName, department });
            navigate('/dashboard');
        }, 400);
    }

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
                <div className="bg-grid"></div>
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <svg viewBox="0 0 48 48" fill="none">
                            <defs>
                                <linearGradient id="login-logo-grad" x1="0" y1="0" x2="48" y2="48">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                            <path d="M10 38V10l14 14L38 10v28" stroke="url(#login-logo-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M24 24l14-14" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h1 className="login-title">MAITRI</h1>
                    <p className="login-subtitle">Maritime Alliance for Integrated Trade Route Intelligence</p>
                    <div className="login-corridor">
                        <span>🇮🇳</span>
                        <span className="corridor-dash"></span>
                        <span>Virtual Trade Corridor</span>
                        <span className="corridor-dash"></span>
                        <span>🇦🇪</span>
                    </div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="role-select">Select Your Role</label>
                        <select
                            id="role-select"
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            disabled={loading}
                        >
                            {ROLES.map(r => (
                                <option key={r} value={r}>
                                    {ROLE_PERMISSIONS[r]?.icon} {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="role-info-card" style={{ borderLeftColor: rolePerms.color }}>
                        <span className="role-info-icon">{rolePerms.icon}</span>
                        <div className="role-info-details">
                            <span className="role-info-name">{role}</span>
                            <div className="role-info-perms">
                                {rolePerms.canSubmitExports && <span className="perm-tag perm-green">Submit Exports</span>}
                                {rolePerms.canSubmitImports && <span className="perm-tag perm-green">Submit Imports</span>}
                                {rolePerms.canChangeStatus && <span className="perm-tag perm-blue">Change Status</span>}
                                {rolePerms.canInspect && <span className="perm-tag perm-purple">Inspect</span>}
                                {rolePerms.canFlagHold && <span className="perm-tag perm-red">Flag Hold</span>}
                                {rolePerms.canManageVessels && <span className="perm-tag perm-cyan">Manage Vessels</span>}
                                {rolePerms.canViewAllShipments && <span className="perm-tag perm-slate">View All</span>}
                                {rolePerms.canFileDocs && <span className="perm-tag perm-amber">File Docs</span>}
                                {rolePerms.canViewFinance && <span className="perm-tag perm-indigo">View Finance</span>}
                                {rolePerms.canMessage && <span className="perm-tag perm-slate">Messaging</span>}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="port-select">Select Port / Location</label>
                        <select
                            id="port-select"
                            value={port}
                            onChange={e => setPort(e.target.value)}
                            disabled={loading}
                        >
                            {PORTS.map(p => (
                                <option key={p.name} value={p.name}>
                                    {p.country} — {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="org-name">Organisation Name</label>
                        <input
                            id="org-name"
                            type="text"
                            placeholder={`e.g. ${role === 'Exporter' ? 'Tata International' : role === 'Shipping Line' ? 'Maersk Line' : role === 'CHA (Customs House Agent)' ? 'ABC CHA Services' : 'Your Organisation'}`}
                            value={orgName}
                            onChange={e => setOrgName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {departments.length > 0 && (
                        <div className="form-group">
                            <label htmlFor="dept-select">Department </label>
                            <select
                                id="dept-select"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                disabled={loading}
                            >
                                <option value="">— Select department —</option>
                                {departments.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button type="submit" className={`login-btn ${loading ? 'loading' : ''}`} disabled={loading}>
                        {loading ? (
                            <span className="btn-spinner" />
                        ) : (
                            <>
                                Enter Portal
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M5 12h14m-6-6l6 6-6 6" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                <p className="login-footer">2026 RITES Ltd. — India-Middle East-Europe Economic Corridor</p>
            </div>
        </div>
    );
}
