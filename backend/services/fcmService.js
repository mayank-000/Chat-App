import admin from '../config/firebaseAdmin.js';
import { User } from '../models/user.model.js';

export const sendPushNotification = async (tokens, senderName, conversationId) => {
    if(!tokens || tokens.length === 0) return;

    const message = {
        notification: {
            title: senderName,
            body: 'New message received'
        },
        data: {
            conversationId: conversationId.toString()
        },
        tokens: tokens
    };
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('FCM sent:', response.successCount, 'success,', response.failureCount, 'failed');

        const expiredTokens = [];
        response.responses.forEach((result, index) => {
            if(!result.success) {
                const errorCode = result.error?.code;
                if (
                    errorCode === 'messaging/registration-token-not-registered' ||
                    errorCode === 'messaging/invalid-registration-token'
                ) {
                    expiredTokens.push(tokens[index]);
                }
            }
        });

        if(expiredTokens.length > 0) {
            await User.updateMany(
                { fcmTokens: { $in: expiredTokens } },
                { $pull: { fcmTokens: { $in: expiredTokens } } }
            );
            console.log('Removed expired FCM tokens:', expiredTokens.length);
        }
    } catch (error) {
        console.error('FCM send failed:', error);
    }
};