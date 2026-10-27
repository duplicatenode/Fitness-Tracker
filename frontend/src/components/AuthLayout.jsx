'use client';

import { Activity, Flame, Footprints, Heart } from 'lucide-react';

/** Split layout shared by the Sign in and Create account pages. */
export default function AuthLayout({ children, wide = false }) {
    return (
        <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
            <div className="relative hidden flex-col justify-between bg-ink-900 p-12 text-slate-300 lg:flex">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-ink-900">
                        <Activity size={20} strokeWidth={2.5} aria-hidden="true" />
                    </div>
                    <span className="text-lg font-semibold text-white">FitTrack</span>
                </div>
                <div className="max-w-md">
                    <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-white">
                        Your training, heart rate and goals in one place.
                    </h2>
                    <ul className="mt-8 space-y-4 text-[15px]">
                        <li className="flex items-center gap-3"><Heart size={18} className="text-coral-500" aria-hidden="true" /> Live heart rate from your wearable</li>
                        <li className="flex items-center gap-3"><Footprints size={18} className="text-brand-400" aria-hidden="true" /> Daily steps and calories at a glance</li>
                        <li className="flex items-center gap-3"><Flame size={18} className="text-amber-data" aria-hidden="true" /> Plans, sessions and goals that stay in sync</li>
                    </ul>
                </div>
                <p className="text-[13px] text-slate-500">Activity readings come from a simulated wearable.</p>
            </div>

            <main className="flex items-start justify-center px-5 py-10 sm:px-8 lg:items-center lg:py-12">
                <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'}`}>
                    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-ink-900">
                            <Activity size={20} strokeWidth={2.5} aria-hidden="true" />
                        </div>
                        <span className="text-lg font-semibold">FitTrack</span>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
