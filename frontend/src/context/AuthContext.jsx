'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
};

export function AuthProvider({ children }) {
    // Next.js renders pages on the server first, where localStorage does not exist.
    // The stored session is read once in the browser; `ready` tells pages it has been checked.
    const [ready, setReady] = useState(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        setToken(localStorage.getItem('token'));
        setUser(readStoredUser());
        setReady(true);
    }, []);

    const persist = useCallback((nextToken, nextUser) => {
        localStorage.setItem('token', nextToken);
        setToken(nextToken);
        if (nextUser) {
            localStorage.setItem('user', JSON.stringify(nextUser));
            setUser(nextUser);
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    // Existing credentials flow: POST /auth/login
    const login = useCallback(async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        persist(res.data.token, res.data.user);
    }, [persist]);

    // Demo user flow: POST /auth/demo (the backend signs the demo user in; no password in the frontend)
    const loginDemo = useCallback(async () => {
        const res = await api.post('/auth/demo');
        persist(res.data.token, res.data.user);
    }, [persist]);

    // Create account: POST /auth/register (stores the user + profile rows in MySQL and signs the user in)
    const register = useCallback(async (payload) => {
        const res = await api.post('/auth/register', payload);
        persist(res.data.token, res.data.user);
    }, [persist]);

    // Keep the stored profile fresh whenever we have a token
    useEffect(() => {
        if (!token) return;
        api.get('/auth/me').then((res) => {
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
        }).catch(() => {});
    }, [token]);

    // Save profile edits: PUT /auth/me
    const updateProfile = useCallback(async (payload) => {
        const res = await api.put('/auth/me', payload);
        localStorage.setItem('user', JSON.stringify(res.data));
        setUser(res.data);
    }, []);

    // PUT /auth/password
    const changePassword = useCallback(async (current_password, new_password) => {
        await api.put('/auth/password', { current_password, new_password });
    }, []);

    // Expired or invalid token -> back to login
    useEffect(() => {
        const onUnauthorized = () => logout();
        window.addEventListener('fittrack:unauthorized', onUnauthorized);
        return () => window.removeEventListener('fittrack:unauthorized', onUnauthorized);
    }, [logout]);

    const value = useMemo(
        () => ({ ready, token, user, isAuthenticated: Boolean(token), login, loginDemo, register, updateProfile, changePassword, logout }),
        [ready, token, user, login, loginDemo, register, updateProfile, changePassword, logout]
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
