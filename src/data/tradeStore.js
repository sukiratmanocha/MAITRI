/**
 * tradeStore.js
 * ─────────────────────────────────────────────────────────
 * Centralized store for:
 *   • Shipments (imports / exports) — backed by MongoDB / API with local resilience
 *   • Direct messages between trade parties — bi-directional 1-on-1 chats
 *   • Contact directory of all corridor organisations and registered users
 *
 * All mutators fire a custom "tradestore" event and storage events
 * so React components across tabs stay in real-time sync.
 */

import {
    createShipment,
    getImports,
    getExports,
    fetchConversations as apiFetchConversations,
    createConversation as apiCreateConversation,
    fetchMessages as apiFetchMessages,
    postMessage as apiPostMessage,
} from '../services/api';

function nowTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Notify helper (fires the custom event for React subscribers) ─
function notifyChange(key = 'all') {
    try {
        window.dispatchEvent(new CustomEvent('tradestore', { detail: { key } }));
    } catch {
        // Safe in non-window environments
    }
}

// ── Shipments (MongoDB-backed with API) ──────────────────

export async function addImport(data) {
    const record = await createShipment({
        type: 'import',
        vessel: data.vessel,
        origin: data.origin,
        destination: data.destination,
        cargoType: data.cargoType,
        billOfEntry: data.billOfEntry || undefined,
        containers: Number(data.containers) || 0,
        weight: data.weight || '0 MT',
        date: data.date || undefined,
        submittedBy: data.submittedBy || 'Unknown',
    });
    notifyChange('shipments');
    return record;
}

export async function addExport(data) {
    const record = await createShipment({
        type: 'export',
        vessel: data.vessel,
        origin: data.origin,
        destination: data.destination,
        cargoType: data.cargoType,
        shippingBill: data.shippingBill || undefined,
        containers: Number(data.containers) || 0,
        weight: data.weight || '0 MT',
        date: data.date || undefined,
        submittedBy: data.submittedBy || 'Unknown',
    });
    notifyChange('shipments');
    return record;
}

export async function getUserImports() {
    try {
        const data = await getImports();
        return data.map(doc => ({
            id: doc.shipmentId,
            vessel: doc.vessel,
            origin: doc.origin,
            destination: doc.destination,
            cargoType: doc.cargoType,
            billOfEntry: doc.billOfEntry,
            containers: doc.containers,
            weight: doc.weight,
            status: doc.status,
            date: doc.date,
            userSubmitted: doc.userSubmitted,
            submittedBy: doc.submittedBy,
            submittedAt: doc.submittedAt,
        }));
    } catch (err) {
        console.warn('API getImports failed, using local/empty fallback:', err.message);
        return [];
    }
}

export async function getUserExports() {
    try {
        const data = await getExports();
        return data.map(doc => ({
            id: doc.shipmentId,
            vessel: doc.vessel,
            origin: doc.origin,
            destination: doc.destination,
            cargoType: doc.cargoType,
            shippingBill: doc.shippingBill,
            egmStatus: doc.egmStatus,
            containers: doc.containers,
            weight: doc.weight,
            status: doc.status,
            date: doc.date,
            userSubmitted: doc.userSubmitted,
            submittedBy: doc.submittedBy,
            submittedAt: doc.submittedAt,
        }));
    } catch (err) {
        console.warn('API getUserExports failed, using local/empty fallback:', err.message);
        return [];
    }
}

// ── Contact Directory & Corridor Users ───────────────────

