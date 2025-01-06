const admin = require('../config/firebase');

const Notification = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) {
        throw new Error("No tokens provided for notification.");
    }

    if (Array.isArray(tokens)) {
        const message = {
            data: {
                title,
                body,
            },
            tokens, 
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            return response;
        } catch (error) {
            console.error("🚀 ~ Multicast Notification Error:", error);
            throw new Error("Failed to send multicast notifications.");
        }
    } else {
        const message = {
            data: {
                title,
                body,
            },
            token: tokens, 
        };

        try {
            const response = await admin.messaging().send(message);
            return response;
        } catch (error) {
            console.error("🚀 ~ Single Notification Error:", error);
            throw new Error("Failed to send single notification.");
        }
    }
};

module.exports = {
    Notification,
};