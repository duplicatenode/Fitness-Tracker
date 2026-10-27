'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Client-side redirect (replaces the current history entry), used for auth and role guards
export default function Redirect({ to }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(to);
    }, [router, to]);
    return null;
}
