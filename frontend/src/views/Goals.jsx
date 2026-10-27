'use client';

import { useState } from 'react';
import { CalendarClock, Flame, Footprints, Dumbbell, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal, { ConfirmDialog } from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate, fmtNumber, humanize, toInputDate } from '../utils/format';

const GOAL_TYPES = [
    { value: 'weekly_workouts', label: 'Weekly workouts', hint: 'Sessions started between the start date and deadline', unit: 'workouts', icon: Dumbbell },
    { value: 'daily_steps', label: 'Daily steps', hint: "Compared with today's steps from the wearable", unit: 'steps', icon: Footprints },
    { value: 'daily_calories', label: 'Daily calories', hint: "Compared with today's estimated calories", unit: 'kcal', icon: Flame },
    { value: 'custom', label: 'Custom goal', hint: "Progress isn't measured automatically for custom goals", unit: '', icon: Target }
];
const iconFor = (type) => GOAL_TYPES.find((t) => t.value === type)?.icon || Target;

const todayStr = () => toInputDate();

// Active goals whose deadline has passed are shown as "Past deadline" (derived from the stored deadline)
function statusOf(goal) {
    if (goal.status === 'completed') return { label: 'Completed', cls: 'bg-brand-50 text-brand-700' };
    if (goal.status === 'overdue' || (goal.deadline && goal.deadline < todayStr())) return { label: 'Past deadline', cls: 'bg-coral-50 text-coral-600' };
    return { label: 'Active', cls: 'bg-[#e8f1fa] text-[#2c6aa3]' };
}

