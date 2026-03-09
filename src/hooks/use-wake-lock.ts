
"use client";

import { useState, useEffect, useCallback } from 'react';

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        
        lock.addEventListener('release', () => {
          setWakeLock(null);
        });

      } catch (err: any) {
        // Handle NotAllowedError (Permissions Policy) gracefully without throwing a hard error
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock is disallowed by permissions policy.');
        } else {
          // Log other errors as warnings to avoid development error overlays
          console.warn(`${err.name}: ${err.message}`);
        }
      }
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock === null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (wakeLock !== null) {
        wakeLock.release().then(() => {
          setWakeLock(null);
        }).catch(() => {});
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, wakeLock]);

  return;
};
