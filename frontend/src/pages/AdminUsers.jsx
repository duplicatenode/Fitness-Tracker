import { Navigate } from 'react-router-dom';
import { ScrollText, ShieldCheck, Users, UserRound } from 'lucide-react';
import api, { errorMessage } from '../api';
import useFetch from '../hooks/useFetch';
import { usePageControls } from '../context/PageControlsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import { EmptyState, ErrorState, LoadingBlock } from '../components/States';
import { fmtDateTime, humanize } from '../utils/format';

const ROLE_STYLE = {
    admin: 'bg-brand-50 text-brand-700',
    member: 'bg-[#e8f1fa] text-[#2c6aa3]'
};

const EVENT_STYLE = {
    SESSION_FINISHED: 'bg-[#e8f1fa] text-[#2c6aa3]',
    GOAL_COMPLETED: 'bg-brand-50 text-brand-700'
};

// Read-only database view + role change (the change itself runs as sp_change_role inside MySQL)
export default function AdminUsers() {
    const { user: me } = useAuth();
    const toast = useToast();
    const { refreshKey } = usePageControls();
    const users = useFetch(async () => (await api.get('/admin/users')).data, [refreshKey]);
    const audit = useFetch(async () => (await api.get('/admin/activity')).data, [refreshKey]);

    if (me && me.role !== 'admin') return <Navigate to="/" replace />;

    const changeRole = async (target, role) => {
        if (role === target.role) return;
        try {
            await api.put(`/admin/users/${target.id}/role`, { role });
            toast.success(`${target.name} is now ${role}`);
            users.reload();
            audit.reload();
        } catch (err) {
            toast.error(errorMessage(err));
            users.reload();
        }
    };

    const data = users.data;

    return (
        <>
            <PageHeader
                title="Users & roles"
                description="Every account in the database, its application role, and the changes the database has recorded."
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard icon={Users} label="Users" value={data?.total ?? '–'} support="Rows in users" loading={users.loading && !data} tone="sky" />
                <MetricCard icon={ShieldCheck} label="Admins" value={data?.roleCounts?.admin ?? '–'} support="role = admin" loading={users.loading && !data} tone="emerald" />
                <MetricCard icon={UserRound} label="Members" value={data?.roleCounts?.member ?? '–'} support="role = member" loading={users.loading && !data} tone="sky" />
            </div>

            <section className="card mb-6 overflow-hidden" aria-labelledby="users-heading">
                <div className="border-b border-line px-5 py-4">
                    <h2 id="users-heading" className="text-[15px] font-semibold text-text">Accounts</h2>
                    <p className="mt-0.5 text-[13px] text-text-soft">Changing a role runs <code>sp_change_role</code> in MySQL, which checks the caller is an admin and that the last admin is kept.</p>
                </div>
                {users.loading && !data && <div className="p-5"><LoadingBlock rows={4} /></div>}
                {users.error && !data && <div className="p-5"><ErrorState message={errorMessage(users.error)} onRetry={users.reload} /></div>}
                {data && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-line bg-canvas/60 text-[13px] text-text-muted">
                                    <th scope="col" className="px-5 py-3 font-medium">ID</th>
                                    <th scope="col" className="px-2 py-3 font-medium">Name</th>
                                    <th scope="col" className="px-2 py-3 font-medium">Email</th>
                                    <th scope="col" className="px-2 py-3 font-medium">Sessions</th>
                                    <th scope="col" className="px-2 py-3 font-medium">Active goals</th>
                                    <th scope="col" className="px-2 py-3 font-medium">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {data.users.map((u) => (
                                    <tr key={u.id} className="hover:bg-canvas/50">
                                        <td className="px-5 py-3 tabular-nums text-text-muted">{u.id}</td>
                                        <td className="px-2 py-3 font-medium text-text">{u.name}{me?.id === u.id && <span className="ml-2 text-xs text-text-muted">(you)</span>}</td>
                                        <td className="px-2 py-3 text-text-soft">{u.email}</td>
                                        <td className="px-2 py-3 tabular-nums">{u.sessions}</td>
                                        <td className="px-2 py-3 tabular-nums">{u.active_goals}</td>
                                        <td className="px-2 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[u.role] || ''}`}>{humanize(u.role)}</span>
                                                <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
                                                <select
                                                    id={`role-${u.id}`}
                                                    className="rounded-md border border-line bg-white px-2 py-1 text-[13px]"
                                                    value={u.role}
                                                    onChange={(e) => changeRole(u, e.target.value)}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="card overflow-hidden" aria-labelledby="log-heading">
                    <div className="border-b border-line px-5 py-4">
                        <h2 id="log-heading" className="flex items-center gap-2 text-[15px] font-semibold text-text"><ScrollText size={16} aria-hidden="true" /> Activity log</h2>
                        <p className="mt-0.5 text-[13px] text-text-soft">Written automatically by the trigger <code>trg_session_finished</code>.</p>
                    </div>
                    {audit.loading && !audit.data && <div className="p-5"><LoadingBlock rows={3} /></div>}
                    {audit.data && audit.data.log.length === 0 && <EmptyState compact title="No activity yet" description="Finish a workout to see it logged here." />}
                    {audit.data && audit.data.log.length > 0 && (
                        <ul className="divide-y divide-line">
                            {audit.data.log.map((row) => (
                                <li key={row.id} className="flex items-start gap-3 px-5 py-3">
                                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${EVENT_STYLE[row.event_type] || ''}`}>{humanize(row.event_type)}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm text-text">{row.message}</p>
                                        <p className="text-xs text-text-muted">{row.user_name} · {fmtDateTime(row.created_at)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="card overflow-hidden" aria-labelledby="audit-heading">
                    <div className="border-b border-line px-5 py-4">
                        <h2 id="audit-heading" className="text-[15px] font-semibold text-text">Role change audit</h2>
                        <p className="mt-0.5 text-[13px] text-text-soft">Written by the procedure <code>sp_change_role</code>.</p>
                    </div>
                    {audit.loading && !audit.data && <div className="p-5"><LoadingBlock rows={3} /></div>}
                    {audit.data && audit.data.roleChanges.length === 0 && <EmptyState compact title="No role changes yet" description="Role changes you make appear here." />}
                    {audit.data && audit.data.roleChanges.length > 0 && (
                        <ul className="divide-y divide-line">
                            {audit.data.roleChanges.map((row) => (
                                <li key={row.id} className="px-5 py-3">
                                    <p className="text-sm text-text">
                                        <span className="font-medium">{row.actor_name}</span> changed <span className="font-medium">{row.target_name}</span> from {row.old_role} to {row.new_role}
                                    </p>
                                    <p className="text-xs text-text-muted">{fmtDateTime(row.changed_at)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}
