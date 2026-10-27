'use client';

export default function PageHeader({ title, description, actions }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-text">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-text-soft">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
