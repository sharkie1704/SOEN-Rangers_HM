import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "./client";

export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError && cause.status < 500 ? cause.message : fallback;
}

export interface ApiResource<T> {
  readonly data: T | undefined;
  readonly setData: Dispatch<SetStateAction<T | undefined>>;
  readonly loading: boolean;
  readonly error: string;
  readonly setError: Dispatch<SetStateAction<string>>;
  readonly reload: () => void;
}

export function useApi<T>(
  load: () => Promise<T>,
  fallbackError: string,
  deps: readonly unknown[] = [],
): ApiResource<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorMessage(cause, fallbackError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, ...deps]);

  return { data, setData, loading, error, setError, reload: () => setAttempt((count) => count + 1) };
}
