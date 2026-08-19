import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        /** The userId of participant A (the one who started the convo). */
        participantA: {
            type: String,
            required: true,
            index: true,
        },

        /** The userId of participant B. */
        participantB: {
            type: String,
            required: true,
            index: true,
        },

        /** Display name of the contact (from the perspective of the creator). */
        contactName: { type: String, required: true },

        /** Preview of the last message sent. */
        lastMessage: { type: String, default: null },

        /** Timestamp of the last message. */
        lastMessageAt: { type: String, default: null },

        /** Unread count (reserved for future use). */
        unreadCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

// Compound index so we can quickly find convos involving a user
conversationSchema.index({ participantA: 1, participantB: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
