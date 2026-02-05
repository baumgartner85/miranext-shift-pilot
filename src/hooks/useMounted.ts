'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect when the component has mounted (client-side hydration complete).
 * Use this to prevent hydration mismatches when reading from localStorage/Zustand.
 */
export function useMounted() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return mounted;
}
