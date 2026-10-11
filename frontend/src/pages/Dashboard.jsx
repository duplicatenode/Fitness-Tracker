import { Link } from 'react-router-dom';
import { ArrowRight, Dumbbell, Flame, Footprints, Heart, NotebookPen, Target } from 'lucide-react';
import api from '../api';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { useSimulator } from '../context/SimulatorContext';
import { usePageControls, RANGE_OPTIONS } from '../context/PageControlsContext';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import ProgressBar from '../components/ProgressBar';
import ChartCard, { SIMULATED_NOTE } from '../components/charts/ChartCard';
import HeartRateChart from '../components/charts/HeartRateChart';
import DailyBarChart from '../components/charts/DailyBarChart';
import { SimulatorPanel } from '../components/SimulatorStatus';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDate, fmtDateTime, fmtDuration, fmtNumber, greeting, humanize, timeAgo } from '../utils/format';
import { MoodBadge } from '../components/MoodBadge';

function Panel({ title, to, linkLabel, children }) {
    return (
        <section className="card flex flex-col p-5" aria-label={title}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="card-title">{title}</h2>
                <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-600">
                    {linkLabel} <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </div>
            <div className="flex-1">{children}</div>
        </section>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { latest } = useSimulator();
    const { range, refreshKey } = usePageControls();
    const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label.toLowerCase();
    const days = range === '30d' ? 30 : 7;

    // Same endpoint the original dashboard used, polled every 5s (the simulator writes every 5s)
    const dash = useFetch(async () => (await api.get('/dashboard')).data, [refreshKey], { intervalMs: 5000 });
    const goals = useFetch(async () => (await api.get('/goals')).data, [refreshKey]);
    const sessions = useFetch(async () => (await api.get('/workouts/sessions')).data, [refreshKey]);
    const journals = useFetch(async () => (await api.get('/journals')).data, [refreshKey]);
    const readings = useFetch(async () => (await api.get('/activity/readings', { params: { range } })).data, [range, refreshKey], { intervalMs: 30000 });
    const daily = useFetch(async () => (await api.get('/activity/daily', { params: { days } })).data, [days, refreshKey], { intervalMs: 30000 });

    const d = dash.data;
    const firstName = user?.name?.split(' ')[0];
    const readingsToday = d ? Number(d.dailyActivity?.reading_counts || 0) : 0;
    const stepsGoal = goals.data?.find((g) => g.goal_type === 'daily_steps' && g.status === 'active');
    const sensor = latest || d?.latestSensor;
    const hasSensor = sensor && Number(sensor.heart_rate) > 0;

    const activeGoals = (goals.data || []).filter((g) => g.status === 'active').slice(0, 3);

    return (
        <>
            <PageHeader
                title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
                description={
                    d && readingsToday > 0
                        ? `Your wearable has logged ${fmtNumber(readingsToday)} readings today.`
                        : 'Here is a snapshot of your training and activity.'
                }
            />

            {dash.error && !d ? (
                <div className="card"><ErrorState message={dash.error} onRetry={dash.reload} /></div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={Footprints}
                        tone="emerald"
                        label="Steps today"
                        loading={dash.loading}
                        value={d ? fmtNumber(d.dailyActivity?.total_steps || 0) : ''}
                        support={stepsGoal ? `Goal: ${fmtNumber(stepsGoal.target_value)} steps` : 'From your simulated wearable'}
                    />
                    <MetricCard
                        icon={Heart}
                        tone="coral"
                        label="Latest heart rate"
                        loading={dash.loading}
                        value={hasSensor ? Number(sensor.heart_rate) : '–'}
                        unit={hasSensor ? 'bpm' : undefined}
                        support={hasSensor ? `${humanize(sensor.activity_state)} · ${timeAgo(sensor.timestamp)}` : 'No readings yet'}
                    />
                    <MetricCard
                        icon={Flame}
                        tone="amber"
                        label="Estimated calories burned"
                        loading={dash.loading}
                        value={d ? fmtNumber(Math.round(Number(d.dailyActivity?.total_calories || 0))) : ''}
                        unit="kcal"
                        support="Estimated from simulated readings"
                    />
                    <MetricCard
                        icon={Dumbbell}
                        tone="sky"
                        label="Workouts completed"
                        loading={dash.loading}
                        value={d ? fmtNumber(d.completedWorkouts ?? d.totalWorkouts) : ''}
                        support={d ? `${fmtNumber(d.workoutsThisWeek ?? 0)} started this week` : ''}
                    />
                </div>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <ChartCard
                    title="Heart rate"
                    subtitle={`Average beats per minute · ${rangeLabel}`}
                    note={SIMULATED_NOTE}
                    loading={readings.loading}
                    error={readings.error}
                    onRetry={readings.reload}
                    empty={readings.data && readings.data.points.length === 0}
                >
                    {readings.data && <HeartRateChart points={readings.data.points} range={range} />}
                </ChartCard>

                <ChartCard
                    title="Daily steps"
                    subtitle={`Last ${days} days`}
                    note={SIMULATED_NOTE}
                    loading={daily.loading}
                    error={daily.error}
                    onRetry={daily.reload}
                    empty={daily.data && !daily.data.some((x) => x.has_data)}
                    emptyDescription="No daily activity has been recorded in this period."
                >
                    {daily.data && <DailyBarChart days={daily.data} metric="steps" />}
                </ChartCard>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Panel title="Recent workout sessions" to="/history" linkLabel="View history">
                    {sessions.loading ? <LoadingBlock rows={4} /> : sessions.error ? (
                        <ErrorState message={sessions.error} onRetry={sessions.reload} compact />
                    ) : sessions.data.length === 0 ? (
                        <EmptyState icon={Dumbbell} compact title="No sessions yet" description="Start a session from a workout plan and it will show up here." />
                    ) : (
                        <ul className="divide-y divide-line">
                            {sessions.data.slice(0, 5).map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text">{s.plan_name || 'Freestyle session'}</p>
                                        <p className="text-[13px] text-text-muted">{fmtDateTime(s.start_time)}</p>
                                    </div>
                                    <div className="shrink-0 text-right text-[13px] text-text-soft">
                                        <p className="tabular font-medium text-text">{s.end_time ? fmtDuration(s.duration_minutes) : 'In progress'}</p>
                                        <p className="text-text-muted">{s.exercises_completed} exercises</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel title="Goal progress" to="/goals" linkLabel="All goals">
                    {goals.loading ? <LoadingBlock rows={4} /> : goals.error ? (
                        <ErrorState message={goals.error} onRetry={goals.reload} compact />
                    ) : activeGoals.length === 0 ? (
                        <EmptyState icon={Target} compact title="No active goals" description="Set a target for workouts, steps or calories to track it here." />
                    ) : (
                        <ul className="space-y-5">
                            {activeGoals.map((g) => (
                                <li key={g.id}>
                                    <div className="mb-2 flex items-baseline justify-between gap-3">
                                        <p className="text-sm font-medium text-text">{humanize(g.goal_type)}</p>
                                        <p className="tabular text-[13px] text-text-muted">
                                            {g.tracked ? `${fmtNumber(g.current_value)} / ${fmtNumber(g.target_value)} ${g.unit}` : `Target ${fmtNumber(g.target_value)}`}
                                        </p>
                                    </div>
                                    {g.tracked ? (
                                        <ProgressBar value={g.progress_pct} label={`${humanize(g.goal_type)} progress`} />
                                    ) : (
                                        <p className="text-[13px] text-text-muted">Progress isn't tracked automatically for this goal.</p>
                                    )}
                                    {g.deadline && <p className="mt-1.5 text-xs text-text-muted">Due {fmtDate(`${g.deadline}T12:00:00`)}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel title="Recent journal entries" to="/journal" linkLabel="Open journal">
                    {journals.loading ? <LoadingBlock rows={4} /> : journals.error ? (
                        <ErrorState message={journals.error} onRetry={journals.reload} compact />
                    ) : journals.data.length === 0 ? (
                        <EmptyState icon={NotebookPen} compact title="No journal entries" description="Write a quick note after your next workout." />
                    ) : (
                        <ul className="divide-y divide-line">
                            {journals.data.slice(0, 3).map((j) => (
                                <li key={j.id} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-medium text-text">{j.title}</p>
                                        <MoodBadge mood={j.mood} />
                                    </div>
                                    <p className="mt-0.5 line-clamp-1 text-[13px] text-text-soft">{j.notes || 'No notes'}</p>
                                    <p className="mt-1 text-xs text-text-muted">{fmtDate(j.timestamp)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <SimulatorPanel />
            </div>
        </>
    );
}
