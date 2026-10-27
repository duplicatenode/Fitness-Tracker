'use client';

import { Skeleton } from './States';

const TONES = {
    emerald: 'bg-brand-50 text-brand-700',
    coral: 'bg-coral-50 text-coral-600',
    amber: 'bg-[#fdf4e3] text-[#b26f05]',
    sky: 'bg-[#e8f1fa] text-[#2c6aa3]'
};

/**
 * Metric tile. `trend` is optional and should only be passed when real historical data backs it:
 *   trend = { label: '+8% vs yesterday', direction: 'up' | 'down' | 'flat' }
 */
export default function MetricCard({ icon: Icon, label, value, unit, support, tone = 'emerald', loading = false, trend }) {
    return (
        <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-text-soft">{label}</p>
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
                    <Icon size={18} aria-hidden="true" />
                </div>
            </div>
            {loading ? (
                <div className="mt-3 space-y-2" role="status">
                    <span className="sr-only">Loading {label}</span>
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3.5 w-32" />
                </div>
            ) : (
                <>
                    <p className="tabular mt-2 text-[28px] font-semibold leading-none tracking-tight text-text">
                        {value}
                        {unit && <span className="ml-1 text-sm font-medium text-text-muted">{unit}</span>}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 text-[13px] text-text-muted">
                        {trend && (
                            <span className={trend.direction === 'up' ? 'font-medium text-brand-700' : trend.direction === 'down' ? 'font-medium text-coral-600' : 'font-medium'}>
                                {trend.label}
                            </span>
                        )}
                        {support && <span>{support}</span>}
                    </div>
                </>
            )}
        </div>
    );
}
