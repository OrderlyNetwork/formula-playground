import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to measure node dimensions and report them for layout calculation
 * Uses ResizeObserver to track size changes
 * Dispatches custom events when dimensions change so layout can be recalculated
 */
export function useNodeDimensions(nodeId: string) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  /**
   * Measure and report node dimensions
   */
  const measureDimensions = useCallback(() => {
    if (!nodeRef.current) return;

    const rect = nodeRef.current.getBoundingClientRect();
    const currentDimensions = {
      width: rect.width,
      height: rect.height,
    };

    // Only dispatch event if dimensions actually changed
    if (
      !lastDimensionsRef.current ||
      lastDimensionsRef.current.width !== currentDimensions.width ||
      lastDimensionsRef.current.height !== currentDimensions.height
    ) {
      lastDimensionsRef.current = currentDimensions;

      // Trigger custom event to notify that dimensions have changed
      window.dispatchEvent(
        new CustomEvent("node-dimensions-changed", {
          detail: {
            nodeId,
            width: currentDimensions.width,
            height: currentDimensions.height,
          },
        })
      );
    }
  }, [nodeId]);

  useEffect(() => {
    if (!nodeRef.current) return;

    let debounceTimeoutId: number | null = null;

    // Initial measurement with a small delay to ensure DOM is fully rendered
    const initialTimeoutId = setTimeout(() => {
      measureDimensions();
    }, 0);

    // Use ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce rapid resize events
      if (debounceTimeoutId !== null) {
        clearTimeout(debounceTimeoutId);
      }
      debounceTimeoutId = window.setTimeout(() => {
        measureDimensions();
        debounceTimeoutId = null;
      }, 100);
    });

    resizeObserver.observe(nodeRef.current);

    return () => {
      clearTimeout(initialTimeoutId);
      if (debounceTimeoutId !== null) {
        clearTimeout(debounceTimeoutId);
      }
      resizeObserver.disconnect();
    };
  }, [measureDimensions]);

  return nodeRef;
}

