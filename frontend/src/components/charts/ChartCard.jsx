import { BarChart3 } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '../States';

/** Card wrapper for charts that handles loading / error / empty states consistently. */
export default function ChartCard({
    title, subtitle, note, loading, error, onRetry, empty, emptyTitle = 'No data for this period',
    emptyDescription = 'Readings will appear here once the wearable simulator has sent data.',
    height = 280, children, className = ''
}) {
    return (
        <section className={`card p-5 ${className}`} aria-label={title}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="card-title">{title}</h2>
                    {subtitle && <p className="card-sub mt-0.5">{subtitle}</p>}
                </div>
                {note && <span className="badge shrink-0 bg-canvas text-text-soft">{note}</span>}
            </div>
            <div style={{ height }}>
                {loading ? (
                    <div role="status" className="flex h-full flex-col justify-end gap-2">
                        <span className="sr-only">Loading chart</span>
                        <Skeleton className="h-full w-full" />
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={onRetry} compact />
                ) : empty ? (
                    <EmptyState icon={BarChart3} title={emptyTitle} description={emptyDescription} compact />
                ) : (
                    children
                )}
            </div>
        </section>
    );
}

export const SIMULATED_NOTE = 'Simulated wearable';
