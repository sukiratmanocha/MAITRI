/**
 * api.js
 * ─────────────────────────────────────────────────────────
 * Central API client for the MAITRI backend.
 * All calls go through the Vite proxy (/api → localhost:5000).
 */

const BASE = '/api';

async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ── Shipments ───────────────────────────────────────────────────────────────────

/** Fetch all imports from the database. */
export function getImports() {
    return request('/shipments?type=import');
}

/** Fetch all exports from the database. */
export function getExports() {
    return request('/shipments?type=export');
}

/** Fetch all shipments (imports + exports). */
export function getAllShipments() {
    return request('/shipments');
}

/** Fetch a single shipment by its ID (e.g. IMP-2026-001). */
export function getShipment(id) {
    return request(`/shipments/${encodeURIComponent(id)}`);
}

/** Create a new shipment (import or export). */
export function createShipment(data) {
    return request('/shipments', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/** Update fields on an existing shipment (no delete). */
export function updateShipment(id, updates) {
    return request(`/shipments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

/** Fetch aggregated stats (counts by type/status). */
export function getStats() {
    return request('/shipments/stats');
}

/** Health check. */
export function healthCheck() {
    return request('/health');
}

// ── Messaging ───────────────────────────────────────────────────────────────────

/** Fetch all conversations for a given userId. */
export function fetchConversations(userId) {
    return request(`/messages/conversations?userId=${encodeURIComponent(userId)}`);
}

/** Get or create a conversation between two users. */
export function createConversation(currentUserId, contactId, contactName) {
    return request('/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ currentUserId, contactId, contactName }),
    });
}

/** Fetch all messages for a conversation. */
export function fetchMessages(conversationId) {
    return request(`/messages/${encodeURIComponent(conversationId)}`);
}

/** Send a message in a conversation. */
export function postMessage({ conversationId, senderId, senderName, text, category, relatedShipment }) {
    return request('/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId, senderId, senderName, text, category, relatedShipment }),
    });
}
