import { useState } from 'react';
import { CalendarClock, KeyRound, Mail, UserRound } from 'lucide-react';
import { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import PasswordInput from '../components/PasswordInput';
import ProfileFields, { profileFromUser, validateProfileFields } from '../components/ProfileFields';
import { PasswordChecklist, passwordRules } from './Signup';
import { fmtDate, fmtDateTime, initials } from '../utils/format';

const ageFrom = (dob) => {
    if (!dob) return null;
    const a = Math.floor((Date.now() - new Date(`${dob}T00:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000));
    return Number.isFinite(a) ? a : null;
};

function DetailsForm({ user }) {
    const { updateProfile } = useAuth();
    const toast = useToast();
    const [name, setName] = useState(user.name || '');
    const [profile, setProfile] = useState(profileFromUser(user));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (name.trim().length < 2) return setError('Enter your full name.');
        const pe = validateProfileFields(profile);
        if (pe) return setError(pe);
        setSaving(true);
        setError('');
        try {
            await updateProfile({ name: name.trim(), ...profile });
            toast.success('Profile updated');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="card p-5 sm:p-6" noValidate>
            <h2 className="card-title">Personal details</h2>
            <p className="card-sub mt-0.5">Stored in your FitTrack profile.</p>
            <div className="mt-5 space-y-4">
                <div>
                    <label htmlFor="pr-name" className="field-label">Full name</label>
                    <input id="pr-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
                </div>
                <ProfileFields value={profile} onChange={setProfile} idPrefix="pr" />
                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
                <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
            </div>
        </form>
    );
}

function PasswordForm() {
    const { changePassword } = useAuth();
    const toast = useToast();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!current) return setError('Enter your current password.');
        if (!passwordRules(next).every((r) => r.ok)) return setError('Choose a stronger new password.');
        if (next !== confirm) return setError('The new passwords do not match.');
        setSaving(true);
        setError('');
        try {
            await changePassword(current, next);
            toast.success('Password updated');
            setCurrent(''); setNext(''); setConfirm('');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="card p-5 sm:p-6" noValidate>
            <h2 className="card-title">Change password</h2>
            <p className="card-sub mt-0.5">Passwords are stored as one-way hashes.</p>
            <div className="mt-5 space-y-4">
                <div>
                    <label htmlFor="pw-current" className="field-label">Current password</label>
                    <PasswordInput id="pw-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="pw-new" className="field-label">New password</label>
                    <PasswordInput id="pw-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} describedBy="pw-rules" />
                    <PasswordChecklist id="pw-rules" password={next} />
                </div>
                <div>
                    <label htmlFor="pw-confirm" className="field-label">Confirm new password</label>
                    <PasswordInput id="pw-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}
                <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
                </div>
            </div>
        </form>
    );
}

export default function Profile() {
    const { user } = useAuth();
    const age = ageFrom(user?.profile?.date_of_birth);

    return (
        <>
            <PageHeader title="My profile" description="Your account and the personal details saved for it." />

            {!user ? (
                <div className="card p-6" role="status"><span className="sr-only">Loading profile</span><div className="skeleton h-24 w-full" /></div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                    <aside className="card h-fit p-5 sm:p-6" aria-label="Account summary">
                        <div className="flex items-center gap-3">
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink-900 text-lg font-semibold text-white" aria-hidden="true">{initials(user.name)}</div>
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-text">{user.name}</p>
                                {age != null && <p className="text-[13px] text-text-muted">{age} years old</p>}
                            </div>
                        </div>
                        <dl className="mt-5 space-y-3.5 text-[13px]">
                            <div className="flex items-start gap-2.5"><Mail size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" /><div className="min-w-0"><dt className="text-text-muted">Email</dt><dd className="truncate font-medium text-text">{user.email}</dd></div></div>
                            <div className="flex items-start gap-2.5"><UserRound size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" /><div><dt className="text-text-muted">Member since</dt><dd className="font-medium text-text">{fmtDate(user.created_at)}</dd></div></div>
                            <div className="flex items-start gap-2.5"><CalendarClock size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" /><div><dt className="text-text-muted">Last sign-in</dt><dd className="font-medium text-text">{user.last_login_at ? fmtDateTime(user.last_login_at) : '–'}</dd></div></div>
                            <div className="flex items-start gap-2.5"><KeyRound size={15} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" /><div><dt className="text-text-muted">Account ID</dt><dd className="tabular font-medium text-text">#{user.id}</dd></div></div>
                        </dl>
                    </aside>
                    <div className="space-y-4">
                        <DetailsForm key={user.id + String(user.profile?.weight_kg) + user.name} user={user} />
                        <PasswordForm />
                    </div>
                </div>
            )}
        </>
    );
}
