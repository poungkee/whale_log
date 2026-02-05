import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export function useRefreshOnFocus(refetch: () => void, enabled: boolean = true) {
  const isFirstMount = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }

      refetch();
    }, [refetch, enabled])
  );
}

export function useRefreshOnInterval(
  refetch: () => void,
  intervalMs: number,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      refetch();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refetch, intervalMs, enabled]);
}
