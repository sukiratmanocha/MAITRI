import { Router } from 'express';
import Shipment from '../models/Shipment.js';

const router = Router();

// ── Helper: generate a human-readable ID ───────────────────────────────────────
function generateId(prefix) {
    const yr = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}-${yr}-${seq}`;
}

function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── GET /api/shipments/stats ───────────────────────────────────────────────────
// Must be defined BEFORE the /:id route so "stats" isn't treated as an id.
router.get('/stats', async (_req, res) => {
    try {
        const [imports, exports, byStatus] = await Promise.all([
            Shipment.countDocuments({ type: 'import' }),
            Shipment.countDocuments({ type: 'export' }),
            Shipment.aggregate([
                { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 } } },
            ]),
        ]);

        // Build a nested map: { import: { in_transit: 4, ... }, export: { ... } }
        const statusBreakdown = {};
        for (const row of byStatus) {
            const t = row._id.type;
            const s = row._id.status;
            if (!statusBreakdown[t]) statusBreakdown[t] = {};
            statusBreakdown[t][s] = row.count;
        }

        res.json({
            totalImports: imports,
            totalExports: exports,
            total: imports + exports,
            statusBreakdown,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/shipments ─────────────────────────────────────────────────────────
// Query params:  ?type=import|export  &userSubmitted=true  &status=in_transit
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.type) filter.type = req.query.type;
        if (req.query.userSubmitted) filter.userSubmitted = req.query.userSubmitted === 'true';
        if (req.query.status) filter.status = req.query.status;

        const shipments = await Shipment.find(filter).sort({ createdAt: -1 });
        res.json(shipments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/shipments/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const doc = await Shipment.findOne({ shipmentId: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Shipment not found' });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/shipments ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { type, vessel, origin, destination, cargoType, containers, weight, date,
            billOfEntry, shippingBill, submittedBy } = req.body;

        if (!type || !['import', 'export'].includes(type)) {
            return res.status(400).json({ error: 'type must be "import" or "export"' });
        }

        const prefix = type === 'import' ? 'IMP' : 'EXP';
        const shipmentId = generateId(prefix);

        const record = {
            shipmentId,
            type,
            vessel,
            origin,
            destination,
            cargoType,
            containers: Number(containers) || 0,
            weight: weight || '0 MT',
            date: date || new Date().toISOString().slice(0, 10),
            status: 'pending',
            userSubmitted: true,
            submittedBy: submittedBy || 'Unknown',
            submittedAt: nowTimestamp(),
        };

        // Type-specific fields
        if (type === 'import') {
            record.billOfEntry = billOfEntry || generateId('BOE');
        } else {
            record.shippingBill = shippingBill || generateId('SB');
            record.egmStatus = 'pending';
        }

        const doc = await Shipment.create(record);
        res.status(201).json(doc);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Duplicate shipment ID — please retry' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/shipments/:id ───────────────────────────────────────────────────
// Update specific fields — never deletes the record.
router.patch('/:id', async (req, res) => {
    try {
        const allowedFields = ['status', 'egmStatus', 'containers', 'weight', 'vessel',
            'origin', 'destination', 'cargoType', 'billOfEntry', 'shippingBill', 'date'];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const doc = await Shipment.findOneAndUpdate(
            { shipmentId: req.params.id },
            { $set: updates },
            { new: true }
        );

        if (!doc) return res.status(404).json({ error: 'Shipment not found' });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
