'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LogOut } from 'lucide-react';
import { ADMIN_ITEM, NAV_ITEMS } from '../navigation';
import { SimulatorPill } from './SimulatorStatus';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';

export default function Sidebar({ open, onNavigate }) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const isActivePath = (path, end) => (end ? pathname === path : pathname === path || pathname.startsWith(`${path}/`));
    const items = user?.role === 'admin' ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

    return (
        <aside
            id="app-sidebar"
            className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-ink-900 text-slate-300 transition-[transform,visibility] duration-200 lg:visible lg:translate-x-0 ${
                open ? 'visible translate-x-0' : 'invisible -translate-x-full'
            }`}
        >
            <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-ink-900">
                    <Activity size={18} strokeWidth={2.5} aria-hidden="true" />
                </div>
                <span className="text-[17px] font-semibold tracking-tight text-white">FitTrack</span>
            </div>

            <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2">
                <ul className="space-y-0.5">
                    {items.map(({ path, label, icon: Icon, end }) => {
                        const isActive = isActivePath(path, end);
                        return (
                            <li key={path}>
                                <Link
                                    href={path}
                                    onClick={onNavigate}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive ? 'bg-ink-700 text-white' : 'text-slate-400 hover:bg-ink-800 hover:text-white'
                                    }`}
                                >
                                    {isActive && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r bg-brand-500" aria-hidden="true" />}
                                    <Icon size={18} className={isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} aria-hidden="true" />
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="shrink-0 space-y-3 border-t border-ink-700 p-3">
                <SimulatorPill dark />
                <div className="flex items-center gap-1 px-1">
                    <Link href="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-ink-800" aria-label="My profile">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-[13px] font-semibold text-white" aria-hidden="true">
                            {initials(user?.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-white">{user?.name || 'Your account'}</p>
                            <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
                        aria-label="Log out"
                        title="Log out"
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
