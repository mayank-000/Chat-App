import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/auth.service';
import { loadPrivateKey } from '../utils/indexdb';
import { importPrivateKey } from '../services/encryption.service';

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

    // Check if user is already logged in on component mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await authService.getProfile();
            setUser(response.user);

            // Load private key from IndexedDB
            const privateKeyString = await loadPrivateKey(response.user.id);
            if (privateKeyString) {
                const privateKey = await importPrivateKey(privateKeyString);
                setUserPrivateKey(privateKey);
            }
        } catch (err) {
            setUser(null);
            setUserPrivateKey(null);
        } finally {
            setLoading(false);
        }
    };

    const signup = async (userData) => {
        try {
            setError(null);
            const response = await authService.signup(userData);
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

            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const signout = () => {
        setUser(null);
        setUserPrivateKey(null);
        authService.signout();
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
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};