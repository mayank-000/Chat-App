import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';
import { loadPrivateKey } from '../utils/indexdb';
import { importPrivateKey } from '../services/encryption.service';
import useFCM from '../hooks/useFCM';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context; 
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userPrivateKey, setUserPrivateKey] = useState(null);

    const { initializeFCM, removeFCMToken, listenForegroundMessages } = useFCM();

    const checkAuth = useCallback(async () => {
        try {
            const response = await authService.getProfile();
            const userId = response.user?.id || response.user?._id;
            setUser(response.user);

            // Load private key from IndexedDB
            if (userId) {
                const privateKeyString = await loadPrivateKey(userId);
                if (privateKeyString) {
                    const privateKey = await importPrivateKey(privateKeyString);
                    setUserPrivateKey(privateKey);
                    console.log('Private key loaded successfully');
                } else {
                    console.warn('No private key found for user:', userId);
                }
            }
            if (Notification.permission === 'granted') {
                await initializeFCM();
            }

        } catch (err) {
            console.error('Auth check failed:', err);
            setUser(null);
            setUserPrivateKey(null);
        } finally {
            setLoading(false);
        }
    }, [initializeFCM]);

    // Check if user is already logged in on component mount
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const signup = async (userData) => {
        try {
            setError(null);
            const response = await authService.signup(userData);
            const userId = response.user?.id || response.user?._id;

            setUser(response.user);

            if(userId) {
                const privateKeyString = await loadPrivateKey(userId);
                if(privateKeyString) {
                    const privateKey = await importPrivateKey(privateKeyString);
                    setUserPrivateKey(privateKey);
                    console.log('Private key loaded on signin');
                } else {
                    console.warn('No private key found for user:', userId);
                }
            }
            
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const signin = async (Credentials) => {
        try {
            setError(null);
            const response = await authService.signin(Credentials);
            setUser(response.user);

            // Load private key from IndexedDB
            const privateKeyString = await loadPrivateKey(response.user.id);
            if (privateKeyString) {
                const privateKey = await importPrivateKey(privateKeyString);
                setUserPrivateKey(privateKey);
            }
            // Permission popup here - user just logged in
            await initializeFCM();

            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const signout = async () => {
        await removeFCMToken();
        setUser(null);
        setUserPrivateKey(null);
        await authService.signout();
    };

    const value = {
        user,
        loading,
        error,
        userPrivateKey,
        signup,
        signin,
        signout, 
        isAuthenticated: !!user,
        listenForegroundMessages,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
