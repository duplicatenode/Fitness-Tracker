'use client';

import { BatteryLow, Frown, Meh, Smile, Zap } from 'lucide-react';
import { humanize } from '../utils/format';

export const MOODS = [
    { value: 'energetic', label: 'Energetic', icon: Zap, cls: 'bg-brand-50 text-brand-700' },
    { value: 'good', label: 'Good', icon: Smile, cls: 'bg-[#e8f1fa] text-[#2c6aa3]' },
    { value: 'neutral', label: 'Neutral', icon: Meh, cls: 'bg-canvas text-text-soft' },
    { value: 'tired', label: 'Tired', icon: BatteryLow, cls: 'bg-[#fdf4e3] text-[#b26f05]' },
    { value: 'sore', label: 'Sore', icon: Frown, cls: 'bg-coral-50 text-coral-600' }
];

export function MoodBadge({ mood }) {
    const m = MOODS.find((x) => x.value === String(mood || '').toLowerCase());
    const Icon = m?.icon || Meh;
    return (
        <span className={`badge shrink-0 ${m?.cls || 'bg-canvas text-text-soft'}`}>
            <Icon size={13} aria-hidden="true" /> {m?.label || humanize(mood) || 'Neutral'}
        </span>
    );
}
