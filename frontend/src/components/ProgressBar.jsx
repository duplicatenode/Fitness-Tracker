'use client';

const TONES = { emerald: 'bg-brand-500', coral: 'bg-coral-500', amber: 'bg-amber-data', sky: 'bg-sky-data' };

export default function ProgressBar({ value, tone = 'emerald', label }) {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
        <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
            className="h-2 w-full overflow-hidden rounded-full bg-canvas ring-1 ring-inset ring-line"
        >
            <div className={`h-full rounded-full transition-[width] duration-500 ${TONES[tone]}`} style={{ width: `${pct}%` }} />
        </div>
    );
}
