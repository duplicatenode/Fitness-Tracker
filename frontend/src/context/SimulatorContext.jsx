import { createContext, useContext, useMemo } from 'react';
import api from '../api';
import useFetch from '../hooks/useFetch';

const SimulatorContext = createContext(null);

/**
 * Polls GET /activity/status (derived by the backend from the newest Memurai sensor reading).
 *   connected           -> newest reading is <= 20s old
 *   no_recent_readings  -> readings exist but are older than that
 *   disconnected        -> no readings at all, or the backend/Memurai could not be reached
 */
export function SimulatorProvider({ children }) {
    const { data, error, loading, reload } = useFetch(
        async () => (await api.get('/activity/status')).data,
        [],
        { intervalMs: 5000 }
    );

    const value = useMemo(() => {
        let status = 'disconnected';
        if (data && !error) status = data.status;
        return {
            status,
            loading,
            unreachable: Boolean(error),
            error,
            latest: !error && data ? data.latest : null,
            ageSeconds: !error && data ? data.age_seconds : null,
            reload
        };
    }, [data, error, loading, reload]);

    return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export const useSimulator = () => useContext(SimulatorContext);
