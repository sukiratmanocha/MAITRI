/**
 * tradeStore.js
 * ─────────────────────────────────────────────────────────
 * Centralized localStorage-backed store for:
 *   • User-submitted shipments (imports / exports)
 *   • Direct messages between trade parties
 *   • Contact directory of organisations
 *
 * All mutators fire a custom "tradestore" event so React
 * components can subscribe via useSyncExternalStore or a
 * simple useEffect listener.
 */

// ── Keys ────────────────────────────────────────────────
const KEYS = {
    userImports: 'maitri_user_imports',
    userExports: 'maitri_user_exports',
    conversations: 'maitri_conversations',
    messages: 'maitri_messages',
};

// ── Helpers ─────────────────────────────────────────────
function read(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('tradestore', { detail: { key } }));
}

function generateId(prefix) {
    const yr = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}-${yr}-${seq}`;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function nowTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Shipments ───────────────────────────────────────────

/**
 * Add a user-submitted import shipment.
 * @param {Object} data – { vessel, origin, destination, cargoType, billOfEntry, containers, weight }
 * @returns {Object} the saved record
 */
export function addImport(data) {
    const record = {
        id: generateId('IMP'),
        vessel: data.vessel,
        origin: data.origin,
        destination: data.destination,
        cargoType: data.cargoType,
        billOfEntry: data.billOfEntry || generateId('BOE'),
        containers: Number(data.containers) || 0,
        weight: data.weight || '0 MT',
        status: 'pending',
        date: data.date || todayISO(),
        submittedBy: data.submittedBy || 'Unknown',
        submittedAt: nowTimestamp(),
        userSubmitted: true,
    };
    const list = read(KEYS.userImports);
    list.unshift(record);
    write(KEYS.userImports, list);
    return record;
}

/**
 * Add a user-submitted export shipment.
 */
export function addExport(data) {
    const record = {
        id: generateId('EXP'),
        vessel: data.vessel,
        origin: data.origin,
        destination: data.destination,
        cargoType: data.cargoType,
        shippingBill: data.shippingBill || generateId('SB'),
        egmStatus: 'pending',
        containers: Number(data.containers) || 0,
        weight: data.weight || '0 MT',
        status: 'pending',
        date: data.date || todayISO(),
        submittedBy: data.submittedBy || 'Unknown',
        submittedAt: nowTimestamp(),
        userSubmitted: true,
    };
    const list = read(KEYS.userExports);
    list.unshift(record);
    write(KEYS.userExports, list);
    return record;
}

/** Get all user-submitted imports. */
export function getUserImports() {
    return read(KEYS.userImports);
}

/** Get all user-submitted exports. */
export function getUserExports() {
    return read(KEYS.userExports);
}

// ── Messaging ───────────────────────────────────────────

/**
 * Directory of organisations available for messaging.
 * In a real system this would come from the server.
 */
export const contactDirectory = [
    { id: 'jnpa-port', name: 'JNPA Port Authority', role: 'Port Authority', port: 'JNPA', avatar: 'JP' },
    { id: 'dpa-port', name: 'DPA Port Authority', role: 'Port Authority', port: 'DPA', avatar: 'DP' },
    { id: 'kandla-port', name: 'Kandla Port Authority', role: 'Port Authority', port: 'Kandla', avatar: 'KP' },
    { id: 'jebel-ali-port', name: 'Jebel Ali Port', role: 'Port Authority', port: 'Jebel Ali', avatar: 'JA' },
    { id: 'khalifa-port', name: 'Khalifa Port', role: 'Port Authority', port: 'Khalifa', avatar: 'KH' },
    { id: 'india-customs', name: 'Indian Customs (ICEGATE)', role: 'Customs', port: 'India', avatar: 'IC' },
    { id: 'dubai-customs', name: 'Dubai Customs', role: 'Customs', port: 'Dubai', avatar: 'DC' },
    { id: 'ad-customs', name: 'Abu Dhabi Customs', role: 'Customs', port: 'Abu Dhabi', avatar: 'AC' },
    { id: 'maersk-line', name: 'Maersk Line', role: 'Shipping Line', port: 'Global', avatar: 'ML' },
    { id: 'cma-cgm', name: 'CMA CGM', role: 'Shipping Line', port: 'Global', avatar: 'CC' },
    { id: 'msc-shipping', name: 'MSC Shipping', role: 'Shipping Line', port: 'Global', avatar: 'MS' },
    { id: 'dp-world', name: 'DP World', role: 'Port Authority', port: 'Jebel Ali', avatar: 'DW' },
    { id: 'tata-exports', name: 'Tata International', role: 'Exporter', port: 'JNPA', avatar: 'TI' },
    { id: 'reliance-imp', name: 'Reliance Industries', role: 'Importer', port: 'JNPA', avatar: 'RI' },
    { id: 'adani-cha', name: 'Adani CHA Services', role: 'CHA', port: 'Kandla', avatar: 'AS' },
];

const MESSAGE_CATEGORIES = [
    'Trade Inquiry',
    'Documentation',
    'Customs Query',
    'Shipment Update',
    'General',
];

export { MESSAGE_CATEGORIES };

/**
 * Get or create a conversation between the current user and a contact.
 */
export function getOrCreateConversation(currentUserId, contactId, contactName) {
    const convos = read(KEYS.conversations);
    const existing = convos.find(
        c => (c.participantA === currentUserId && c.participantB === contactId) ||
            (c.participantA === contactId && c.participantB === currentUserId)
    );
    if (existing) return existing;

    const newConvo = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        participantA: currentUserId,
        participantB: contactId,
        contactName,
        createdAt: nowTimestamp(),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
    };
    convos.unshift(newConvo);
    write(KEYS.conversations, convos);
    return newConvo;
}

/** Get all conversations for a user. */
export function getConversations(userId) {
    const convos = read(KEYS.conversations);
    return convos.filter(c => c.participantA === userId || c.participantB === userId);
}

/**
 * Send a message in a conversation.
 */
export function sendMessage({ conversationId, senderId, senderName, text, category, relatedShipment }) {
    const msg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        conversationId,
        senderId,
        senderName,
        text,
        category: category || 'General',
        relatedShipment: relatedShipment || null,
        timestamp: nowTimestamp(),
        read: false,
    };

    // Save message
    const msgs = read(KEYS.messages);
    msgs.push(msg);
    write(KEYS.messages, msgs);

    // Update conversation preview
    const convos = read(KEYS.conversations);
    const idx = convos.findIndex(c => c.id === conversationId);
    if (idx !== -1) {
        convos[idx].lastMessage = text.length > 60 ? text.slice(0, 60) + '…' : text;
        convos[idx].lastMessageAt = msg.timestamp;
        write(KEYS.conversations, convos);
    }

    return msg;
}

/** Get all messages for a conversation, sorted chronologically. */
export function getMessages(conversationId) {
    return read(KEYS.messages)
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Subscribe to store changes. Returns an unsubscribe function.
 * @param {Function} callback – called whenever any store key changes
 */
export function subscribe(callback) {
    const handler = () => callback();
    window.addEventListener('tradestore', handler);
    return () => window.removeEventListener('tradestore', handler);
}
