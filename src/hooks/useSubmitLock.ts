'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useSubmitLock
 * Hook to guard form submissions and mutations against concurrent or accidental duplicate submissions.
 */
export function useSubmitLock<T = void, Args extends unknown[] = unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: { cooldownMs?: number } = {}
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      if (lockRef.current || isSubmitting) {
        console.warn('Submission blocked: operation already in flight.');
        return undefined;
      }

      lockRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        if (options.cooldownMs && options.cooldownMs > 0) {
          setTimeout(() => {
            lockRef.current = false;
            if (isMountedRef.current) {
              setIsSubmitting(false);
            }
          }, options.cooldownMs);
        } else {
          lockRef.current = false;
          if (isMountedRef.current) {
            setIsSubmitting(false);
          }
        }
      }
    },
    [asyncFn, isSubmitting, options.cooldownMs]
  );

  return {
    isSubmitting,
    execute,
  };
}
