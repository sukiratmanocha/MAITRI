import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className={`layout-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
            />
            <div className="layout-main">
                <Topbar
                    onMenuToggle={() => setCollapsed(!collapsed)}
                />
                <main className="layout-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
