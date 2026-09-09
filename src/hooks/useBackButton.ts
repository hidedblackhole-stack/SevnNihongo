import { useEffect, useRef } from 'react';

/**
 * Hook to intercept the hardware back button on mobile devices.
 * 
 * @param isActive Whether the back button interception is currently active.
 * @param onBack Callback function when the back button is pressed.
 *        If it returns `false`, the back action is aborted (e.g. user cancelled prompt),
 *        and the hook will re-push the state to maintain the trap.
 */
export function useBackButton(
  isActive: boolean,
  onBack: () => boolean | void
) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive) return;

    // Push a dummy state to trap the back button
    window.history.pushState({ backTrap: true }, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      // Prevent standard browser back and invoke the onBack handler
      const shouldExit = onBackRef.current();

      if (shouldExit === false) {
        // User aborted the exit (e.g., cancelled the confirm dialog)
        // Re-push the trap state
        window.history.pushState({ backTrap: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive]);
}
