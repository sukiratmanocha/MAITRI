import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const router = Router();

function nowTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.toISOString().slice(0, 10)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── GET /api/messages/conversations?userId=xxx ─────────────────────────────────
// Fetch all conversations the given user is part of.
router.get('/conversations', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query param required' });

        const convos = await Conversation.find({
            $or: [{ participantA: userId }, { participantB: userId }],
        }).sort({ updatedAt: -1 });

        res.json(convos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/messages/conversations ───────────────────────────────────────────
// Get or create a conversation between two users.
router.post('/conversations', async (req, res) => {
    try {
        const { currentUserId, contactId, contactName } = req.body;
        if (!currentUserId || !contactId || !contactName) {
            return res.status(400).json({ error: 'currentUserId, contactId, and contactName are required' });
        }

        // Check if a conversation already exists (in either direction)
        let convo = await Conversation.findOne({
            $or: [
                { participantA: currentUserId, participantB: contactId },
                { participantA: contactId, participantB: currentUserId },
            ],
        });

        if (convo) return res.json(convo);

        // Create new conversation
        convo = await Conversation.create({
            participantA: currentUserId,
            participantB: contactId,
            contactName,
        });

        res.status(201).json(convo);
    } catch (err) {
        // Handle race condition where two users create the same convo simultaneously
        if (err.code === 11000) {
            const convo = await Conversation.findOne({
                $or: [
                    { participantA: req.body.currentUserId, participantB: req.body.contactId },
                    { participantA: req.body.contactId, participantB: req.body.currentUserId },
                ],
            });
            if (convo) return res.json(convo);
        }
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/messages/:conversationId ──────────────────────────────────────────
// Fetch all messages for a conversation, sorted chronologically.
router.get('/:conversationId', async (req, res) => {
    try {
        const msgs = await Message.find({
            conversationId: req.params.conversationId,
        }).sort({ createdAt: 1 });

        res.json(msgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/messages ─────────────────────────────────────────────────────────
// Send a new message in a conversation.
router.post('/', async (req, res) => {
    try {
        const { conversationId, senderId, senderName, text, category, relatedShipment } = req.body;

        if (!conversationId || !senderId || !senderName || !text) {
            return res.status(400).json({ error: 'conversationId, senderId, senderName, and text are required' });
        }

        const msg = await Message.create({
            conversationId,
            senderId,
            senderName,
            text,
            category: category || 'General',
            relatedShipment: relatedShipment || null,
            timestamp: nowTimestamp(),
            read: false,
        });

        // Update conversation preview
        const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;
        await Conversation.findByIdAndUpdate(conversationId, {
            $set: {
                lastMessage: preview,
                lastMessageAt: msg.timestamp,
            },
        });

        // Also try by _id string match (Mongo ObjectId)
        // The conversationId stored in messages might be the Mongo _id
        await Conversation.findOneAndUpdate(
            { _id: conversationId },
            { $set: { lastMessage: preview, lastMessageAt: msg.timestamp } }
        ).catch(() => {/* ignore if not ObjectId format */});

        res.status(201).json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
