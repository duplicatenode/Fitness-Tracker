import { AlertCircle, RefreshCw } from 'lucide-react';

export function Skeleton({ className = '' }) {
    return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Loading…', rows = 3 }) {
    return (
        <div role="status" aria-live="polite" className="space-y-3 py-1">
            <span className="sr-only">{label}</span>
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className={`h-4 ${i % 2 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'}`}>
            {Icon && (
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-canvas text-text-muted">
                    <Icon size={20} aria-hidden="true" />
                </div>
            )}
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-muted">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function ErrorState({ message, onRetry, compact = false }) {
    return (
        <div role="alert" className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'}`}>
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                <AlertCircle size={20} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-text">Couldn't load this data</h3>
            <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-muted">{message}</p>
            {onRetry && (
                <button type="button" className="btn mt-4" onClick={onRetry}>
                    <RefreshCw size={15} aria-hidden="true" /> Try again
                </button>
            )}
        </div>
    );
}
