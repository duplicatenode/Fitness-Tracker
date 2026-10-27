'use client';

// Shared option lists + fields for the optional personal details (sign-up and profile page)
export const GENDER_OPTIONS = [
    { value: '', label: 'Select' },
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];
export const LEVEL_OPTIONS = [
    { value: '', label: 'Select' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
];

export const EMPTY_PROFILE = { date_of_birth: '', gender: '', height_cm: '', weight_kg: '', fitness_level: '' };

export const profileFromUser = (user) => ({
    date_of_birth: user?.profile?.date_of_birth || '',
    gender: user?.profile?.gender || '',
    height_cm: user?.profile?.height_cm ?? '',
    weight_kg: user?.profile?.weight_kg ?? '',
    fitness_level: user?.profile?.fitness_level || ''
});

/** Returns a message, or '' when the optional details are fine. */
export function validateProfileFields(p) {
    if (p.date_of_birth) {
        const d = new Date(`${p.date_of_birth}T00:00:00`);
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (Number.isNaN(age) || age < 10 || age > 120) return 'Date of birth must give an age between 10 and 120.';
    }
    if (p.height_cm !== '' && (Number(p.height_cm) < 50 || Number(p.height_cm) > 260)) return 'Height must be between 50 and 260 cm.';
    if (p.weight_kg !== '' && (Number(p.weight_kg) < 20 || Number(p.weight_kg) > 400)) return 'Weight must be between 20 and 400 kg.';
    return '';
}

export default function ProfileFields({ value, onChange, idPrefix = 'pf' }) {
    const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
    const today = new Date().toISOString().split('T')[0];
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div>
                <label htmlFor={`${idPrefix}-dob`} className="field-label">Date of birth</label>
                <input id={`${idPrefix}-dob`} type="date" className="input" value={value.date_of_birth} max={today} onChange={set('date_of_birth')} autoComplete="bday" />
            </div>
            <div>
                <label htmlFor={`${idPrefix}-gender`} className="field-label">Gender</label>
                <select id={`${idPrefix}-gender`} className="input" value={value.gender} onChange={set('gender')}>
                    {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`${idPrefix}-height`} className="field-label">Height (cm)</label>
                <input id={`${idPrefix}-height`} type="number" inputMode="decimal" min="50" max="260" step="0.1" className="input" value={value.height_cm} onChange={set('height_cm')} placeholder="170" />
            </div>
            <div>
                <label htmlFor={`${idPrefix}-weight`} className="field-label">Weight (kg)</label>
                <input id={`${idPrefix}-weight`} type="number" inputMode="decimal" min="20" max="400" step="0.1" className="input" value={value.weight_kg} onChange={set('weight_kg')} placeholder="65" />
            </div>
            <div className="sm:col-span-2">
                <label htmlFor={`${idPrefix}-level`} className="field-label">Fitness level</label>
                <select id={`${idPrefix}-level`} className="input" value={value.fitness_level} onChange={set('fitness_level')}>
                    {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
        </div>
    );
}
