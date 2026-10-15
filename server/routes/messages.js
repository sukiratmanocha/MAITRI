import { Router } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const router = Router();

function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── In-Memory Store Fallback (used when MongoDB is not connected) ──────────────
const memoryStore = {
    conversations: [
        {
            _id: 'conv-seed-1',
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
            updatedAt: new Date().toISOString(),
        },
        {
            _id: 'conv-seed-2',
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
            updatedAt: new Date().toISOString(),
        },
        {
            _id: 'conv-seed-3',
            participantA: 'reliance-imp',
            participantB: 'adani-cha',
            participantAName: 'Reliance Industries',
            participantBName: 'Adani CHA Services',
            participantARole: 'Importer · JNPA',
            participantBRole: 'Customs House Agent · Kandla',
            participantAAvatar: 'RI',
            participantBAvatar: 'AS',
            contactName: 'Adani CHA Services',
            lastMessage: 'Gate out pass issued for petrochemical containers.',
            lastMessageAt: '2026-07-23 16:30:00',
            lastSenderId: 'adani-cha',
            updatedAt: new Date().toISOString(),
        },
    ],
    messages: [
        {
            _id: 'msg-seed-1',
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
            _id: 'msg-seed-2',
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
            _id: 'msg-seed-3',
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
            _id: 'msg-seed-4',
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
            _id: 'msg-seed-5',
            conversationId: 'conv-seed-2',
            senderId: 'jnpa-port',
            senderName: 'JNPA Port Authority',
            text: 'Berth 4 confirmed. Tidal window favorable for docking at 08:00 hrs. Pilotage confirmed for 08:00 hrs tidal window.',
            category: 'Shipment Update',
            relatedShipment: 'IMP-2026-001',
            timestamp: '2026-07-24 09:15:00',
            read: true,
        },
    ],
};

function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

// ── GET /api/messages/conversations?userId=xxx ─────────────────────────────────
router.get('/conversations', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query param required' });

        if (isMongoConnected()) {
            const convos = await Conversation.find({
                $or: [{ participantA: userId }, { participantB: userId }],
            }).sort({ updatedAt: -1 });
            return res.json(convos);
        }

        // Memory fallback
        const convos = memoryStore.conversations.filter(
            c => c.participantA === userId || c.participantB === userId
        );
        res.json(convos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/messages/conversations ───────────────────────────────────────────
router.post('/conversations', async (req, res) => {
    try {
        const {
            currentUserId,
            contactId,
            contactName,
            currentUserName,
            currentUserRole,
            currentUserAvatar,
            contactRole,
            contactAvatar,
        } = req.body;

        if (!currentUserId || !contactId) {
            return res.status(400).json({ error: 'currentUserId and contactId are required' });
        }

        if (isMongoConnected()) {
            // Check if conversation already exists (either direction)
            let convo = await Conversation.findOne({
                $or: [
                    { participantA: currentUserId, participantB: contactId },
                    { participantA: contactId, participantB: currentUserId },
                ],
            });

            if (convo) {
                // Enrich missing participant metadata if needed
                let dirty = false;
                if (!convo.participantAName && currentUserName) {
                    convo.participantAName = currentUserName;
                    dirty = true;
                }
                if (!convo.participantBName && contactName) {
                    convo.participantBName = contactName;
                    dirty = true;
                }
                if (!convo.participantARole && currentUserRole) {
                    convo.participantARole = currentUserRole;
                    dirty = true;
                }
                if (!convo.participantBRole && contactRole) {
                    convo.participantBRole = contactRole;
                    dirty = true;
                }
                if (!convo.participantAAvatar && currentUserAvatar) {
                    convo.participantAAvatar = currentUserAvatar;
                    dirty = true;
                }
                if (!convo.participantBAvatar && contactAvatar) {
                    convo.participantBAvatar = contactAvatar;
                    dirty = true;
                }
                if (dirty) await convo.save();
                return res.json(convo);
            }

            convo = await Conversation.create({
                participantA: currentUserId,
                participantB: contactId,
                participantAName: currentUserName || currentUserId,
                participantBName: contactName || contactId,
                participantARole: currentUserRole || '',
                participantBRole: contactRole || '',
                participantAAvatar: currentUserAvatar || '??',
                participantBAvatar: contactAvatar || '??',
                contactName: contactName || contactId,
            });

            return res.status(201).json(convo);
        }

        // Memory fallback
        let convo = memoryStore.conversations.find(
            c => (c.participantA === currentUserId && c.participantB === contactId) ||
                 (c.participantA === contactId && c.participantB === currentUserId)
        );

        if (convo) return res.json(convo);

        convo = {
            _id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            participantA: currentUserId,
            participantB: contactId,
            participantAName: currentUserName || currentUserId,
            participantBName: contactName || contactId,
            participantARole: currentUserRole || '',
            participantBRole: contactRole || '',
            participantAAvatar: currentUserAvatar || '??',
            participantBAvatar: contactAvatar || '??',
            contactName: contactName || contactId,
            lastMessage: null,
            lastMessageAt: null,
            lastSenderId: null,
            updatedAt: new Date().toISOString(),
        };

        memoryStore.conversations.unshift(convo);
        res.status(201).json(convo);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/messages/:conversationId ──────────────────────────────────────────
router.get('/:conversationId', async (req, res) => {
    try {
        const convoId = req.params.conversationId;
        if (isMongoConnected()) {
            const msgs = await Message.find({ conversationId: convoId }).sort({ createdAt: 1 });
            return res.json(msgs);
        }

        const msgs = memoryStore.messages.filter(m => m.conversationId === convoId);
        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/messages ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { conversationId, senderId, senderName, text, category, relatedShipment } = req.body;

        if (!conversationId || !senderId || !senderName || !text) {
            return res.status(400).json({ error: 'conversationId, senderId, senderName, and text are required' });
        }

        const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
        const timestamp = nowTimestamp();

        if (isMongoConnected()) {
            const msg = await Message.create({
                conversationId,
                senderId,
                senderName,
                text,
                category: category || 'General',
                relatedShipment: relatedShipment || null,
                timestamp,
                read: false,
            });

            await Conversation.findOneAndUpdate(
                { _id: conversationId },
                {
                    $set: {
                        lastMessage: preview,
                        lastMessageAt: timestamp,
                        lastSenderId: senderId,
                    },
                }
            ).catch(() => {});

            return res.status(201).json(msg);
        }

        // Memory fallback
        const msg = {
            _id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            conversationId,
            senderId,
            senderName,
            text,
            category: category || 'General',
            relatedShipment: relatedShipment || null,
            timestamp,
            read: false,
        };

        memoryStore.messages.push(msg);

        const convoIdx = memoryStore.conversations.findIndex(
            c => (c._id || c.id) === conversationId
        );
        if (convoIdx !== -1) {
            memoryStore.conversations[convoIdx].lastMessage = preview;
            memoryStore.conversations[convoIdx].lastMessageAt = timestamp;
            memoryStore.conversations[convoIdx].lastSenderId = senderId;
            memoryStore.conversations[convoIdx].updatedAt = new Date().toISOString();
        }

        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