export const DEFAULT_CORRIDOR_USERS = [
    { id: 'jnpa-port', name: 'JNPA Port Authority', role: 'Port Authority', port: 'JNPA', avatar: 'JP' },
    { id: 'dpa-port', name: 'DPA Port Authority', role: 'Port Authority', port: 'DPA', avatar: 'DP' },
    { id: 'kandla-port', name: 'Kandla Port Authority', role: 'Port Authority', port: 'Kandla', avatar: 'KP' },
    { id: 'jebel-ali-port', name: 'Jebel Ali Port Authority', role: 'Port Authority', port: 'Jebel Ali', avatar: 'JA' },
    { id: 'khalifa-port', name: 'Khalifa Port Authority', role: 'Port Authority', port: 'Khalifa', avatar: 'KH' },
    { id: 'dp-world', name: 'DP World Terminal', role: 'Terminal Operator', port: 'Jebel Ali', avatar: 'DW' },
    { id: 'india-customs', name: 'Indian Customs (ICEGATE)', role: 'Customs Officer', port: 'India', avatar: 'IC' },
    { id: 'dubai-customs', name: 'Dubai Customs', role: 'Customs Officer', port: 'Dubai', avatar: 'DC' },
    { id: 'ad-customs', name: 'Abu Dhabi Customs', role: 'Customs Officer', port: 'Abu Dhabi', avatar: 'AC' },
    { id: 'customs-superintendent-jnpa', name: 'Customs Superintendent', role: 'Customs Superintendent', port: 'JNPA', avatar: 'CS' },
    { id: 'maersk-line', name: 'Maersk Line', role: 'Shipping Line', port: 'Global', avatar: 'ML' },
    { id: 'cma-cgm', name: 'CMA CGM', role: 'Shipping Line', port: 'Global', avatar: 'CC' },
    { id: 'msc-shipping', name: 'MSC Shipping', role: 'Shipping Line', port: 'Global', avatar: 'MS' },
    { id: 'cosco-shipping', name: 'COSCO Shipping Lines', role: 'Shipping Line', port: 'Global', avatar: 'CS' },
    { id: 'tata-exports', name: 'Tata International', role: 'Exporter', port: 'JNPA', avatar: 'TI' },
    { id: 'reliance-imp', name: 'Reliance Industries', role: 'Importer', port: 'JNPA', avatar: 'RI' },
    { id: 'adnoc-uae', name: 'ADNOC Petrochemicals', role: 'Exporter', port: 'Khalifa', avatar: 'AD' },
    { id: 'adani-cha', name: 'Adani CHA Services', role: 'CHA (Customs House Agent)', port: 'Kandla', avatar: 'AS' },
    { id: 'allcargo-logistics', name: 'Allcargo Logistics', role: 'Freight Forwarder', port: 'JNPA', avatar: 'AL' },
    { id: 'gateway-terminals', name: 'Gateway Terminals India', role: 'Terminal Operator', port: 'JNPA', avatar: 'GT' },
    { id: 'sbi-bank', name: 'State Bank of India Trade Finance', role: 'Trade Finance (Bank)', port: 'Mumbai', avatar: 'SB' },
    { id: 'emirates-nbd', name: 'Emirates NBD Trade Finance', role: 'Trade Finance (Bank)', port: 'Dubai', avatar: 'EN' },
];

const STORAGE_KEY_USERS = 'maitri_registered_users';
const STORAGE_KEY_CONVOS = 'maitri_conversations';
const STORAGE_KEY_MESSAGES = 'maitri_messages';

/**
 * Get all registered corridor users (merging default users with dynamically registered users).
 */
export function getContactDirectory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        const dynamicUsers = raw ? JSON.parse(raw) : [];
        const map = new Map();

        // 1. Defaults
        for (const u of DEFAULT_CORRIDOR_USERS) {
            map.set(u.id, u);
        }
        // 2. Dynamic (overwrites or adds)
        for (const u of dynamicUsers) {
            if (u && u.id) {
                map.set(u.id, { ...map.get(u.id), ...u });
            }
        }
        return Array.from(map.values());
    } catch {
        return DEFAULT_CORRIDOR_USERS;
    }
}

/**
 * Alias for contactDirectory so existing imports work seamlessly.
 */
export const contactDirectory = new Proxy(DEFAULT_CORRIDOR_USERS, {
    get(target, prop) {
        const current = getContactDirectory();
        if (prop === 'length') return current.length;
        if (typeof current[prop] === 'function') {
            return current[prop].bind(current);
        }
        return current[prop] ?? target[prop];
    },
});

/**
 * Register a user into the global contact directory so ANY OTHER user can see and message them.
 */
export function registerUser(user) {
    if (!user || !user.userId) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        const list = raw ? JSON.parse(raw) : [];
        const portClean = (user.port || '').split('(')[0].trim();
        const entry = {
            id: user.userId,
            name: user.organization || user.name || user.role,
            role: user.role || 'Stakeholder',
            port: portClean || 'Corridor',
            avatar: user.avatar || (user.organization || user.role || 'US').slice(0, 2).toUpperCase(),
            online: true,
            lastSeen: new Date().toISOString(),
        };

        const idx = list.findIndex(u => u.id === entry.id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...entry };
        } else {
            list.push(entry);
        }
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
        notifyChange('users');
    } catch (e) {
        console.warn('Failed to register user in local directory:', e);
    }
}

export function findContact(id) {
    if (!id) return null;
    const all = getContactDirectory();
    return all.find(c => c.id === id) || null;
}

// ── Seed Conversations & Messages ────────────────────────

