'use client';

import { Fragment, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronRight, History as HistoryIcon, Play, X } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { daysAgoInput, fmtDate, fmtDuration, fmtTime, toInputDate } from '../utils/format';

const PRESETS = [
    { key: 'all', label: 'All time', from: '', to: '' },
    { key: '7', label: 'Last 7 days', days: 7 },
    { key: '30', label: 'Last 30 days', days: 30 }
];

function SessionDetail({ id }) {
    const { data, loading, error, reload } = useFetch(async () => (await api.get(`/workouts/sessions/${id}`)).data, [id]);
    if (loading) return <LoadingBlock rows={3} />;
    if (error) return <ErrorState message={error} onRetry={reload} compact />;

    const byExercise = data.sets.reduce((acc, s) => {
        (acc[s.exercise_name] = acc[s.exercise_name] || []).push(s);
        return acc;
    }, {});
    const names = Object.keys(byExercise);

    return (
        <div className="space-y-4">
            {data.notes && <p className="text-[13px] leading-relaxed text-text-soft"><span className="font-medium text-text">Notes: </span>{data.notes}</p>}
            {names.length === 0 ? (
                <p className="text-[13px] text-text-muted">No sets were logged for this session.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {names.map((n) => (
                        <div key={n} className="rounded-lg border border-line bg-surface p-3.5">
                            <p className="text-sm font-medium text-text">{n}</p>
                            <ul className="mt-2 space-y-1.5">
                                {byExercise[n].map((s) => (
                                    <li key={s.id} className="flex items-center justify-between text-[13px] text-text-soft">
                                        <span>Set {s.set_number}</span>
                                        <span className="tabular flex items-center gap-2">
                                            {s.reps ?? '–'} reps{s.weight != null ? ` × ${Number(s.weight)}` : ''}
                                            {s.completed ? <Check size={14} className="text-brand-600" aria-label="Completed" /> : <X size={14} className="text-text-muted" aria-label="Not completed" />}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StartSession({ onClose, onStarted }) {
    const toast = useToast();
    const plans = useFetch(async () => (await api.get('/workouts/plans')).data, []);
    const [planId, setPlanId] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/workouts/sessions', { plan_id: planId || null, notes });
            toast.success('Session started');
            onStarted();
        } catch (err) {
            toast.error(errorMessage(err));
            setSaving(false);
        }
    };

    return (
        <Modal
            open onClose={onClose} size="sm" title="Start a session" description="Begin tracking a workout now."
            footer={<>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" form="session-form" className="btn btn-primary" disabled={saving}>{saving ? 'Starting…' : 'Start session'}</button>
            </>}
        >
            <form id="session-form" onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="s-plan" className="field-label">Workout plan</label>
                    <select id="s-plan" data-autofocus className="input" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={plans.loading}>
                        <option value="">No plan (freestyle)</option>
                        {(plans.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="s-notes" className="field-label">Notes (optional)</label>
                    <textarea id="s-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
            </form>
        </Modal>
    );
}

export default function History() {
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const [preset, setPreset] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [open, setOpen] = useState(null);
    const [starting, setStarting] = useState(false);

    const sessions = useFetch(
        async () => (await api.get('/workouts/sessions', { params: { ...(from && { from }), ...(to && { to }) } })).data,
        [from, to, refreshKey]
    );

    const applyPreset = (p) => {
        setPreset(p.key);
        if (p.days) { setFrom(daysAgoInput(p.days)); setTo(toInputDate()); } else { setFrom(''); setTo(''); }
    };

    const finish = async (s) => {
        try {
            await api.put(`/workouts/sessions/${s.id}/end`);
            toast.success('Session finished');
            sessions.reload();
        } catch (err) {
            toast.error(errorMessage(err));
        }
    };

    const filtered = from || to;

    return (
        <>
            <PageHeader
                title="Workout history"
                description="Every session you've logged, with duration and completed exercises."
                actions={<button type="button" className="btn btn-primary" onClick={() => setStarting(true)}><Play size={15} aria-hidden="true" /> Start session</button>}
            />

            <div className="card mb-4 flex flex-wrap items-end gap-x-4 gap-y-3 p-4">
                <div role="group" aria-label="Quick date ranges" className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => applyPreset(p)}
                            aria-pressed={preset === p.key}
                            className={`btn h-9 ${preset === p.key ? 'border-brand-600 bg-brand-50 text-brand-700' : ''}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-end gap-2">
                    <div>
                        <label htmlFor="h-from" className="mb-1 block text-xs text-text-muted">From</label>
                        <input id="h-from" type="date" className="input h-9 w-auto" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} />
                    </div>
                    <div>
                        <label htmlFor="h-to" className="mb-1 block text-xs text-text-muted">To</label>
                        <input id="h-to" type="date" className="input h-9 w-auto" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} />
                    </div>
                </div>
            </div>

            {sessions.loading ? (
                <div className="card p-5"><LoadingBlock rows={5} label="Loading sessions" /></div>
            ) : sessions.error ? (
                <div className="card"><ErrorState message={sessions.error} onRetry={sessions.reload} /></div>
            ) : sessions.data.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={filtered ? CalendarDays : HistoryIcon}
                        title={filtered ? 'No sessions in this date range' : 'No sessions yet'}
                        description={filtered ? 'Try widening the dates or clear the filter.' : 'Start a session and it will be recorded here.'}
                        action={filtered ? <button type="button" className="btn" onClick={() => applyPreset(PRESETS[0])}>Clear filter</button> : <button type="button" className="btn btn-primary" onClick={() => setStarting(true)}><Play size={15} aria-hidden="true" /> Start session</button>}
                    />
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="relative overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-line bg-canvas/60 text-[13px] text-text-muted">
                                    <th scope="col" className="w-10 px-4 py-3"><span className="sr-only">Expand</span></th>
                                    <th scope="col" className="px-2 py-3 font-medium">Date</th>
                                    <th scope="col" className="px-4 py-3 font-medium">Plan</th>
                                    <th scope="col" className="px-4 py-3 font-medium">Duration</th>
                                    <th scope="col" className="px-4 py-3 font-medium">Exercises completed</th>
                                    <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.data.map((s) => {
                                    const isOpen = open === s.id;
                                    return (
                                        <Fragment key={s.id}>
                                            <tr className="border-b border-line last:border-0 hover:bg-canvas/50">
                                                <td className="px-4 py-3.5">
                                                    <button type="button" className="btn-icon size-7" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} details for session on ${fmtDate(s.start_time)}`}>
                                                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3.5">
                                                    <p className="font-medium text-text">{fmtDate(s.start_time)}</p>
                                                    <p className="text-[13px] text-text-muted">{fmtTime(s.start_time)}</p>
                                                </td>
                                                <td className="px-4 py-3.5 text-text-soft">{s.plan_name || 'Freestyle'}</td>
                                                <td className="tabular px-4 py-3.5">
                                                    {s.end_time ? fmtDuration(s.duration_minutes) : <span className="badge bg-[#fdf4e3] text-[#b26f05]">In progress</span>}
                                                </td>
                                                <td className="tabular px-4 py-3.5 text-text-soft">
                                                    {s.exercises_completed} {s.exercises_completed === 1 ? 'exercise' : 'exercises'} · {s.sets_completed} sets
                                                </td>
                                                <td className="px-4 py-3.5 text-right">
                                                    {!s.end_time && <button type="button" className="btn h-8" onClick={() => finish(s)}>Finish</button>}
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr className="border-b border-line bg-canvas/50 last:border-0">
                                                    <td colSpan={6} className="px-6 py-4"><SessionDetail id={s.id} /></td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {starting && <StartSession onClose={() => setStarting(false)} onStarted={() => { setStarting(false); sessions.reload(); }} />}
        </>
    );
}
