import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardStats, monthlyVolume } from '../data/shipments';
import { vessels as seedVessels } from '../data/vessels';
import { messageExchangeLog } from '../data/messages';
import { getUserImports, getUserExports, subscribe } from '../data/tradeStore';

// ── Persistence helpers ────────────────────────────────────────────────────────
const LS_FLAGS_KEY = 'maitri_vessel_flags';
const LS_STATUSES_KEY = 'maitri_vessel_statuses';

function loadFlags() {
    try { return JSON.parse(localStorage.getItem(LS_FLAGS_KEY) || '{}'); } catch { return {}; }
}
function saveFlags(flags) {
    try { localStorage.setItem(LS_FLAGS_KEY, JSON.stringify(flags)); } catch { }
}
function loadStatuses() {
    try { return JSON.parse(localStorage.getItem(LS_STATUSES_KEY) || '{}'); } catch { return {}; }
}
function saveStatuses(statuses) {
    try { localStorage.setItem(LS_STATUSES_KEY, JSON.stringify(statuses)); } catch { }
}

/** Apply persisted status/flag overrides on top of seed vessels */
function applyPersistedOverrides(seed, flags, statuses) {
    return seed.map(v => ({
        ...v,
        ...(statuses[v.id] !== undefined ? { status: statuses[v.id] } : {}),
        ...(flags[v.id] ? { flagged: true } : { flagged: false }),
    }));
}

// ── Status machine ─────────────────────────────────────────────────────────────
const STATUS_CYCLE = {
    in_transit: 'arriving_soon',
    arriving_soon: 'at_port',
    at_port: 'loading',
    loading: 'in_transit',
};

const STATUS_LABELS = {
    in_transit: 'In Transit',
    arriving_soon: 'Arriving Soon',
    at_port: 'At Port',
    loading: 'Loading',
};

// ── Notification types ─────────────────────────────────────────────────────────
const NOTIFICATION_TYPE = {
    loading_in_transit: 'departure',       // ship leaves port
    in_transit_arriving_soon: 'arrival',   // ship nearing destination
    arriving_soon_at_port: 'arrival',      // ship docked
    at_port_loading: 'loading',            // ship loading cargo
};

// ── Message feed helpers ───────────────────────────────────────────────────────
const MSG_TYPES = ['BAPLIE', 'MOVINS', 'IFTDGN', 'CUSREP', 'COARRI', 'CODECO', 'VESDEP', 'ETAETD', 'CALINF'];
const PORTS_IND = ['JNPA', 'Kandla', 'DPA', 'Mumbai'];
const PORTS_UAE = ['Jebel Ali', 'Khalifa', 'Khor Fakkan', 'Fujairah'];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function generateActivityItem(id) {
    const fromIndia = Math.random() > 0.5;
    const from = fromIndia ? PORTS_IND[randomInt(0, 3)] : PORTS_UAE[randomInt(0, 3)];
    const to = fromIndia ? PORTS_UAE[randomInt(0, 3)] : PORTS_IND[randomInt(0, 3)];
    const vessel = seedVessels[randomInt(0, seedVessels.length - 1)].name;
    const type = MSG_TYPES[randomInt(0, MSG_TYPES.length - 1)];
    return { id: `live-${id}`, type, from, to, vessel, timestamp: nowTimestamp() };
}

function buildNotification(id, vessel, fromStatus, toStatus) {
    const key = `${fromStatus}_${toStatus}`;
    const notifType = NOTIFICATION_TYPE[key] || 'update';
    const icons = { departure: '🛳️', arrival: '⚓', loading: '📦', update: '🔔' };
    const messages = {
        departure: `${vessel.name} has departed from ${vessel.currentPort || 'port'} en route to ${vessel.destination}`,
        arrival: `${vessel.name} is ${toStatus === 'arriving_soon' ? 'approaching' : 'now docked at'} ${vessel.destination}`,
        loading: `${vessel.name} has begun loading cargo at ${vessel.destination}`,
        update: `${vessel.name} status changed: ${STATUS_LABELS[fromStatus]} → ${STATUS_LABELS[toStatus]}`,
    };
    return {
        id: `notif-${id}`,
        type: notifType,
        icon: icons[notifType],
        vesselName: vessel.name,
        vesselId: vessel.id,
        fromStatus,
        toStatus,
        port: vessel.currentPort || vessel.destination || 'N/A',
        message: messages[notifType],
        timestamp: nowTimestamp(),
        read: false,
    };
}

