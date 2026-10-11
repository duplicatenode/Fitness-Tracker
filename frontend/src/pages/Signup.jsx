import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';
import ProfileFields, { EMPTY_PROFILE, validateProfileFields } from '../components/ProfileFields';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordRules(pw) {
    return [
        { label: 'At least 8 characters', ok: pw.length >= 8 },
        { label: 'A letter', ok: /[A-Za-z]/.test(pw) },
        { label: 'A number', ok: /\d/.test(pw) }
    ];
}

export function PasswordChecklist({ password, id }) {
    return (
        <ul id={id} className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
            {passwordRules(password).map((r) => (
                <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-brand-700' : 'text-text-muted'}`}>
                    {r.ok ? <Check size={13} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}
                    {r.label}<span className="sr-only">{r.ok ? ' (met)' : ' (not met)'}</span>
                </li>
            ))}
        </ul>
    );
}

export default function Signup() {
    const { isAuthenticated, register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [touched, setTouched] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (isAuthenticated) return <Navigate to="/" replace />;

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

    const fieldErrors = {
        name: form.name.trim().length < 2 ? 'Enter your full name.' : '',
        email: !EMAIL_RE.test(form.email.trim()) ? 'Enter a valid email address.' : '',
        password: passwordRules(form.password).every((r) => r.ok) ? '' : 'Choose a stronger password.',
        confirm: form.confirm !== form.password ? 'Passwords do not match.' : ''
    };
    const profileError = validateProfileFields(profile);
    const valid = !Object.values(fieldErrors).some(Boolean) && !profileError;
    const show = (k) => (touched[k] || touched.submit) && fieldErrors[k];

    const onSubmit = async (e) => {
        e.preventDefault();
        setTouched({ name: true, email: true, password: true, confirm: true, submit: true });
        setError('');
        if (!valid) return;
        setBusy(true);
        const payload = { name: form.name.trim(), email: form.email.trim(), password: form.password };
        Object.entries(profile).forEach(([k, v]) => { if (v !== '' && v != null) payload[k] = v; });
        try {
            await register(payload);
            navigate('/', { replace: true });
        } catch (err) {
            const msg = errorMessage(err, 'Could not create your account.');
            setError(msg === 'User already exists' ? 'An account with this email already exists.' : msg);
            setBusy(false);
        }
    };

    const invalidCls = 'border-coral-500 focus:border-coral-500 focus:ring-coral-500/20';

    return (
        <AuthLayout wide>
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1.5 text-sm text-text-soft">Start tracking your workouts, goals and activity.</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                <div>
                    <label htmlFor="su-name" className="field-label">Full name</label>
                    <input id="su-name" autoComplete="name" className={`input ${show('name') ? invalidCls : ''}`} value={form.name} onChange={set('name')} onBlur={blur('name')} aria-invalid={Boolean(show('name'))} aria-describedby={show('name') ? 'su-name-err' : undefined} maxLength={100} />
                    {show('name') && <p id="su-name-err" className="mt-1.5 text-xs text-coral-600">{fieldErrors.name}</p>}
                </div>
                <div>
                    <label htmlFor="su-email" className="field-label">Email</label>
                    <input id="su-email" type="email" autoComplete="email" className={`input ${show('email') ? invalidCls : ''}`} value={form.email} onChange={set('email')} onBlur={blur('email')} placeholder="you@example.com" aria-invalid={Boolean(show('email'))} aria-describedby={show('email') ? 'su-email-err' : undefined} />
                    {show('email') && <p id="su-email-err" className="mt-1.5 text-xs text-coral-600">{fieldErrors.email}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="su-password" className="field-label">Password</label>
                        <PasswordInput id="su-password" autoComplete="new-password" value={form.password} onChange={set('password')} onBlur={blur('password')} invalid={Boolean(show('password'))} describedBy="su-pw-rules" />
                    </div>
                    <div>
                        <label htmlFor="su-confirm" className="field-label">Confirm password</label>
                        <PasswordInput id="su-confirm" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} invalid={Boolean(show('confirm'))} describedBy={show('confirm') ? 'su-confirm-err' : undefined} />
                        {show('confirm') && <p id="su-confirm-err" className="mt-1.5 text-xs text-coral-600">{fieldErrors.confirm}</p>}
                    </div>
                </div>
                <PasswordChecklist id="su-pw-rules" password={form.password} />

                <fieldset className="rounded-xl border border-line bg-surface p-4">
                    <legend className="px-1.5 text-[13px] font-medium text-text">About you <span className="font-normal text-text-muted">(optional)</span></legend>
                    <ProfileFields value={profile} onChange={setProfile} idPrefix="su" />
                    {profileError && <p role="alert" className="mt-3 text-xs text-coral-600">{profileError}</p>}
                </fieldset>

                {error && <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">{error}</p>}

                <button type="submit" className="btn btn-primary h-10 w-full" disabled={busy}>
                    {busy ? 'Creating account…' : 'Create account'}
                </button>
            </form>

            <p className="mt-5 text-center text-sm text-text-soft">
                Already have an account? <Link to="/login" className="font-medium text-brand-700 hover:text-brand-600">Sign in</Link>
            </p>
        </AuthLayout>
    );
}
