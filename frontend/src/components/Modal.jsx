'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
    const panelRef = useRef(null);
    const lastFocused = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        lastFocused.current = document.activeElement;
        document.body.style.overflow = 'hidden';

        const panel = panelRef.current;
        const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
        first?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== 'Tab' || !panel) return;
            const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'));
            if (items.length === 0) return;
            const firstEl = items[0];
            const lastEl = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            lastFocused.current?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby={description ? 'modal-desc' : undefined}
                className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl ${widths[size]}`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                    <div>
                        <h2 id="modal-title" className="text-base font-semibold text-text">{title}</h2>
                        {description && <p id="modal-desc" className="mt-0.5 text-[13px] text-text-muted">{description}</p>}
                    </div>
                    <button type="button" className="btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
            </div>
        </div>
    );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy = false }) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose} data-autofocus>Cancel</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </>
            }
        >
            <p className="text-sm leading-relaxed text-text-soft">{message}</p>
        </Modal>
    );
}