const SEED_CONVERSATIONS = [
    {
        id: 'conv-seed-1',
        participantA: 'tata-exports',
        participantB: 'india-customs',
        participantAName: 'Tata International',
        participantBName: 'Indian Customs (ICEGATE)',
        participantARole: 'Exporter · JNPA',
        participantBRole: 'Customs Officer · India',
        participantAAvatar: 'TI',
        participantBAvatar: 'IC',
        contactName: 'Indian Customs (ICEGATE)',
        lastMessage: 'CHA has been notified to present gate passes at CFS.',
        lastMessageAt: '2026-07-24 11:42:00',
        lastSenderId: 'tata-exports',
        unreadCount: 0,
        createdAt: '2026-07-24 10:15:00',
    },
    {
        id: 'conv-seed-2',
        participantA: 'jnpa-port',
        participantB: 'maersk-line',
        participantAName: 'JNPA Port Authority',
        participantBName: 'Maersk Line',
        participantARole: 'Port Authority · JNPA',
        participantBRole: 'Shipping Line · Global',
        participantAAvatar: 'JP',
        participantBAvatar: 'ML',
        contactName: 'Maersk Line',
        lastMessage: 'Pilotage confirmed for 08:00 hrs tidal window.',
        lastMessageAt: '2026-07-24 09:15:00',
        lastSenderId: 'jnpa-port',
        unreadCount: 0,
        createdAt: '2026-07-24 08:30:00',
    },
    {
        id: 'conv-seed-3',
        participantA: 'reliance-imp',
        participantB: 'adani-cha',
        participantAName: 'Reliance Industries',
        participantBName: 'Adani CHA Services',
        participantARole: 'Importer · JNPA',
        participantBRole: 'CHA · Kandla',
        participantAAvatar: 'RI',
        participantBAvatar: 'AS',
        contactName: 'Adani CHA Services',
        lastMessage: 'Gate out pass issued for petrochemical containers.',
        lastMessageAt: '2026-07-23 16:30:00',
        lastSenderId: 'adani-cha',
        unreadCount: 0,
        createdAt: '2026-07-23 14:00:00',
    },
];

const SEED_MESSAGES = [
    {
        id: 'msg-seed-1',
        conversationId: 'conv-seed-1',
        senderId: 'tata-exports',
        senderName: 'Tata International',
        text: 'Good morning. We have filed Shipping Bill SB-45201 for textiles shipment on MSC Marina. Could you confirm assessment status?',
        category: 'Customs Query',
        relatedShipment: 'EXP-2026-001',
        timestamp: '2026-07-24 10:15:00',
        read: true,
    },
    {
        id: 'msg-seed-2',
        conversationId: 'conv-seed-1',
        senderId: 'india-customs',
        senderName: 'Indian Customs (ICEGATE)',
        text: 'Checked ICEGATE portal. Assessment completed with self-declaration. Container inspection scheduled for 14:00 at JNPA CFS.',
        category: 'Customs Query',
        relatedShipment: 'EXP-2026-001',
        timestamp: '2026-07-24 10:45:00',
        read: true,
    },
    {
        id: 'msg-seed-3',
        conversationId: 'conv-seed-1',
        senderId: 'tata-exports',
        senderName: 'Tata International',
        text: 'CHA has been notified to present gate passes at CFS.',
        category: 'Documentation',
        relatedShipment: 'EXP-2026-001',
        timestamp: '2026-07-24 11:42:00',
        read: true,
    },
    {
        id: 'msg-seed-4',
        conversationId: 'conv-seed-2',
        senderId: 'maersk-line',
        senderName: 'Maersk Line',
        text: 'Maersk Seletar estimated arrival at JNPA Outer Anchorage tomorrow at 06:30 hrs. Requesting Berth 4 allocation.',
        category: 'Shipment Update',
        relatedShipment: 'IMP-2026-001',
        timestamp: '2026-07-24 08:30:00',
        read: true,
    },
    {
        id: 'msg-seed-5',
        conversationId: 'conv-seed-2',
        senderId: 'jnpa-port',
        senderName: 'JNPA Port Authority',
        text: 'Berth 4 confirmed. Tidal window favorable for docking at 08:00 hrs. Pilotage confirmed for 08:00 hrs tidal window.',
        category: 'Shipment Update',
        relatedShipment: 'IMP-2026-001',
        timestamp: '2026-07-24 09:15:00',
        read: true,
    },
    {
        id: 'msg-seed-6',
        conversationId: 'conv-seed-3',
        senderId: 'reliance-imp',
        senderName: 'Reliance Industries',
        text: 'Please check status of BOE-78452 arriving on CMA CGM Titus.',
        category: 'Trade Inquiry',
        relatedShipment: 'IMP-2026-002',
        timestamp: '2026-07-23 14:10:00',
        read: true,
    },
    {
        id: 'msg-seed-7',
        conversationId: 'conv-seed-3',
        senderId: 'adani-cha',
        senderName: 'Adani CHA Services',
        text: 'Out of Charge (OOC) received from customs. Gate out pass issued for petrochemical containers.',
        category: 'Trade Inquiry',
        relatedShipment: 'IMP-2026-002',
        timestamp: '2026-07-23 16:30:00',
        read: true,
    },
];

