'use client';

import { useMemo, useState } from 'react';
import { NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal, { ConfirmDialog } from '../components/Modal';
import { MOODS, MoodBadge } from '../components/MoodBadge';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate, toInputDate } from '../utils/format';

function JournalForm({ entry, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(entry);
    const [title, setTitle] = useState(entry?.title || '');
    const [notes, setNotes] = useState(entry?.notes || '');
    const [mood, setMood] = useState(entry?.mood || 'neutral');
    const [tags, setTags] = useState((entry?.tags || []).join(', '));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!title.trim() && !notes.trim()) return setError('Add a title or some notes.');
        setSaving(true);
        setError('');
        const body = {
            title: title.trim(),
            notes: notes.trim(),
            mood,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
        };
        try {
            if (editing) await api.put(`/journals/${entry.id}`, body);
            else await api.post('/journals', body);
            toast.success(editing ? 'Entry updated' : 'Entry saved');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open onClose={onClose} size="lg" title={editing ? 'Edit journal entry' : 'New journal entry'}
            description="Capture how the workout felt."
            footer={<>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" form="journal-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}</button>
            </>}
        >
            <form id="journal-form" onSubmit={submit} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="j-title" className="field-label">Title</label>
                    <input id="j-title" data-autofocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leg day" maxLength={120} />
                </div>
                <div>
                    <label htmlFor="j-notes" className="field-label">Notes</label>
                    <textarea id="j-notes" className="input min-h-32" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What went well? What was hard?" />
                </div>
                <fieldset>
                    <legend className="field-label">Mood</legend>
                    <div className="flex flex-wrap gap-2">
                        {MOODS.map((m) => {
                            const Icon = m.icon;
                            const selected = mood === m.value;
                            return (
                                <label key={m.value} className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${selected ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong text-text-soft hover:bg-canvas'}`}>
                                    <input type="radio" name="mood" value={m.value} checked={selected} onChange={() => setMood(m.value)} className="sr-only" />
                                    <Icon size={15} aria-hidden="true" /> {m.label}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
                <div>
                    <label htmlFor="j-tags" className="field-label">Tags</label>
                    <input id="j-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="strength, legs, morning" />
                    <p className="mt-1.5 text-xs text-text-muted">Separate tags with commas.</p>
                </div>
                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
            </form>
        </Modal>
    );
}

export default function Journal() {
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const journals = useFetch(async () => (await api.get('/journals')).data, [refreshKey]);
    const [query, setQuery] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [form, setForm] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (journals.data || []).filter((j) => {
            if (q) {
                const hay = `${j.title} ${j.notes} ${(j.tags || []).join(' ')}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            const day = toInputDate(new Date(j.timestamp));
            if (from && day < from) return false;
            if (to && day > to) return false;
            return true;
        });
    }, [journals.data, query, from, to]);

    const hasFilters = query || from || to;
    const clear = () => { setQuery(''); setFrom(''); setTo(''); };

    const confirmDelete = async () => {
        setBusy(true);
        try {
            await api.delete(`/journals/${deleting.id}`);
            toast.success('Entry deleted');
            setDeleting(null);
            journals.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Workout journal"
                description="Notes on how your sessions felt, searchable by keyword, tag or date."
                actions={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> New entry</button>}
            />

            <div className="card mb-4 flex flex-wrap items-end gap-x-4 gap-y-3 p-4">
                <div className="min-w-56 flex-1">
                    <label htmlFor="j-search" className="mb-1 block text-xs text-text-muted">Search</label>
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                        <input id="j-search" type="search" className="input h-9 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, notes or tags" />
                    </div>
                </div>
                <div>
                    <label htmlFor="j-from" className="mb-1 block text-xs text-text-muted">From</label>
                    <input id="j-from" type="date" className="input h-9 w-auto" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="j-to" className="mb-1 block text-xs text-text-muted">To</label>
                    <input id="j-to" type="date" className="input h-9 w-auto" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </div>
                {hasFilters && <button type="button" className="btn btn-ghost h-9" onClick={clear}>Clear</button>}
            </div>

            {journals.loading ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="card p-5"><LoadingBlock rows={3} label="Loading entries" /></div>)}</div>
            ) : journals.error ? (
                <div className="card"><ErrorState message={journals.error} onRetry={journals.reload} /></div>
            ) : journals.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon={NotebookPen} title="Your journal is empty" description="Write a short note after your next workout to remember what worked."
                        action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> New entry</button>} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <EmptyState icon={Search} title="No entries match your filters" description="Try a different keyword or date range."
                        action={<button type="button" className="btn" onClick={clear}>Clear filters</button>} />
                </div>
            ) : (
                <ul className="space-y-3">
                    {filtered.map((j) => (
                        <li key={j.id} className="card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-[15px] font-semibold text-text">{j.title}</h2>
                                    <p className="mt-0.5 text-[13px] text-text-muted">{fmtDate(j.timestamp, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <MoodBadge mood={j.mood} />
                                    <button type="button" className="btn-icon" onClick={() => setForm({ entry: j })} aria-label={`Edit entry ${j.title}`} title="Edit"><Pencil size={16} /></button>
                                    <button type="button" className="btn-icon hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting(j)} aria-label={`Delete entry ${j.title}`} title="Delete"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {j.notes && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-text-soft">{j.notes}</p>}
                            {j.tags?.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                                    {j.tags.map((t) => <li key={t} className="badge bg-canvas text-text-soft">{t}</li>)}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {form && <JournalForm entry={form.entry} onClose={() => setForm(null)} onSaved={() => { setForm(null); journals.reload(); }} />}
            <ConfirmDialog
                open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busy}
                title="Delete journal entry?" message={`“${deleting?.title}” will be permanently removed. This can't be undone.`}
            />
        </>
    );
}
