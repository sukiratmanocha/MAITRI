import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
    {
        path: '/dashboard', label: 'Dashboard',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="10" width="7" height="11" rx="1" /><rect x="3" y="13" width="7" height="8" rx="1" /></svg>
    },
    {
        path: '/imports', label: 'Imports',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
    },
    {
        path: '/exports', label: 'Exports',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21V9m0 0l4 4m-4-4l-4 4" /><path d="M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2" /></svg>
    },
    {
        path: '/vessels', label: 'Vessels',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20l2-3h16l2 3" /><path d="M4 17l1-5h14l1 5" /><path d="M8 12V6h8v6" /><path d="M12 6V3" /></svg>
    },
    {
        path: '/messages', label: 'Data Exchange',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H5.17L4 17.17V4z" rx="2" /><path d="M8 9h8M8 12h4" /></svg>
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
                <div className="logo-icon" onClick={onToggle} title="Toggle sidebar">
                    <svg viewBox="0 0 40 40" fill="none">
                        <defs>
                            <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                        <path d="M8 32V8l12 12L32 8v24" stroke="url(#logo-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 20l12-12" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                </div>
                {!collapsed && (
                    <div className="logo-text">
                        <span className="logo-name">MAITRI</span>
                        <span className="logo-subtitle">Virtual Trade Corridor</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {!collapsed && <div className="nav-section-label">Main Menu</div>}
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {!collapsed && (
                    <p className="sidebar-copyright">© 2026 RITES Ltd.</p>
                )}
            </div>
        </aside>
    );
}
