import { createContext, useContext } from 'react';
import { useLiveFeed } from '../hooks/useLiveFeed';

const LiveFeedContext = createContext(null);

/**
 * Provides a single shared useLiveFeed() instance to the entire app.
 * Without this, each page calling useLiveFeed() would create its own
 * independent timer and state, de-syncing the data.
 */
export function LiveFeedProvider({ children }) {
    const feed = useLiveFeed();
    return (
        <LiveFeedContext.Provider value={feed}>
            {children}
        </LiveFeedContext.Provider>
    );
}

export function useFeed() {
    const ctx = useContext(LiveFeedContext);
    if (!ctx) throw new Error('useFeed must be used inside <LiveFeedProvider>');
    return ctx;
}
