import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '@/config/runtime';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved token on startup and validate with backend
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                setIsAuthenticated(true);
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await fetch(apiUrl('/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw { response: { data: err } };
        }

        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        return true;
    };

    const register = async (email, password, name, disclaimerData) => {
        const res = await fetch(apiUrl('/auth/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email,
                password,
                name,
                disclaimer_accepted: disclaimerData?.accepted || true,
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw { response: { data: err } };
        }

        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        return true;
    };

    const logout = () => {
        const token = localStorage.getItem('token');
        // Best-effort server logout
        if (token) {
            fetch(apiUrl('/auth/logout'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include',
            }).catch(() => {});
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    if (loading) {
        return null; // or a loading spinner
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
