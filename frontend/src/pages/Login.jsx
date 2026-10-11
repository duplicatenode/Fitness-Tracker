import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
    const { isAuthenticated, login, loginDemo } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(null); // 'login' | 'demo' | null
    const [error, setError] = useState('');

    if (isAuthenticated) return <Navigate to="/" replace />;

    const run = async (kind, action) => {
        setBusy(kind);
        setError('');
        try {
            await action();
            navigate('/', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Sign in failed.'));
            setBusy(null);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        run('login', () => login(email.trim(), password));
    };

    return (
        <AuthLayout>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1.5 text-sm text-text-soft">Welcome back. Enter your details to continue.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
                <div>
                    <label htmlFor="email" className="field-label">Email</label>
                    <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                    <label htmlFor="password" className="field-label">Password</label>
                    <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                {error && (
                    <p role="alert" className="rounded-lg border border-coral-100 bg-coral-50 px-3 py-2.5 text-[13px] text-coral-600">
                        {error}
                        {error === 'Invalid credentials' && (
                            <> Check your email and password, or <Link to="/signup" className="font-medium underline">create an account</Link>.</>
                        )}
                    </p>
                )}

                <button type="submit" className="btn btn-primary h-10 w-full" disabled={busy !== null || !email || !password}>
                    {busy === 'login' ? 'Signing in…' : 'Sign in'}
                </button>
            </form>

            <p className="mt-5 text-center text-sm text-text-soft">
                New to FitTrack? <Link to="/signup" className="font-medium text-brand-700 hover:text-brand-600">Create an account</Link>
            </p>

            <div className="my-6 flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>

            <button type="button" className="btn h-10 w-full" disabled={busy !== null} onClick={() => run('demo', loginDemo)}>
                {busy === 'demo' ? 'Signing in…' : 'Continue as demo user'}
            </button>
        </AuthLayout>
    );
}
