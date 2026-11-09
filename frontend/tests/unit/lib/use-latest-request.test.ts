import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLatestRequest } from "@/lib/use-latest-request";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useLatestRequest", () => {
  it("solo aplica la respuesta de la petición más reciente", async () => {
    const { result } = renderHook(() => useLatestRequest());
    const a = deferred<string>();
    const b = deferred<string>();
    const applied: string[] = [];

    act(() => {
      result.current.run(() => a.promise, (value) => applied.push(value));
      result.current.run(() => b.promise, (value) => applied.push(value));
    });
    await act(async () => {
      b.resolve("B");
      await b.promise;
    });
    await act(async () => {
      a.resolve("A");
      await a.promise;
    });

    expect(applied).toEqual(["B"]);
  });

  it("aborta la petición anterior y permite cancelar la última", async () => {
    const { result } = renderHook(() => useLatestRequest());
    const signals: AbortSignal[] = [];
    const applied: string[] = [];

    act(() => {
      result.current.run((signal) => {
        signals.push(signal);
        return new Promise<string>(() => undefined);
      }, (value) => applied.push(value));
      result.current.run((signal) => {
        signals.push(signal);
        return Promise.resolve("B");
      }, (value) => applied.push(value));
      result.current.cancel();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(true);
    expect(applied).toEqual([]);
  });
});
