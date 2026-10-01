import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError } from "./types";

export function useRequest<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const reset = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    setData(null);
    setError(null);
    setLoading(false);
  }, []);
  useEffect(
    () => () => {
      sequence.current++;
      controller.current?.abort();
    },
    [],
  );
  const run = useCallback(
    async (body: unknown) => {
      const id = ++sequence.current;
      controller.current?.abort();
      controller.current = new AbortController();
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const response = await fetch(`/api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.current.signal,
        });
        const result = await response.json();
        if (id !== sequence.current) return;
        if (!response.ok)
          setError(
            result.error ?? {
              code: "request_failed",
              message: "The request could not be completed.",
            },
          );
        else setData(result as T);
      } catch (error) {
        if (
          id === sequence.current &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setError({
            code: "connection",
            message:
              "Cannot reach the compiler. Check that the Python backend is running on port 8000.",
          });
        }
      } finally {
        if (id === sequence.current) setLoading(false);
      }
    },
    [endpoint],
  );
  return { data, error, loading, run, reset };
}

export function usePlayback<T>(events: readonly T[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [events]);
  useEffect(() => {
    if (!playing || !events.length) return;
    if (index >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setIndex((i) => Math.min(i + 1, events.length - 1)),
      900 / speed,
    );
    return () => window.clearTimeout(timer);
  }, [playing, index, speed, events]);
  const seek = useCallback(
    (value: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(value, events.length - 1)));
    },
    [events.length],
  );
  const toggle = () => {
    if (index >= events.length - 1) setIndex(0);
    setPlaying((p) => !p);
  };
  return {
    index: Math.min(index, Math.max(0, events.length - 1)),
    playing,
    speed,
    setSpeed,
    seek,
    toggle,
    count: events.length,
  };
}
export type PlaybackState = ReturnType<typeof usePlayback>;

export function useLocalSetting(key: string, fallback: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Private browsing can disable storage. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
