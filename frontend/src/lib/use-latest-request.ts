"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Lanza peticiones y aplica solo la respuesta de la más reciente: las anteriores se abortan y, si
 * aun así responden, se descartan (Edge Cases, "Respuestas fuera de orden").
 */
export function useLatestRequest() {
  const current = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    current.current?.abort();
    current.current = null;
  }, []);

  const run = useCallback(
    <T,>(request: (signal: AbortSignal) => Promise<T>, onResult: (value: T) => void, onError?: () => void) => {
      current.current?.abort();
      const controller = new AbortController();
      current.current = controller;
      request(controller.signal).then(
        (value) => {
          if (current.current === controller) onResult(value);
        },
        () => {
          if (current.current === controller) onError?.();
        },
      );
    },
    [],
  );

  useEffect(() => cancel, [cancel]);

  return { run, cancel };
}
