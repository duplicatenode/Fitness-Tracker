'use client';

import { useState } from 'react';
import { BookOpen, Dumbbell, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import Redirect from '../components/Redirect';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import Modal, { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';

// Admin-only: body parts and the exercises under each one (tables body_parts + exercises).
// Members never edit this; they pick body parts on Workout Plans and get these exercises.

function FormError({ message }) {
    if (!message) return null;
    return <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{message}</p>;
}

function BodyPartForm({ part, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(part);
    const [name, setName] = useState(part?.name || '');
    const [description, setDescription] = useState(part?.description || '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) return setError('Give the body part a name (at least 2 characters).');
        setSaving(true);
        setError('');
        try {
            const body = { name: name.trim(), description: description.trim() };
            if (editing) await api.put(`/admin/body-parts/${part.id}`, body);
            else await api.post('/admin/body-parts', body);
            toast.success(editing ? 'Body part updated' : 'Body part added');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="sm"
            title={editing ? 'Edit body part' : 'Add body part'}
            description="Members choose from these when they build a plan."
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" form="part-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add body part'}</button>
                </>
            }
        >
            <form id="part-form" onSubmit={submit} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="bp-name" className="field-label">Name</label>
                    <input id="bp-name" data-autofocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Glutes" maxLength={50} />
                </div>
                <div>
                    <label htmlFor="bp-desc" className="field-label">Description (optional)</label>
                    <input id="bp-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hip extensors" maxLength={255} />
                </div>
                <FormError message={error} />
            </form>
        </Modal>
    );
}

function ExerciseForm({ exercise, parts, defaultPartId, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(exercise);
    const [form, setForm] = useState({
        name: exercise?.name || '',
        body_part_id: exercise?.body_part_id || defaultPartId || parts[0]?.id || '',
        equipment_needed: exercise?.equipment_needed || '',
        default_sets: exercise?.default_sets ?? 3,
        default_reps: exercise?.default_reps ?? 10,
        description: exercise?.description || ''
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return setError('Give the exercise a name (at least 2 characters).');
        setSaving(true);
        setError('');
        try {
            const body = { ...form, name: form.name.trim(), body_part_id: Number(form.body_part_id) };
            if (editing) await api.put(`/admin/exercises/${exercise.id}`, body);
            else await api.post('/admin/exercises', body);
            toast.success(editing ? 'Exercise updated' : 'Exercise added');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? 'Edit exercise' : 'Add exercise'}
            description="The default sets and reps are copied into every plan that includes this exercise."
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" form="exercise-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add exercise'}</button>
                </>
            }
        >
            <form id="exercise-form" onSubmit={submit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="ex-name" className="field-label">Exercise name</label>
                        <input id="ex-name" data-autofocus className="input" value={form.name} onChange={set('name')} placeholder="Hip Thrust" maxLength={255} />
                    </div>
                    <div>
                        <label htmlFor="ex-part" className="field-label">Body part</label>
                        <select id="ex-part" className="input" value={form.body_part_id} onChange={set('body_part_id')}>
                            {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label htmlFor="ex-equip" className="field-label">Equipment</label>
                        <input id="ex-equip" className="input" value={form.equipment_needed} onChange={set('equipment_needed')} placeholder="Barbell" maxLength={100} />
                    </div>
                    <div>
                        <label htmlFor="ex-sets" className="field-label">Default sets</label>
                        <input id="ex-sets" type="number" min="1" max="50" className="input" value={form.default_sets} onChange={set('default_sets')} />
                    </div>
                    <div>
                        <label htmlFor="ex-reps" className="field-label">Default reps</label>
                        <input id="ex-reps" type="number" min="1" max="500" className="input" value={form.default_reps} onChange={set('default_reps')} />
                    </div>
                </div>
                <div>
                    <label htmlFor="ex-desc" className="field-label">How to do it (optional)</label>
                    <textarea id="ex-desc" className="input" value={form.description} onChange={set('description')} placeholder="Drive the hips up from a bench" />
                </div>
                <FormError message={error} />
            </form>
        </Modal>
    );
}

export default function Catalogue() {
    const { user: me } = useAuth();
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const catalogue = useFetch(async () => (await api.get('/workouts/body-parts')).data, [refreshKey]);   // same read the plan builder uses; writes go to /admin

    const [partForm, setPartForm] = useState(null);         // null | { part? }
    const [exerciseForm, setExerciseForm] = useState(null); // null | { exercise?, partId? }
    const [deleting, setDeleting] = useState(null);         // null | { kind, item }
    const [busy, setBusy] = useState(false);

    if (me && me.role !== 'admin') return <Redirect to="/" />;

    const parts = catalogue.data || [];
    const exerciseCount = parts.reduce((n, p) => n + p.exercises.length, 0);

    const saved = () => {
        setPartForm(null);
        setExerciseForm(null);
        catalogue.reload();
    };

    const confirmDelete = async () => {
        setBusy(true);
        try {
            const { kind, item } = deleting;
            await api.delete(kind === 'part' ? `/admin/body-parts/${item.id}` : `/admin/exercises/${item.id}`);
            toast.success(kind === 'part' ? 'Body part deleted' : 'Exercise deleted');
            setDeleting(null);
            catalogue.reload();
        } catch (err) {
            toast.error(errorMessage(err));   // e.g. still used in a plan: ON DELETE RESTRICT in MySQL
            setDeleting(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Exercise catalogue"
                description="Body parts members choose from, and the exercises you put under each one. A member's plan gets these exercises with your default sets and reps."
                actions={<button type="button" className="btn btn-primary" onClick={() => setPartForm({})}><Plus size={16} aria-hidden="true" /> Add body part</button>}
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard icon={Layers} label="Body parts" value={catalogue.data ? parts.length : '–'} support="Rows in body_parts" loading={catalogue.loading && !catalogue.data} tone="emerald" />
                <MetricCard icon={Dumbbell} label="Exercises" value={catalogue.data ? exerciseCount : '–'} support="Rows in exercises" loading={catalogue.loading && !catalogue.data} tone="sky" />
            </div>

            {catalogue.loading && !catalogue.data ? (
                <div className="card p-5"><LoadingBlock rows={5} label="Loading catalogue" /></div>
            ) : catalogue.error && !catalogue.data ? (
                <div className="card"><ErrorState message={catalogue.error} onRetry={catalogue.reload} /></div>
            ) : parts.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={BookOpen}
                        title="No body parts yet"
                        description="Add a body part, then add the exercises members should get for it."
                        action={<button type="button" className="btn btn-primary" onClick={() => setPartForm({})}><Plus size={16} aria-hidden="true" /> Add body part</button>}
                    />
                </div>
            ) : (
                <ul className="grid gap-4 lg:grid-cols-2">
                    {parts.map((p) => (
                        <li key={p.id} className="card overflow-hidden">
                            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                                <div className="min-w-0">
                                    <h2 className="text-[15px] font-semibold text-text">{p.name}</h2>
                                    <p className="mt-0.5 text-[13px] text-text-soft">{p.description || 'No description.'}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <button type="button" className="btn h-8" onClick={() => setExerciseForm({ partId: p.id })}><Plus size={14} aria-hidden="true" /> Exercise</button>
                                    <button type="button" className="btn-icon" onClick={() => setPartForm({ part: p })} aria-label={`Edit ${p.name}`} title="Edit body part"><Pencil size={16} /></button>
                                    <button type="button" className="btn-icon hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting({ kind: 'part', item: p })} aria-label={`Delete ${p.name}`} title="Delete body part"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {p.exercises.length === 0 ? (
                                <p className="px-5 py-4 text-[13px] text-text-muted">No exercises yet. Members can't build a plan from {p.name} until you add one.</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {p.exercises.map((e) => (
                                        <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-text">{e.name}</p>
                                                <p className="text-[13px] text-text-muted">
                                                    {[e.equipment_needed, `used in ${e.plan_count} ${e.plan_count === 1 ? 'plan' : 'plans'}`].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <span className="badge tabular bg-canvas text-text-soft">{e.default_sets} × {e.default_reps}</span>
                                            <button type="button" className="btn-icon" onClick={() => setExerciseForm({ exercise: e })} aria-label={`Edit ${e.name}`} title="Edit exercise"><Pencil size={15} /></button>
                                            <button type="button" className="btn-icon hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting({ kind: 'exercise', item: e })} aria-label={`Delete ${e.name}`} title="Delete exercise"><Trash2 size={15} /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {partForm && <BodyPartForm part={partForm.part} onClose={() => setPartForm(null)} onSaved={saved} />}
            {exerciseForm && (
                <ExerciseForm
                    exercise={exerciseForm.exercise}
                    defaultPartId={exerciseForm.partId}
                    parts={parts}
                    onClose={() => setExerciseForm(null)}
                    onSaved={saved}
                />
            )}
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                busy={busy}
                title={deleting?.kind === 'part' ? 'Delete body part?' : 'Delete exercise?'}
                message={deleting?.kind === 'part'
                    ? `"${deleting?.item.name}" can only be deleted once it has no exercises.`
                    : `"${deleting?.item.name}" will be removed from the catalogue. Exercises used in a plan or a logged set can't be deleted.`}
            />
        </>
    );
}