function GoalForm({ goal, onClose, onSaved }) {
    const toast = useToast();
    const editing = Boolean(goal);
    const known = GOAL_TYPES.find((t) => t.value === goal?.goal_type);
    const [type, setType] = useState(goal ? (known ? goal.goal_type : 'custom') : 'weekly_workouts');
    const [customName, setCustomName] = useState(goal && !known ? goal.goal_type : '');
    const [target, setTarget] = useState(goal?.target_value ?? '');
    const [start, setStart] = useState(goal?.start_date || todayStr());
    const [deadline, setDeadline] = useState(goal?.deadline || '');
    const [status, setStatus] = useState(goal?.status || 'active');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const meta = GOAL_TYPES.find((t) => t.value === type);

    const submit = async (e) => {
        e.preventDefault();
        const goal_type = type === 'custom' ? customName.trim() : type;
        if (!goal_type) return setError('Name your custom goal.');
        if (!(Number(target) > 0)) return setError('Enter a target greater than zero.');
        if (deadline && deadline < start) return setError('The deadline must be on or after the start date.');
        setSaving(true);
        setError('');
        const body = { goal_type, target_value: Number(target), start_date: start, deadline: deadline || null, status };
        try {
            if (editing) await api.put(`/goals/${goal.id}`, body);
            else await api.post('/goals', body);
            toast.success(editing ? 'Goal updated' : 'Goal created');
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open onClose={onClose} title={editing ? 'Edit goal' : 'Create goal'}
            description="Choose what you want to achieve and by when."
            footer={<>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" form="goal-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}</button>
            </>}
        >
            <form id="goal-form" onSubmit={submit} className="space-y-4" noValidate>
                <div>
                    <label htmlFor="g-type" className="field-label">Goal type</label>
                    <select id="g-type" data-autofocus className="input" value={type} onChange={(e) => setType(e.target.value)}>
                        {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <p className="mt-1.5 text-xs text-text-muted">{meta.hint}</p>
                </div>
                {type === 'custom' && (
                    <div>
                        <label htmlFor="g-name" className="field-label">Goal name</label>
                        <input id="g-name" className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Run 5 km" maxLength={50} />
                    </div>
                )}
                <div>
                    <label htmlFor="g-target" className="field-label">Target{meta.unit ? ` (${meta.unit})` : ''}</label>
                    <input id="g-target" type="number" min="1" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="g-start" className="field-label">Start date</label>
                        <input id="g-start" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="g-deadline" className="field-label">Deadline (optional)</label>
                        <input id="g-deadline" type="date" className="input" value={deadline} min={start} onChange={(e) => setDeadline(e.target.value)} />
                    </div>
                </div>
                {editing && (
                    <div>
                        <label htmlFor="g-status" className="field-label">Status</label>
                        <select id="g-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                )}
                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
            </form>
        </Modal>
    );
}

export default function Goals() {
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const goals = useFetch(async () => (await api.get('/goals')).data, [refreshKey]);
    const [form, setForm] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const confirmDelete = async () => {
        setBusy(true);
        try {
            await api.delete(`/goals/${deleting.id}`);
            toast.success('Goal deleted');
            setDeleting(null);
            goals.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Fitness goals"
                description="Set targets and see how close you are, based on your real sessions and activity."
                actions={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Create goal</button>}
            />

            {goals.loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="card p-5"><LoadingBlock rows={4} label="Loading goals" /></div>)}
                </div>
            ) : goals.error ? (
                <div className="card"><ErrorState message={goals.error} onRetry={goals.reload} /></div>
            ) : goals.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon={Target} title="No goals yet" description="Create a goal for weekly workouts, daily steps or calories and track it here."
                        action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} aria-hidden="true" /> Create goal</button>} />
                </div>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {goals.data.map((g) => {
                        const Icon = iconFor(g.goal_type);
                        const st = statusOf(g);
                        return (
                            <li key={g.id} className="card flex flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={19} aria-hidden="true" /></div>
                                        <h2 className="truncate text-[15px] font-semibold text-text">{humanize(g.goal_type)}</h2>
                                    </div>
                                    <span className={`badge shrink-0 ${st.cls}`}>{st.label}</span>
                                </div>

                                <dl className="mt-4 flex items-baseline justify-between text-[13px]">
                                    <div><dt className="text-text-muted">Target</dt><dd className="tabular mt-0.5 text-base font-semibold text-text">{fmtNumber(g.target_value)}{g.unit ? <span className="ml-1 text-[13px] font-medium text-text-muted">{g.unit}</span> : null}</dd></div>
                                    {g.tracked && <div className="text-right"><dt className="text-text-muted">Current</dt><dd className="tabular mt-0.5 text-base font-semibold text-text">{fmtNumber(g.current_value)}</dd></div>}
                                </dl>

                                <div className="mb-5 mt-3">
                                    {g.tracked ? (
                                        <>
                                            <ProgressBar value={g.progress_pct} label={`${humanize(g.goal_type)} progress`} tone={g.progress_pct >= 100 ? 'emerald' : 'sky'} />
                                            <p className="tabular mt-1.5 text-xs text-text-muted">{g.progress_pct}% complete</p>
                                        </>
                                    ) : (
                                        <p className="text-[13px] leading-relaxed text-text-muted">Progress isn't tracked automatically for this goal.</p>
                                    )}
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
                                    <p className="flex items-center gap-1.5 text-[13px] text-text-muted">
                                        <CalendarClock size={14} aria-hidden="true" />
                                        {g.deadline ? `Due ${fmtDate(`${g.deadline}T12:00:00`)}` : 'No deadline'}
                                    </p>
                                    <div className="flex">
                                        <button type="button" className="btn-icon" onClick={() => setForm({ goal: g })} aria-label={`Edit ${humanize(g.goal_type)} goal`} title="Edit"><Pencil size={16} /></button>
                                        <button type="button" className="btn-icon hover:!bg-coral-50 hover:!text-coral-600" onClick={() => setDeleting(g)} aria-label={`Delete ${humanize(g.goal_type)} goal`} title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {form && <GoalForm goal={form.goal} onClose={() => setForm(null)} onSaved={() => { setForm(null); goals.reload(); }} />}
            <ConfirmDialog
                open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busy}
                title="Delete goal?" message={`The ${deleting ? humanize(deleting.goal_type).toLowerCase() : ''} goal will be permanently removed.`}
            />
        </>
    );
}