// ── Hook ────────────────────────────────────────────────────────────────────────
export function useLiveFeed() {
    const [stats, setStats] = useState({ ...dashboardStats, containersProcessed: 2840 });
    // Initialize vessels with any persisted status/flag overrides from localStorage
    const [vessels, setVessels] = useState(() => {
        const flags = loadFlags();
        const statuses = loadStatuses();
        return applyPersistedOverrides([...seedVessels], flags, statuses);
    });
    const [recentActivity, setRecentActivity] = useState(messageExchangeLog.slice(0, 6));
    const [notifications, setNotifications] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [storeVersion, setStoreVersion] = useState(0);
    const [allImports, setAllImports] = useState([]);
    const [allExports, setAllExports] = useState([]);
    // Track flagged/held vessels — initialised from localStorage
    const [vesselFlags, setVesselFlags] = useState(() => loadFlags());
    const counterRef = useRef(1000);

    // Subscribe to tradeStore changes to trigger re-reads
    useEffect(() => {
        const unsub = subscribe(() => setStoreVersion(v => v + 1));
        return unsub;
    }, []);

    // Fetch imports and exports from the API
    useEffect(() => {
        let cancelled = false;

        async function fetchData() {
            try {
                const [imps, exps] = await Promise.all([
                    getUserImports(),
                    getUserExports(),
                ]);
                if (!cancelled) {
                    setAllImports(imps);
                    setAllExports(exps);
                }
            } catch (err) {
                console.error('useLiveFeed: failed to fetch shipments', err);
            }
        }

        fetchData();
        return () => { cancelled = true; };
    }, [storeVersion]);

    // Update stats to reflect API data
    const mergedStats = {
        ...stats,
        totalImports: allImports.length,
        totalExports: allExports.length,
    };

    const tick = useCallback(() => {
        counterRef.current += 1;
        const id = counterRef.current;

        // Nudge stats
        setStats(prev => ({
            ...prev,
            messagesExchanged: prev.messagesExchanged + randomInt(1, 5),
            containersProcessed: prev.containersProcessed + randomInt(1, 3),
        }));

        // Advance one vessel's status (30% chance)
        if (Math.random() < 0.30) {
            setVessels(prev => {
                const idx = randomInt(0, prev.length - 1);
                const vessel = prev[idx];
                const nextStatus = STATUS_CYCLE[vessel.status] || vessel.status;
                if (nextStatus === vessel.status) return prev;

                // Emit notification
                const notif = buildNotification(id, vessel, vessel.status, nextStatus);
                setNotifications(n => [notif, ...n].slice(0, 50));

                const updated = [...prev];
                updated[idx] = { ...vessel, status: nextStatus };
                return updated;
            });
        }

        // Add a live activity message
        setRecentActivity(prev => [generateActivityItem(id), ...prev].slice(0, 6));
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        const interval = setInterval(tick, 8000);
        return () => clearInterval(interval);
    }, [tick]);

    const refresh = useCallback(() => tick(), [tick]);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const markRead = useCallback((notifId) => {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    }, []);

    /**
     * Change a vessel's status in real-time (RBAC action).
     * Emits a notification and persists the override to localStorage.
     */
    const changeVesselStatus = useCallback((vesselId, newStatus, changedBy) => {
        counterRef.current += 1;
        const id = counterRef.current;
        setVessels(prev => {
            const idx = prev.findIndex(v => v.id === vesselId);
            if (idx === -1) return prev;
            const vessel = prev[idx];
            if (vessel.status === newStatus) return prev;
            // Emit notification for manual status change
            const notif = buildNotification(id, vessel, vessel.status, newStatus);
            notif.message = `[Manual] ${notif.message}${changedBy ? ` (by ${changedBy})` : ''}`;
            notif.manualChange = true;
            setNotifications(n => [notif, ...n].slice(0, 50));
            const updated = [...prev];
            updated[idx] = { ...vessel, status: newStatus };
            // Persist the new status override
            const saved = loadStatuses();
            saved[vesselId] = newStatus;
            saveStatuses(saved);
            return updated;
        });
        setLastUpdated(new Date());
    }, []);

    /**
     * Flag / hold a vessel (Customs RBAC action). Persisted to localStorage.
     */
    const flagVessel = useCallback((vesselId, reason, flaggedBy) => {
        counterRef.current += 1;
        const id = counterRef.current;
        const flagEntry = { flagged: true, reason: reason || 'Under Inspection', by: flaggedBy || 'Customs', at: nowTimestamp() };
        setVesselFlags(prev => {
            const next = { ...prev, [vesselId]: flagEntry };
            saveFlags(next);
            return next;
        });
        // Also lock status to at_port and persist
        setVessels(prev => {
            const idx = prev.findIndex(v => v.id === vesselId);
            if (idx === -1) return prev;
            const vessel = prev[idx];
            const prevStatus = vessel.status;
            const updated = [...prev];
            updated[idx] = { ...vessel, status: 'at_port', flagged: true };
            // Persist status override
            const saved = loadStatuses();
            saved[vesselId] = 'at_port';
            saveStatuses(saved);
            // Notification
            const notif = {
                id: `notif-${id}`,
                type: 'flag',
                icon: '🚨',
                vesselName: vessel.name,
                vesselId: vessel.id,
                fromStatus: prevStatus,
                toStatus: 'at_port',
                port: vessel.currentPort || vessel.destination || 'N/A',
                message: `⚠️ ${vessel.name} has been flagged/held by ${flaggedBy || 'Customs'}: ${reason || 'Under Inspection'}`,
                timestamp: nowTimestamp(),
                read: false,
                manualChange: true,
            };
            setNotifications(n => [notif, ...n].slice(0, 50));
            return updated;
        });
        setLastUpdated(new Date());
    }, []);

    /**
     * Remove flag/hold from a vessel. Clears from localStorage.
     */
    const unflagVessel = useCallback((vesselId, clearedBy) => {
        setVesselFlags(prev => {
            const next = { ...prev };
            delete next[vesselId];
            saveFlags(next);
            return next;
        });
        // Remove status override so auto-cycle resumes from last known state
        const saved = loadStatuses();
        delete saved[vesselId];
        saveStatuses(saved);
        setVessels(prev => {
            const idx = prev.findIndex(v => v.id === vesselId);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], flagged: false };
            return updated;
        });
        setLastUpdated(new Date());
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        stats: mergedStats,
        vessels,
        recentActivity,
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        lastUpdated,
        refresh,
        monthlyVolume,
        imports: allImports,
        exports: allExports,
        // RBAC actions
        changeVesselStatus,
        flagVessel,
        unflagVessel,
        vesselFlags,
    };
}
