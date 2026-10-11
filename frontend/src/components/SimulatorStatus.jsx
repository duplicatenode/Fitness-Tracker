import { Watch } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { humanize, timeAgo } from '../utils/format';

export const STATUS_META = {
    connected: { label: 'Connected', dot: 'bg-brand-500', text: 'text-brand-700', pill: 'bg-brand-50 text-brand-700' },
    no_recent_readings: { label: 'No recent readings', dot: 'bg-amber-data', text: 'text-[#b26f05]', pill: 'bg-[#fdf4e3] text-[#b26f05]' },
    disconnected: { label: 'Disconnected', dot: 'bg-[#98a2b3]', text: 'text-text-soft', pill: 'bg-canvas text-text-soft' }
};

/** Compact pill for the header / sidebar. `dark` renders it for the navy sidebar. */
export function SimulatorPill({ dark = false }) {
    const { status, loading, latest, unreachable } = useSimulator();
    const meta = STATUS_META[status];
    const label = loading ? 'Checking…' : unreachable ? 'Server unreachable' : meta.label;
    const dotColor = loading ? 'bg-[#98a2b3]' : meta.dot;

    return (
        <div
            className={`rounded-lg px-3 py-2.5 ${dark ? 'bg-ink-800' : 'bg-canvas'}`}
            role="status"
            aria-label={`Wearable simulator: ${label}`}
        >
            <div className="flex items-center gap-2.5">
                <span className="relative flex size-2 shrink-0">
                    {status === 'connected' && !loading && (
                        <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dotColor}`} />
                    )}
                    <span className={`relative inline-flex size-2 rounded-full ${dotColor}`} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium ${dark ? 'text-white' : 'text-text'}`}>Wearable simulator</p>
                    <p className={`truncate text-xs ${dark ? 'text-slate-400' : 'text-text-muted'}`}>
                        {label}
                        {status === 'connected' && latest ? ` · ${latest.heart_rate} bpm` : ''}
                    </p>
                </div>
                <Watch size={16} className={dark ? 'text-slate-500' : 'text-text-muted'} aria-hidden="true" />
            </div>
        </div>
    );
}

/** Larger panel for the dashboard. */
export function SimulatorPanel() {
    const { status, loading, latest, ageSeconds, unreachable, error } = useSimulator();
    const meta = STATUS_META[status];

    return (
        <div className="card flex h-full flex-col p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="card-title">Simulator status</h2>
                    <p className="card-sub mt-0.5">Simulated wearable feeding live readings</p>
                </div>
                <span className={`badge ${loading ? 'bg-canvas text-text-soft' : meta.pill}`}>
                    <span className={`size-1.5 rounded-full ${loading ? 'bg-[#98a2b3]' : meta.dot}`} />
                    {loading ? 'Checking…' : unreachable ? 'Server unreachable' : meta.label}
                </span>
            </div>

            {unreachable ? (
                <p className="mt-5 text-[13px] leading-relaxed text-text-muted">{error}</p>
            ) : latest ? (
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                        <dt className="text-xs text-text-muted">Last reading</dt>
                        <dd className="mt-0.5 text-sm font-medium text-text">{timeAgo(latest.timestamp)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-text-muted">Activity state</dt>
                        <dd className="mt-0.5 text-sm font-medium text-text">{humanize(latest.activity_state)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-text-muted">Heart rate</dt>
                        <dd className="tabular mt-0.5 text-sm font-medium text-text">{latest.heart_rate} bpm</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-text-muted">Steps in last reading</dt>
                        <dd className="tabular mt-0.5 text-sm font-medium text-text">+{latest.step_increment}</dd>
                    </div>
                </dl>
            ) : (
                <p className="mt-5 text-[13px] leading-relaxed text-text-muted">
                    No readings have been received yet. Start the simulator with <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">node simulator/wearableSimulator.js</code>.
                </p>
            )}

            {status === 'no_recent_readings' && ageSeconds != null && (
                <p className="mt-4 text-[13px] text-text-muted">
                    Readings usually arrive every few seconds. The simulator may have been stopped.
                </p>
            )}
        </div>
    );
}
