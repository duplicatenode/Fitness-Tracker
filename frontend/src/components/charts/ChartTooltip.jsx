'use client';

export default function ChartTooltip({ active, label, rows = [], title }) {
    if (!active || rows.length === 0) return null;
    return (
        <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] shadow-[var(--shadow-pop)]">
            <p className="mb-1.5 font-medium text-text">{title || label}</p>
            <ul className="space-y-1">
                {rows.map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-6">
                        <span className="flex items-center gap-2 text-text-soft">
                            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
                            {r.label}
                        </span>
                        <span className="tabular font-medium text-text">{r.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
