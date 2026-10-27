'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api';

/**
 * Small data-fetching hook.
 *  - `loading` is true only until the first response (so refreshes don't flash skeletons)
 *  - `refreshing` is true while a later request is in flight
 *  - re-runs whenever `deps` change; optional polling via `intervalMs` (paused while the tab is hidden)
 */
export default function useFetch(fetcher, deps = [], { intervalMs = 0, enabled = true } = {}) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [refreshing, setRefreshing] = useState(false);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const seq = useRef(0);
    const hasData = useRef(false);

    const run = useCallback(async () => {
        const id = ++seq.current;
        if (hasData.current) setRefreshing(true);
        try {
            const result = await fetcherRef.current();
            if (id !== seq.current) return;
            setData(result);
            setError(null);
            hasData.current = true;
        } catch (err) {
            if (id !== seq.current) return;
            setError(errorMessage(err));
        } finally {
            if (id === seq.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        hasData.current = false;
        setLoading(true);
        run();
        let timer;
        if (intervalMs > 0) {
            timer = setInterval(() => {
                if (!document.hidden) run();
            }, intervalMs);
        }
        return () => {
            seq.current += 1; // ignore in-flight responses after unmount / dep change
            if (timer) clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, enabled, intervalMs]);

    return { data, error, loading, refreshing, reload: run, setData };
}
