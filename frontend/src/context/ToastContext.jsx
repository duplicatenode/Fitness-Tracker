import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

    const push = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    }, [dismiss]);

    const value = useMemo(() => ({
        success: (m) => push(m, 'success'),
        error: (m) => push(m, 'error')
    }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role={t.type === 'error' ? 'alert' : 'status'}
                        className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm shadow-[var(--shadow-pop)]"
                    >
                        {t.type === 'error'
                            ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-coral-600" aria-hidden="true" />
                            : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />}
                        <p className="flex-1 text-text">{t.message}</p>
                        <button type="button" onClick={() => dismiss(t.id)} className="text-text-muted hover:text-text" aria-label="Dismiss notification">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
