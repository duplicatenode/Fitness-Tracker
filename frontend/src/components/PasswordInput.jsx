import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ id, value, onChange, autoComplete, placeholder, invalid, describedBy, ...rest }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                autoComplete={autoComplete}
                className={`input pr-11 ${invalid ? 'border-coral-500 focus:border-coral-500 focus:ring-coral-500/20' : ''}`}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                {...rest}
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted hover:text-text"
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
            >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </div>
    );
}
