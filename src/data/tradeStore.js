/**
 * tradeStore.js
 * ─────────────────────────────────────────────────────────
 * Centralized store for:
 *   • Shipments (imports / exports) — backed by MongoDB via API
 *   • Direct messages between trade parties — backed by MongoDB via API
 *   • Contact directory of organisations
 *
 * All mutators fire a custom "tradestore" event so React
 * components can subscribe via useSyncExternalStore or a
 * simple useEffect listener.
 */

import { createShipment, getImports, getExports } from '../services/api';


function generateId(prefix) {
    const yr = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}-${yr}-${seq}`;
}

function nowTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Notify helper (fires the custom event for React subscribers) ─
function notifyChange() {
    window.dispatchEvent(new CustomEvent('tradestore', { detail: { key: 'shipments' } }));
}

// ── Shipments (MongoDB-backed) ──────────────────────────

/**
 * Add a user-submitted import shipment via API.
 * @param {Object} data – { vessel, origin, destination, cargoType, billOfEntry, containers, weight }
 * @returns {Promise<Object>} the saved record from the server
 */
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
    notifyChange();
    return record;
}

/**
 * Add a user-submitted export shipment via API.
 */
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
    notifyChange();
    return record;
}

/**
 * Get all imports from the database.
 * Returns a promise — callers must await.
 */
export async function getUserImports() {
    try {
        const data = await getImports();
        // Normalize the response so the UI can use `imp.id` as before
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
        console.error('Failed to fetch imports from API:', err);
        return [];
    }
}

/**
 * Get all exports from the database.
 * Returns a promise — callers must await.
 */
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
        console.error('Failed to fetch exports from API:', err);
        return [];
    }
}

// ── Messaging (now MongoDB-backed via API) ──────────────────────────────────

import {
    fetchConversations as apiFetchConversations,
    createConversation as apiCreateConversation,
    fetchMessages as apiFetchMessages,
    postMessage as apiPostMessage,
} from '../services/api';

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
 * Returns a Promise.
 */
export async function getOrCreateConversation(currentUserId, contactId, contactName) {
    const convo = await apiCreateConversation(currentUserId, contactId, contactName);
    notifyChange();
    return convo;
}

/** Get all conversations for a user. Returns a Promise. */
export async function getConversations(userId) {
    try {
        return await apiFetchConversations(userId);
    } catch (err) {
        console.error('Failed to fetch conversations:', err);
        return [];
    }
}

/**
 * Send a message in a conversation. Returns a Promise.
 */
export async function sendMessage({ conversationId, senderId, senderName, text, category, relatedShipment }) {
    const msg = await apiPostMessage({
        conversationId,
        senderId,
        senderName,
        text,
        category: category || 'General',
        relatedShipment: relatedShipment || null,
    });
    notifyChange();
    return msg;
}

/** Get all messages for a conversation, sorted chronologically. Returns a Promise. */
export async function getMessages(conversationId) {
    try {
        return await apiFetchMessages(conversationId);
    } catch (err) {
        console.error('Failed to fetch messages:', err);
        return [];
    }
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

