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

const DEMO_ACCOUNTS = [
    { label: 'Tata International', role: 'Exporter', port: 'JNPA (Nhava Sheva)', org: 'Tata International', icon: '📦' },
    { label: 'Indian Customs', role: 'Customs Officer', port: 'JNPA (Nhava Sheva)', org: 'Indian Customs (ICEGATE)', icon: '🛃' },
    { label: 'Maersk Line', role: 'Shipping Line', port: 'JNPA (Nhava Sheva)', org: 'Maersk Line', icon: '🚢' },
    { label: 'JNPA Port Auth', role: 'Port Authority', port: 'JNPA (Nhava Sheva)', org: 'JNPA Port Authority', icon: '🏗️' },
    { label: 'Reliance Ind.', role: 'Importer', port: 'JNPA (Nhava Sheva)', org: 'Reliance Industries', icon: '📥' },
    { label: 'Adani CHA', role: 'CHA (Customs House Agent)', port: 'Kandla', org: 'Adani CHA Services', icon: '📋' },
];

export default function Login() {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [role, setRole] = useState(ROLES[0]);
    const [port, setPort] = useState(PORTS[0].name);
    const [orgName, setOrgName] = useState('');
    const [department, setDepartment] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
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

    function selectDemoAccount(acc) {
        setRole(acc.role);
        setPort(acc.port);
        setOrgName(acc.org);
        setPassword('0000');
        setPasswordError('');
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (!password.trim()) {
            setPasswordError('Password is required to log in.');
            return;
        }

        if (password.trim() !== '0000') {
            setPasswordError("Invalid password. Prototype password is '0000'.");
            return;
        }

        setPasswordError('');
        setLoading(true);

        setTimeout(() => {
            login({ role, port, organization: orgName, department });
            navigate('/dashboard');
        }, 350);
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
                    {passwordError && (
                        <div className="login-error-alert" role="alert">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{passwordError}</span>
                        </div>
                    )}

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

                <div className="feature-list">
                  <h2 className="feature-title">Available Actions</h2>
                  <ul className="feature-items">
                    {rolePerms.canChangeStatus && (
                      <li className="feature-item">Change Vessel Status</li>
                    )}
                    {rolePerms.canFlagHold && (
                      <li className="feature-item">Flag/Hold Vessels</li>
                    )}
                  </ul>
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
                            <label htmlFor="dept-select">Department</label>
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

                    {/* Password Field with Prototype Passcode */}
                    <div className="form-group">
                        <div className="label-with-hint">
                            <label htmlFor="password-input">
                                Password <span className="req-star">*</span>
                            </label>
                            <span className="prototype-pill">Passcode: 0000</span>
                        </div>
                        <div className={`password-input-wrap ${passwordError ? 'has-error' : ''}`}>
                            <svg className="input-icon-lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <input
                                id="password-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter prototype password (0000)"
                                value={password}
                                onChange={e => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError('');
                                }}
                                disabled={loading}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(p => !p)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                tabIndex="-1"
                            >
                                {showPassword ? (
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

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
