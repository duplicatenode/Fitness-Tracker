'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, RefreshCw } from 'lucide-react';
import { findNavItem } from '../navigation';
import { RANGE_OPTIONS, usePageControls } from '../context/PageControlsContext';
import { useAuth } from '../context/AuthContext';
import { fmtDate, initials } from '../utils/format';

export default function Header({ onMenu, menuOpen }) {
    const pathname = usePathname();
    const item = findNavItem(pathname);
    const { range, setRange, refresh } = usePageControls();
    const { user } = useAuth();
    const [spinning, setSpinning] = useState(false);

    const onRefresh = () => {
        setSpinning(true);
        refresh();
        setTimeout(() => setSpinning(false), 700);
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <button
                type="button"
                className="btn-icon -ml-2 lg:hidden"
                onClick={onMenu}
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="app-sidebar"
            >
                <Menu size={20} />
            </button>

            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                <ol className="flex items-center gap-1.5 text-sm">
                    <li className="hidden text-text-muted sm:block">FitTrack</li>
                    <li className="hidden text-text-muted sm:block" aria-hidden="true"><ChevronRight size={14} /></li>
                    <li className="truncate font-semibold text-text" aria-current="page">{item.label}</li>
                </ol>
            </nav>

            <p className="hidden text-[13px] text-text-muted md:block">
                {fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {item.ranged && (
                <div>
                    <label htmlFor="range-select" className="sr-only">Date range</label>
                    <select
                        id="range-select"
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-[13px] font-medium text-text transition-colors hover:bg-canvas focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
                    >
                        {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            )}

            <button type="button" className="btn-icon border-line-strong" onClick={onRefresh} aria-label="Refresh data" title="Refresh data">
                <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
            </button>

            <Link
                href="/profile"
                className="hidden size-9 items-center justify-center rounded-full bg-ink-900 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 sm:flex"
                title="My profile"
                aria-label={`My profile (${user?.name || 'user'})`}
            >
                {initials(user?.name)}
            </Link>
        </header>
    );
}
