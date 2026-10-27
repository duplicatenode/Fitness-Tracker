'use client';

import { useState } from 'react';
import { Images, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal, { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate, toInputDate } from '../utils/format';
import { Image as ImageIcon } from 'lucide-react';

function PhotoForm({ onClose, onSaved }) {
    const toast = useToast();
    const [caption, setCaption] = useState('');
    const [date, setDate] = useState(toInputDate());
    const [tags, setTags] = useState('');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!caption.trim()) return setError('Add a caption.');
        if (url && !/^https?:\/\//i.test(url)) return setError('The image link must start with http:// or https://');
        setSaving(true);
        setError('');
        try {
            await api.post('/photos', {
                caption: caption.trim(), date,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                image_url: url.trim() || undefined
            });
            toast.success('Photo entry added');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open onClose={onClose} title="Add progress photo entry"
            description="Saves a caption, date and tags. Photo files themselves aren't uploaded."
            footer={<>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" form="photo-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add entry'}</button>
            </>}
        >
            <form id="photo-form" onSubmit={submit} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="p-caption" className="field-label">Caption</label>
                    <input id="p-caption" data-autofocus className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Week 4 front check-in" maxLength={160} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="p-date" className="field-label">Date</label>
                        <input id="p-date" type="date" className="input" value={date} max={toInputDate()} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="p-tags" className="field-label">Tags</label>
                        <input id="p-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="front, week-4" />
                    </div>
                </div>
                <div>
                    <label htmlFor="p-url" className="field-label">Image link (optional)</label>
                    <input id="p-url" type="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </div>
                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
            </form>
        </Modal>
    );
}

function Thumb({ photo }) {
    const [failed, setFailed] = useState(false);
    if (photo.image_url && !failed) {
        return <img src={photo.image_url} alt={photo.caption} loading="lazy" onError={() => setFailed(true)} className="aspect-[4/3] w-full rounded-lg object-cover" />;
    }
    return (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-canvas text-line-strong" role="img" aria-label="No image available">
            <ImageIcon size={32} aria-hidden="true" />
        </div>
    );
}

export default function Gallery() {
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const photos = useFetch(async () => (await api.get('/photos')).data, [refreshKey]);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const confirmDelete = async () => {
        setBusy(true);
        try {
            await api.delete(`/photos/${deleting.id}`);
            toast.success('Photo entry deleted');
            setDeleting(null);
            photos.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Progress gallery"
                description="Captions, dates and tags for your progress photos."
                actions={<button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Add entry</button>}
            />

            {photos.loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="card p-4"><LoadingBlock rows={4} label="Loading gallery" /></div>)}
                </div>
            ) : photos.error ? (
                <div className="card"><ErrorState message={photos.error} onRetry={photos.reload} /></div>
            ) : photos.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon={Images} title="No progress photo entries yet"
                        description="Add an entry with a caption, date and tags to start building your timeline."
                        action={<button type="button" className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" /> Add entry</button>} />
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {photos.data.map((p) => (
                        <li key={p.id} className="card flex flex-col p-3">
                            <Thumb photo={p} />
                            <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium leading-snug text-text">{p.caption || 'Untitled'}</p>
                                    <button type="button" className="btn-icon -mr-1.5 -mt-1.5 size-8 shrink-0 hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting(p)} aria-label={`Delete entry ${p.caption}`} title="Delete"><Trash2 size={15} /></button>
                                </div>
                                <p className="mt-0.5 text-[13px] text-text-muted">{fmtDate(p.date || p.timestamp)}</p>
                                {p.tags?.length > 0 && (
                                    <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Tags">
                                        {p.tags.map((t) => <li key={t} className="badge bg-canvas text-text-soft">{t}</li>)}
                                    </ul>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {adding && <PhotoForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); photos.reload(); }} />}
            <ConfirmDialog
                open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busy}
                title="Delete photo entry?" message="This removes the caption, date and tags. Any image you linked is not affected."
            />
        </>
    );
}
