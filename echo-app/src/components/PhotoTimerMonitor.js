import React, { useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { usePhotoTimer } from '../context/PhotoTimerContext';
import { navigationRef } from '../utils/navigationRef';

const PhotoTimerMonitor = () => {
    const { showToast } = useToast();
    const { getExpiry } = usePhotoTimer(); // We need a way to get all timers or check active ones. 
    // Actually, usePhotoTimer context currently only exposes getExpiry(uri).
    // We need to expose the list of active timers from the context to monitor them properly.
    // I will update PhotoTimerContext first to expose `timers`.

    // Assuming context is updated:
    const { timers } = usePhotoTimer();

    useEffect(() => {
        const checkTimers = () => {
            const now = Date.now();

            Object.entries(timers).forEach(([uri, expiry]) => {
                const remaining = Math.ceil((expiry - now) / 1000);

                // Trigger warning at exactly 30 seconds
                if (remaining === 30) {
                    showToast('30 seconds remaining to view photo!', 'warning');
                }

                // Additional urgent warning at 10 seconds
                if (remaining === 10) {
                    showToast('URGENT: 10 seconds left!', 'error');
                }
            });
        };

        const interval = setInterval(checkTimers, 1000);
        return () => clearInterval(interval);
    }, [timers, showToast]);

    return null; // Invisible component
};

export default PhotoTimerMonitor;