// Helper to initialize local storage with seed data if not present
function getLocalConversations() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CONVOS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    localStorage.setItem(STORAGE_KEY_CONVOS, JSON.stringify(SEED_CONVERSATIONS));
    return [...SEED_CONVERSATIONS];
}

function saveLocalConversations(convos) {
    try {
        localStorage.setItem(STORAGE_KEY_CONVOS, JSON.stringify(convos));
    } catch (e) {
        console.warn('Failed to save convos to localStorage:', e);
    }
}

function getLocalMessages() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(SEED_MESSAGES));
    return [...SEED_MESSAGES];
}

function saveLocalMessages(msgs) {
    try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(msgs));
    } catch (e) {
        console.warn('Failed to save messages to localStorage:', e);
    }
}

// ── Messaging Categories ─────────────────────────────────

export const MESSAGE_CATEGORIES = [
    'General',
    'Trade Inquiry',
    'Documentation',
    'Customs Query',
    'Shipment Update',
];

// Helper to normalize conversation item for rendering
function normalizeConvo(c) {
    const pA = c.participantA;
    const pB = c.participantB;
    const contactA = findContact(pA);
    const contactB = findContact(pB);

    return {
        ...c,
        id: c._id || c.id,
        participantAName: c.participantAName || contactA?.name || pA,
        participantBName: c.participantBName || c.contactName || contactB?.name || pB,
        participantARole: c.participantARole || (contactA ? `${contactA.role} · ${contactA.port}` : ''),
        participantBRole: c.participantBRole || (contactB ? `${contactB.role} · ${contactB.port}` : ''),
        participantAAvatar: c.participantAAvatar || contactA?.avatar || (pA || '??').slice(0, 2).toUpperCase(),
        participantBAvatar: c.participantBAvatar || contactB?.avatar || (pB || '??').slice(0, 2).toUpperCase(),
    };
}

/**
 * Get or create a separate, private conversation between the current user and a contact.
 * Returns a Promise resolving to the conversation object.
 */
export async function getOrCreateConversation(currentUser, contact, contactNameParam) {
    const currentUserId = typeof currentUser === 'object' ? currentUser?.userId : currentUser;
    const contactId = typeof contact === 'object' ? contact?.id : contact;
    const contactName = (typeof contact === 'object' ? contact?.name : contactNameParam) || contactId;

    if (!currentUserId || !contactId) {
        throw new Error('Both currentUserId and contactId are required');
    }

    const currentContact = findContact(currentUserId);
    const targetContact = findContact(contactId);

    const currentUserName = typeof currentUser === 'object' ? (currentUser.organization || currentUser.name) : currentContact?.name || currentUserId;
    const currentUserRole = typeof currentUser === 'object' ? `${currentUser.role || ''} · ${currentUser.port || ''}` : currentContact ? `${currentContact.role} · ${currentContact.port}` : '';
    const currentUserAvatar = typeof currentUser === 'object' ? currentUser.avatar : currentContact?.avatar || '??';

    const targetRole = typeof contact === 'object' ? `${contact.role || ''} · ${contact.port || ''}` : targetContact ? `${targetContact.role} · ${targetContact.port}` : '';
    const targetAvatar = typeof contact === 'object' ? contact.avatar : targetContact?.avatar || '??';

    // 1. Try API first
    try {
        const apiConvo = await apiCreateConversation(currentUserId, contactId, contactName, {
            currentUserName,
            currentUserRole,
            currentUserAvatar,
            contactRole: targetRole,
            contactAvatar: targetAvatar,
        });
        if (apiConvo) {
            const normalized = normalizeConvo(apiConvo);
            // Sync to local
            const local = getLocalConversations();
            const idx = local.findIndex(c => (c._id || c.id) === (normalized._id || normalized.id));
            if (idx !== -1) {
                local[idx] = normalized;
            } else {
                local.unshift(normalized);
            }
            saveLocalConversations(local);
            notifyChange('messages');
            return normalized;
        }
    } catch {
        // Fall back to local storage
    }

    // 2. Local storage check
    const localConvos = getLocalConversations();
    const existing = localConvos.find(
        c => (c.participantA === currentUserId && c.participantB === contactId) ||
             (c.participantA === contactId && c.participantB === currentUserId)
    );

    if (existing) {
        const normalized = normalizeConvo(existing);
        notifyChange('messages');
        return normalized;
    }

    // Create new separate 1-on-1 conversation
    const newConvo = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        participantA: currentUserId,
        participantB: contactId,
        participantAName: currentUserName,
        participantBName: contactName,
        participantARole: currentUserRole,
        participantBRole: targetRole,
        participantAAvatar: currentUserAvatar,
        participantBAvatar: targetAvatar,
        contactName,
        lastMessage: null,
        lastMessageAt: null,
        lastSenderId: null,
        unreadCount: 0,
        createdAt: nowTimestamp(),
    };

    localConvos.unshift(newConvo);
    saveLocalConversations(localConvos);
    notifyChange('messages');
    return normalizeConvo(newConvo);
}

