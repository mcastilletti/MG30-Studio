

"use client";

import { useState, useEffect, useCallback } from 'react';

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Screen Wake Lock is active.');
        
        lock.addEventListener('release', () => {
          console.log('Screen Wake Lock was released.');
          setWakeLock(null);
        });

      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    } else {
      console.log('Wake Lock API is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    // Request wake lock when the component mounts
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock === null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Release wake lock when the component unmounts
    return () => {
      if (wakeLock !== null) {
        wakeLock.release().then(() => {
          setWakeLock(null);
          console.log('Screen Wake Lock released on unmount.');
        });
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock, wakeLock]);

  return;
};
