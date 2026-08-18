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
