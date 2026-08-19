import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import shipmentsRouter from './routes/shipments.js';
import messagesRouter from './routes/messages.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/maitri';

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/shipments', shipmentsRouter);
app.use('/api/messages', messagesRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────────────────────────
async function start() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅  Connected to MongoDB:', MONGO_URI);

        app.listen(PORT, () => {
            console.log(`🚀  MAITRI API server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌  Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }
}

start();
