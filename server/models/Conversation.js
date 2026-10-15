import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        /** The userId of participant A. */
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

        /** Display name of participant A. */
        participantAName: { type: String, default: '' },

        /** Display name of participant B. */
        participantBName: { type: String, default: '' },

        /** Role & location description of participant A. */
        participantARole: { type: String, default: '' },

        /** Role & location description of participant B. */
        participantBRole: { type: String, default: '' },

        /** Avatar initials for participant A. */
        participantAAvatar: { type: String, default: '??' },

        /** Avatar initials for participant B. */
        participantBAvatar: { type: String, default: '??' },

        /** Legacy display name field for backward compatibility. */
        contactName: { type: String, default: '' },

        /** Preview of the last message sent. */
        lastMessage: { type: String, default: null },

        /** Timestamp of the last message. */
        lastMessageAt: { type: String, default: null },

        /** UserId of the participant who sent the last message. */
        lastSenderId: { type: String, default: null },

        /** Unread count (reserved for future use). */
        unreadCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

// Compound index so we can quickly find convos involving two users
conversationSchema.index({ participantA: 1, participantB: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
