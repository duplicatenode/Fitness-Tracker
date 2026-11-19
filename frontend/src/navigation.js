import { LayoutDashboard, Dumbbell, History, Target, NotebookPen, LineChart, Images, ShieldCheck, BookOpen } from 'lucide-react';

// `ranged: true` shows the date-range selector in the header for that page
export const NAV_ITEMS = [
    { path: '/', label: 'Overview', icon: LayoutDashboard, end: true, ranged: true },
    { path: '/plans', label: 'Workout Plans', icon: Dumbbell },
    { path: '/history', label: 'Workout History', icon: History },
    { path: '/goals', label: 'Fitness Goals', icon: Target },
    { path: '/journal', label: 'Workout Journal', icon: NotebookPen },
    { path: '/analytics', label: 'Activity Analytics', icon: LineChart, ranged: true },
    { path: '/gallery', label: 'Progress Gallery', icon: Images }
];

export const PROFILE_ITEM = { path: '/profile', label: 'My profile' };

// Shown in the sidebar only to users whose role is admin (the API enforces this too)
export const ADMIN_ITEMS = [
    { path: '/catalogue', label: 'Exercise catalogue', icon: BookOpen },
    { path: '/admin', label: 'Users & roles', icon: ShieldCheck }
];

export function findNavItem(pathname) {
    if (pathname === PROFILE_ITEM.path) return PROFILE_ITEM;
    const adminItem = ADMIN_ITEMS.find((i) => i.path === pathname);
    if (adminItem) return adminItem;
    return (
        NAV_ITEMS.find((i) => (i.end ? pathname === i.path : pathname === i.path || pathname.startsWith(`${i.path}/`))) ||
        NAV_ITEMS[0]
    );
}
