'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Eye, ListChecks, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal, { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate } from '../utils/format';

function PlanForm({ plan, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(plan);
    // The catalogue an admin maintains: body parts, each with its exercises and default sets x reps
    const catalogue = useFetch(async () => (await api.get('/workouts/body-parts')).data, []);
    const detail = useFetch(async () => (await api.get(`/workouts/plans/${plan.id}`)).data, [plan?.id], { enabled: editing });

    const [name, setName] = useState(plan?.name || '');
    const [description, setDescription] = useState(plan?.description || '');
    const [picked, setPicked] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (detail.data) setPicked(detail.data.body_part_ids || []);
    }, [detail.data]);

    const toggle = (id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    const parts = catalogue.data || [];
    const included = parts.filter((p) => picked.includes(p.id)).flatMap((p) => p.exercises);

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError('Give the plan a name.');
        if (picked.length === 0) return setError('Choose at least one body part.');
        setSaving(true);
        setError('');
        const body = { name: name.trim(), description: description.trim(), body_part_ids: picked };
        try {
            if (editing) await api.put(`/workouts/plans/${plan.id}`, body);
            else await api.post('/workouts/plans', body);
            toast.success(editing ? 'Plan updated' : 'Plan created');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    const loadingEdit = editing && detail.loading;

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={editing ? 'Edit workout plan' : 'Create workout plan'}
            description="Name your plan and pick the body parts to train. The exercises come from the catalogue your admin set up."
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" form="plan-form" className="btn btn-primary" disabled={saving || loadingEdit}>
                        {saving ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}
                    </button>
                </>
            }
        >
            <form id="plan-form" onSubmit={submit} className="space-y-5" noValidate>
                <div>
                    <label htmlFor="plan-name" className="field-label">Plan name</label>
                    <input id="plan-name" data-autofocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Upper body day" maxLength={255} />
                </div>
                <div>
                    <label htmlFor="plan-desc" className="field-label">Description</label>
                    <textarea id="plan-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this plan for?" />
                </div>

                <fieldset>
                    <legend className="field-label">Body parts</legend>
                    {loadingEdit || catalogue.loading ? <LoadingBlock rows={2} /> : catalogue.error ? (
                        <p className="text-[13px] text-coral-600" role="alert">{catalogue.error}</p>
                    ) : parts.length === 0 ? (
                        <p className="text-[13px] text-text-muted">No body parts yet. Ask an admin to set up the exercise catalogue.</p>
                    ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {parts.map((p) => {
                                const on = picked.includes(p.id);
                                const empty = p.exercises.length === 0;
                                return (
                                    <li key={p.id}>
                                        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${on ? 'border-brand-500 bg-brand-50' : 'border-line hover:bg-canvas'} ${empty ? 'cursor-not-allowed opacity-60' : ''}`}>
                                            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-brand-600)]" checked={on} disabled={empty} onChange={() => toggle(p.id)} />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium text-text">{p.name}</span>
                                                <span className="block truncate text-xs text-text-muted">
                                                    {empty ? 'No exercises yet' : p.exercises.map((e) => e.name).join(', ')}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </fieldset>

                {included.length > 0 && (
                    <div className="rounded-lg border border-line bg-canvas/60 p-3">
                        <p className="mb-2 text-xs font-medium text-text-soft">Your plan will include {included.length} {included.length === 1 ? 'exercise' : 'exercises'}:</p>
                        <ul className="space-y-1">
                            {included.map((e) => (
                                <li key={e.id} className="flex justify-between gap-3 text-[13px]">
                                    <span className="text-text">{e.name}</span>
                                    <span className="tabular text-text-muted">{e.default_sets} × {e.default_reps}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
            </form>
        </Modal>
    );
}

function PlanDetail({ plan, onClose, onEdit, onStart, starting }) {
    const { data, loading, error, reload } = useFetch(async () => (await api.get(`/workouts/plans/${plan.id}`)).data, [plan.id]);
    return (
        <Modal
            open
            onClose={onClose}
            title={plan.name}
            description={plan.description || undefined}
            footer={
                <>
                    <button type="button" className="btn" onClick={onEdit}><Pencil size={15} aria-hidden="true" /> Edit</button>
                    <button type="button" className="btn btn-primary" onClick={onStart} disabled={starting}>
                        <Play size={15} aria-hidden="true" /> {starting ? 'Starting…' : 'Start session'}
                    </button>
                </>
            }
        >
            {loading ? <LoadingBlock rows={4} /> : error ? <ErrorState message={error} onRetry={reload} compact /> : data.exercises.length === 0 ? (
                <EmptyState icon={ListChecks} compact title="No exercises in this plan" description="Edit the plan and pick body parts." />
            ) : (
                <ol className="divide-y divide-line">
                    {data.exercises.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                            <div>
                                <p className="text-sm font-medium text-text">{e.name}</p>
                                <p className="text-[13px] text-text-muted">{[e.body_part, e.equipment_needed].filter(Boolean).join(' · ')}</p>
                            </div>
                            <p className="tabular shrink-0 text-[13px] text-text-soft">{e.sets} × {e.reps}{e.rest_seconds ? ` · ${e.rest_seconds}s rest` : ''}</p>
                        </li>
                    ))}
                </ol>
            )}
        </Modal>
    );
}

export default function Plans() {
    const router = useRouter();
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const plans = useFetch(async () => (await api.get('/workouts/plans')).data, [refreshKey]);

    const [form, setForm] = useState(null);       // null | { plan?: plan }
    const [viewing, setViewing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const startSession = async (plan) => {
        setBusy(true);
        try {
            await api.post('/workouts/sessions', { plan_id: plan.id });
            toast.success('Session started');
            router.push('/history');
        } catch (err) {
            toast.error(errorMessage(err));
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        setBusy(true);
        try {
            await api.delete(`/workouts/plans/${deleting.id}`);
            toast.success('Plan deleted');
            setDeleting(null);
            plans.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Workout plans"
                description="Build routines you can start as a session whenever you train."
                actions={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Create workout plan</button>}
            />

            {plans.loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="card p-5"><LoadingBlock rows={4} label="Loading plans" /></div>)}
                </div>
            ) : plans.error ? (
                <div className="card"><ErrorState message={plans.error} onRetry={plans.reload} /></div>
            ) : plans.data.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Dumbbell}
                        title="No workout plans yet"
                        description="Create a plan by picking the body parts you want to train."
                        action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Create workout plan</button>}
                    />
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {plans.data.map((p) => (
                        <li key={p.id} className="card flex flex-col p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                                    <Dumbbell size={19} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-[15px] font-semibold text-text">{p.name}</h2>
                                    <p className="text-[13px] text-text-muted">Created {fmtDate(p.created_at)}</p>
                                </div>
                            </div>
                            <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-text-soft">{p.description || 'No description.'}</p>
                            {p.body_parts && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {p.body_parts.split(', ').map((bp) => <span key={bp} className="badge bg-brand-50 text-brand-700">{bp}</span>)}
                                </div>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="badge bg-canvas text-text-soft">{p.exercise_count} {p.exercise_count === 1 ? 'exercise' : 'exercises'}</span>
                                <span className="badge bg-canvas text-text-soft">{p.session_count} {p.session_count === 1 ? 'session' : 'sessions'}</span>
                            </div>
                            <div className="mt-5 flex items-center gap-1 border-t border-line pt-4">
                                <button type="button" className="btn flex-1" onClick={() => setViewing(p)}><Eye size={15} aria-hidden="true" /> View</button>
                                <button type="button" className="btn-icon" onClick={() => setForm({ plan: p })} aria-label={`Edit ${p.name}`} title="Edit"><Pencil size={16} /></button>
                                <button type="button" className="btn-icon hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} title="Delete"><Trash2 size={16} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {form && (
                <PlanForm
                    plan={form.plan}
                    onClose={() => setForm(null)}
                    onSaved={() => { setForm(null); plans.reload(); }}
                />
            )}
            {viewing && (
                <PlanDetail
                    plan={viewing}
                    starting={busy}
                    onClose={() => setViewing(null)}
                    onEdit={() => { setForm({ plan: viewing }); setViewing(null); }}
                    onStart={() => startSession(viewing)}
                />
            )}
            <ConfirmDialog
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                busy={busy}
                title="Delete workout plan?"
                message={`“${deleting?.name}” will be removed along with its exercises. Past sessions that used it are kept.`}
            />
        </>
    );
}
