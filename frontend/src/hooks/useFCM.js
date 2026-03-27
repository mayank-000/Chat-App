import { useState, useCallback } from "react";
import { getToken, onMessage, deleteToken } from "firebase/messaging";
import { messaging } from "../config/firebase";
import api from "../services/api";

const VAPID_KEY = "BM0KX7JZ1zpCzBiJRbe5sSCLEMJivBxT-1DiX3XxPtu96kR7SToVzMSYftdKMwVfTeuxerdAOHLuea9-Ey4ajc4";

const useFCM = () => {
    const [token, setToken] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);

    const initializeFCM = useCallback( async () => {
        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if(permission !== "granted") {
                console.warn("Notification permission denied");
                return;
            }

            const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (!fcmToken) {
                console.warn('No FCM token received');
                return;
            }
            setToken(fcmToken);

            await api.post('/fcm/token', { token: fcmToken });
            console.log('FCM token saved successfully');
            
        } catch (error) {
            console.error("FCM initialization failed:", error);
        }
    }, []);

    const listenForegroundMessages = useCallback ((callback) => {
        const unsubscribe = onMessage(messaging, (payload) => {
            if(callback) callback(payload);
        });
        return unsubscribe;
    }, []);

    const removeFCMToken = useCallback (async () => {
        try {
            if (token) {
                await api.delete('/fcm/token', { data: { token } });
            }
            await deleteToken(messaging);
            setToken(null);
        } catch (error) {
            console.error("Failed to remove FCM token:", error);
        }
    }, [token]); // Only recreates when token changes
    return { token, permissionStatus, initializeFCM, removeFCMToken, listenForegroundMessages };
};

export default useFCM;