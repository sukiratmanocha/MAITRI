import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        /** Reference to the parent conversation. */
        conversationId: {
            type: String,
            required: true,
            index: true,
        },

        /** userId of the sender. */
        senderId: { type: String, required: true },

        /** Display name of the sender (organisation name). */
        senderName: { type: String, required: true },

        /** Message body. */
        text: { type: String, required: true },

        /** Category tag (e.g. Trade Inquiry, Customs Query). */
        category: { type: String, default: 'General' },

        /** Optional related shipment ID. */
        relatedShipment: { type: String, default: null },

        /** Human-readable timestamp string. */
        timestamp: { type: String, required: true },

        /** Whether the message has been read by the recipient. */
        read: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model('Message', messageSchema);

export default Message;
