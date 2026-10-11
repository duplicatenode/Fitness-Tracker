import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Eye, ListChecks, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal, { ConfirmDialog } from '../components/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate } from '../utils/format';

const blankRow = (exercises) => ({ exercise_id: exercises[0]?.id ?? '', sets: 3, reps: 10, rest_seconds: 60 });

function PlanForm({ plan, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(plan);
    const exercises = useFetch(async () => (await api.get('/workouts/exercises')).data, []);
    const detail = useFetch(async () => (await api.get(`/workouts/plans/${plan.id}`)).data, [plan?.id], { enabled: editing });

    const [name, setName] = useState(plan?.name || '');
    const [description, setDescription] = useState(plan?.description || '');
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (detail.data) {
            setRows(detail.data.exercises.map((e) => ({ exercise_id: e.exercise_id, sets: e.sets, reps: e.reps, rest_seconds: e.rest_seconds ?? 60 })));
        }
    }, [detail.data]);

    const setRow = (i, patch) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

    const submit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError('Give the plan a name.');
        setSaving(true);
        setError('');
        const body = { name: name.trim(), description: description.trim(), exercises: rows.filter((r) => r.exercise_id) };
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
            description="Name your plan and choose the exercises it includes."
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
                    <input id="plan-name" data-autofocus className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full body strength" maxLength={255} />
                </div>
                <div>
                    <label htmlFor="plan-desc" className="field-label">Description</label>
                    <textarea id="plan-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this plan for?" />
                </div>

                <fieldset>
                    <legend className="field-label">Exercises</legend>
                    {loadingEdit || exercises.loading ? <LoadingBlock rows={2} /> : exercises.error ? (
                        <p className="text-[13px] text-coral-600" role="alert">{exercises.error}</p>
                    ) : (
                        <>
                            {rows.length === 0 && <p className="mb-3 text-[13px] text-text-muted">No exercises added yet.</p>}
                            <ul className="space-y-3">
                                {rows.map((row, i) => (
                                    <li key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_72px_72px_88px_auto] sm:items-end">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label htmlFor={`ex-${i}`} className="mb-1 block text-xs text-text-muted">Exercise</label>
                                            <select id={`ex-${i}`} className="input" value={row.exercise_id} onChange={(e) => setRow(i, { exercise_id: Number(e.target.value) })}>
                                                {exercises.data.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}{ex.muscle_group ? ` · ${ex.muscle_group}` : ''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor={`sets-${i}`} className="mb-1 block text-xs text-text-muted">Sets</label>
                                            <input id={`sets-${i}`} type="number" min="1" className="input" value={row.sets} onChange={(e) => setRow(i, { sets: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor={`reps-${i}`} className="mb-1 block text-xs text-text-muted">Reps</label>
                                            <input id={`reps-${i}`} type="number" min="1" className="input" value={row.reps} onChange={(e) => setRow(i, { reps: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor={`rest-${i}`} className="mb-1 block text-xs text-text-muted">Rest (s)</label>
                                            <input id={`rest-${i}`} type="number" min="0" className="input" value={row.rest_seconds} onChange={(e) => setRow(i, { rest_seconds: e.target.value })} />
                                        </div>
                                        <button type="button" className="btn-icon col-start-2 row-start-3 justify-self-end sm:col-start-auto sm:row-start-auto" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} aria-label={`Remove exercise ${i + 1}`}>
                                            <X size={17} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <button type="button" className="btn mt-3" onClick={() => setRows((r) => [...r, blankRow(exercises.data)])} disabled={exercises.data.length === 0}>
                                <Plus size={15} aria-hidden="true" /> Add exercise
                            </button>
                        </>
                    )}
                </fieldset>

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
                <EmptyState icon={ListChecks} compact title="No exercises in this plan" description="Edit the plan to add exercises." />
            ) : (
                <ol className="divide-y divide-line">
                    {data.exercises.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                            <div>
                                <p className="text-sm font-medium text-text">{e.name}</p>
                                <p className="text-[13px] text-text-muted">{[e.muscle_group, e.equipment_needed].filter(Boolean).join(' · ')}</p>
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
    const navigate = useNavigate();
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
            navigate('/history');
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
                        description="Create your first plan to organise your exercises, sets and reps."
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
