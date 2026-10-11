import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PageControlsContext = createContext(null);

export const RANGE_OPTIONS = [
    { value: '1h', label: 'Last hour' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' }
];

/** Shared by the header (range selector + refresh button) and the pages that react to them. */
export function PageControlsProvider({ children }) {
    const [range, setRange] = useState('24h');
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
    const value = useMemo(() => ({ range, setRange, refreshKey, refresh }), [range, refreshKey, refresh]);
    return <PageControlsContext.Provider value={value}>{children}</PageControlsContext.Provider>;
}

export const usePageControls = () => useContext(PageControlsContext);
