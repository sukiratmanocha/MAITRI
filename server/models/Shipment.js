import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema(
    {
        /**
         * Human-readable ID such as IMP-2026-001 or EXP-2026-003.
         * Unique across the entire collection.
         */
        shipmentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        /** "import" or "export" — the single discriminator field. */
        type: {
            type: String,
            required: true,
            enum: ['import', 'export'],
            index: true,
        },

        // ── Common fields ──────────────────────────────────────────
        vessel: { type: String, required: true },
        origin: { type: String, required: true },
        destination: { type: String, required: true },
        cargoType: { type: String, required: true },
        status: {
            type: String,
            default: 'pending',
            index: true,
        },
        date: { type: String }, // ISO date string e.g. "2026-07-24"
        containers: { type: Number, default: 0 },
        weight: { type: String, default: '0 MT' },

        // ── Import-specific ────────────────────────────────────────
        billOfEntry: { type: String },

        // ── Export-specific ─────────────────────────────────────────
        shippingBill: { type: String },
        egmStatus: { type: String },

        // ── Submission metadata ────────────────────────────────────
        userSubmitted: { type: Boolean, default: false },
        submittedBy: { type: String },
        submittedAt: { type: String },
    },
    {
        timestamps: true, // adds createdAt, updatedAt
    }
);

const Shipment = mongoose.model('Shipment', shipmentSchema);

export default Shipment;
