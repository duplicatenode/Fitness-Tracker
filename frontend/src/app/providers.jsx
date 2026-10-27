'use client';

import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

export default function Providers({ children }) {
    return (
        <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
    );
}
