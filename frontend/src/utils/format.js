export const fmtNumber = (n) => (n == null || Number.isNaN(Number(n)) ? '–' : Number(n).toLocaleString());

export function fmtDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
    if (!value) return '–';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '–' : d.toLocaleDateString(undefined, opts);
}

export function fmtTime(value) {
    if (!value) return '–';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '–' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function fmtDateTime(value) {
    if (!value) return '–';
    return `${fmtDate(value, { month: 'short', day: 'numeric' })}, ${fmtTime(value)}`;
}

export function fmtDuration(minutes) {
    if (minutes == null) return '–';
    const m = Math.max(0, Math.round(minutes));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

export function timeAgo(value, now = Date.now()) {
    const t = typeof value === 'number' ? value : Date.parse(value);
    if (Number.isNaN(t)) return '–';
    const s = Math.max(0, Math.round((now - t) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
}

export function greeting(date = new Date()) {
    const h = date.getHours();
    if (h < 5) return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export const humanize = (s) => {
    if (!s) return '';
    const t = String(s).replace(/_/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
};

// YYYY-MM-DD in local time (for <input type="date"> values)
export const toInputDate = (d = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysAgoInput = (n) => toInputDate(new Date(Date.now() - n * 24 * 3600 * 1000));

export const initials = (name = '') =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U';
