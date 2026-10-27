'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Redirect from './Redirect';
import { LoadingBlock } from './States';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';
import { PageControlsProvider } from '../context/PageControlsContext';
import { SimulatorProvider } from '../context/SimulatorContext';

// Shared layout for every signed-in page (used by src/app/(app)/layout.jsx)
export default function AppShell({ children }) {
    const { ready, isAuthenticated } = useAuth();
    const pathname = usePathname();
    // The drawer is "open for" a specific path, so it closes by itself when the route changes
    const [openPath, setOpenPath] = useState(null);
    const menuOpen = openPath === pathname;
    const setMenuOpen = (open) => setOpenPath(open ? pathname : null);

    // Close the mobile drawer with Escape
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [menuOpen]);

    if (!ready) return <div className="p-8"><LoadingBlock /></div>;
    if (!isAuthenticated) return <Redirect to="/login" />;

    return (
        <PageControlsProvider>
            <SimulatorProvider>
                <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-[var(--shadow-pop)]">
                    Skip to main content
                </a>
                <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
                {menuOpen && <div className="fixed inset-0 z-30 bg-ink-900/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
                <div className="min-h-screen lg:pl-[256px]">
                    <Header onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />
                    <main id="main" className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        {children}
                    </main>
                </div>
            </SimulatorProvider>
        </PageControlsProvider>
    );
}
