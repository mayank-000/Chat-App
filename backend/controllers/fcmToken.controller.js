import { User } from '../models/user.model.js';
import catchAsync from '../utils/catchAsync.js';

export const saveFCMToken = catchAsync(async (req, res) => {
    const { token } = req.body;
    const userId = req.userId;

    if(!token) {
        return res.status(400).json({ success: false, message: "Token is Required" });
    }

    await User.findByIdAndUpdate(userId, {
        $addToSet: { fcmTokens: token }
    });

    res.status(200).json({ success: true, message: 'FCM token saved' });
});

export const deleteFCMToken = catchAsync(async (req, res) => {
    const { token } = req.body;
    const userId = req.userId;

    if(token) {
        await User.findByIdAndDelete(userId, {
            $pull: { fcmToken: []}
        });
    }
    res.status(200).json({ success: true, message: 'FCM token removed'});
});