/**
 * Get all conversations for a specific user (where the user is participantA or participantB).
 * Returns a Promise resolving to array of conversations.
 */
export async function getConversations(userId) {
    if (!userId) return [];

    let apiData = null;
    try {
        apiData = await apiFetchConversations(userId);
    } catch {
        // API offline
    }

    if (Array.isArray(apiData) && apiData.length > 0) {
        const normalized = apiData.map(normalizeConvo);
        // Update local cache
        const local = getLocalConversations();
        for (const item of normalized) {
            const idx = local.findIndex(c => (c._id || c.id) === item.id);
            if (idx !== -1) local[idx] = { ...local[idx], ...item };
            else local.unshift(item);
        }
        saveLocalConversations(local);
        return normalized;
    }

    // Use local storage
    const local = getLocalConversations();
    const userConvos = local.filter(
        c => c.participantA === userId || c.participantB === userId
    );

    return userConvos.map(normalizeConvo);
}

/**
 * Send a message in a specific conversation.
 * Returns a Promise resolving to the sent message object.
 */
export async function sendMessage({ conversationId, senderId, senderName, text, category, relatedShipment }) {
    const timestamp = nowTimestamp();
    const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;

    let apiMsg = null;
    try {
        apiMsg = await apiPostMessage({
            conversationId,
            senderId,
            senderName,
            text,
            category: category || 'General',
            relatedShipment: relatedShipment || null,
        });
    } catch {
        // API offline, handle locally
    }

    const newMsg = apiMsg || {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        conversationId,
        senderId,
        senderName,
        text,
        category: category || 'General',
        relatedShipment: relatedShipment || null,
        timestamp,
        read: false,
    };

    // 1. Save to local messages
    const msgs = getLocalMessages();
    msgs.push(newMsg);
    saveLocalMessages(msgs);

    // 2. Update local conversation preview
    const convos = getLocalConversations();
    const cIdx = convos.findIndex(c => (c._id || c.id) === conversationId);
    if (cIdx !== -1) {
        convos[cIdx].lastMessage = preview;
        convos[cIdx].lastMessageAt = timestamp;
        convos[cIdx].lastSenderId = senderId;
        // Move updated conversation to top of list
        const updated = convos.splice(cIdx, 1)[0];
        convos.unshift(updated);
        saveLocalConversations(convos);
    }

    notifyChange('messages');
    return newMsg;
}

/**
 * Get all messages for a specific conversation, sorted chronologically.
 * Returns a Promise resolving to array of message objects.
 */
export async function getMessages(conversationId) {
    if (!conversationId) return [];

    let apiData = null;
    try {
        apiData = await apiFetchMessages(conversationId);
    } catch {
        // API offline
    }

    if (Array.isArray(apiData) && apiData.length > 0) {
        // Sync local cache
        const local = getLocalMessages();
        const otherMsgs = local.filter(m => m.conversationId !== conversationId);
        const merged = [...otherMsgs, ...apiData];
        saveLocalMessages(merged);
        return apiData;
    }

    // Local storage
    const local = getLocalMessages();
    return local
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
}

/**
 * Subscribe to store changes across components and browser tabs.
 * Returns an unsubscribe function.
 */
export function subscribe(callback) {
    const handler = () => callback();
    window.addEventListener('tradestore', handler);
    window.addEventListener('storage', handler);
    return () => {
        window.removeEventListener('tradestore', handler);
        window.removeEventListener('storage', handler);
    };
}
