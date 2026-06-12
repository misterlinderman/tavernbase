import { useCallback, useEffect, useRef, useState } from 'react';

const SEQUENCE = ['a', 's', 'k'] as const;
const RESET_MS = 2000;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useAskEasterEgg(enabled: boolean): {
  isOpen: boolean;
  close: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const indexRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetSequence = useCallback(() => {
    indexRef.current = 0;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(resetSequence, RESET_MS);
  }, [resetSequence]);

  useEffect(() => {
    if (!enabled) {
      resetSequence();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const expected = SEQUENCE[indexRef.current];

      if (key === expected) {
        indexRef.current += 1;
        scheduleReset();

        if (indexRef.current === SEQUENCE.length) {
          resetSequence();
          setIsOpen(true);
        }
        return;
      }

      indexRef.current = key === SEQUENCE[0] ? 1 : 0;
      if (indexRef.current > 0) {
        scheduleReset();
      } else {
        resetSequence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, [enabled, resetSequence, scheduleReset]);

  return { isOpen, close };
}
