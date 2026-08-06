import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'maitri_user';

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function initials(name) {
    return name
        .split(/[\s(]/)[0]
        .slice(0, 2)
        .toUpperCase();
}

/**
 * Role-based permissions matrix.
 * Determines what actions each role can perform across the app.
 */
const ROLE_PERMISSIONS = {
    'Port Authority': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: true,
        canViewAllShipments: true,
        canManageVessels: true,
        canApproveBerth: true,
        canMessage: true,
        canViewCustomsData: false,
        dashboardFocus: 'operations',
        icon: '🏗️',
        color: '#2563eb',
    },
    'Customs Officer': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: true,
        canViewAllShipments: true,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canInspect: true,
        canFlagHold: true,
        canViewCustomsData: true,
        dashboardFocus: 'compliance',
        icon: '🛃',
        color: '#7c3aed',
    },
    'Customs Superintendent': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: true,
        canViewAllShipments: true,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canInspect: true,
        canFlagHold: true,
        canOverrideHold: true,
        canViewCustomsData: true,
        dashboardFocus: 'compliance',
        icon: '👔',
        color: '#6d28d9',
    },
    'Shipping Line': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: false,
        canViewAllShipments: true,
        canManageVessels: true,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: false,
        canUpdateManifest: true,
        dashboardFocus: 'vessels',
        icon: '🚢',
        color: '#0891b2',
    },
    'Exporter': {
        canSubmitImports: false,
        canSubmitExports: true,
        canChangeStatus: false,
        canViewAllShipments: false,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: false,
        dashboardFocus: 'trade',
        icon: '📦',
        color: '#059669',
    },
    'Importer': {
        canSubmitImports: true,
        canSubmitExports: false,
        canChangeStatus: false,
        canViewAllShipments: false,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: false,
        dashboardFocus: 'trade',
        icon: '📥',
        color: '#16a34a',
    },
    'CHA (Customs House Agent)': {
        canSubmitImports: true,
        canSubmitExports: true,
        canChangeStatus: false,
        canViewAllShipments: true,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: true,
        canFileDocs: true,
        dashboardFocus: 'documentation',
        icon: '📋',
        color: '#d97706',
    },
    'Terminal Operator': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: true,
        canViewAllShipments: true,
        canManageVessels: true,
        canApproveBerth: true,
        canMessage: true,
        canViewCustomsData: false,
        canManageContainers: true,
        dashboardFocus: 'operations',
        icon: '🏭',
        color: '#ea580c',
    },
    'Freight Forwarder': {
        canSubmitImports: true,
        canSubmitExports: true,
        canChangeStatus: false,
        canViewAllShipments: true,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: false,
        dashboardFocus: 'logistics',
        icon: '🚛',
        color: '#0d9488',
    },
    'Trade Finance (Bank)': {
        canSubmitImports: false,
        canSubmitExports: false,
        canChangeStatus: false,
        canViewAllShipments: true,
        canManageVessels: false,
        canApproveBerth: false,
        canMessage: true,
        canViewCustomsData: false,
        canViewFinance: true,
        dashboardFocus: 'finance',
        icon: '🏦',
        color: '#4f46e5',
    },
};

export { ROLE_PERMISSIONS };

function buildOrgName(role, port, orgName) {
    if (orgName && orgName.trim()) return orgName.trim();
    const portShort = port.split('(')[0].trim();
    return `${portShort} ${role}`;
}

function buildUserId(role, port, orgName) {
    const base = orgName && orgName.trim() ? orgName.trim() : `${role}-${port}`;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => loadFromStorage());

    const login = useCallback(({ role, port, organization: orgName, department }) => {
        const permissions = ROLE_PERMISSIONS[role] || {};
        const organization = buildOrgName(role, port, orgName);
        const newUser = {
            role,
            port,
            department: department || '',
            avatar: initials(orgName || role),
            organization,
            userId: buildUserId(role, port, orgName),
            permissions,
            roleIcon: permissions.icon || '👤',
            roleColor: permissions.color || '#64748b',
            loginAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
    }, []);

    /** Quick permission check helper */
    const can = useCallback((permission) => {
        return user?.permissions?.[permission] === true;
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, can }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
