import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';

export type RemoteState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | null; error: ApiError };

/** Loads data now and then every `intervalMs`; keeps the last good value if a refresh fails. */
export function usePolling<T>(
  load: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  deps: readonly unknown[],
): RemoteState<T> {
  const [state, setState] = useState<RemoteState<T>>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let controller = new AbortController();

    const run = async () => {
      controller.abort();
      controller = new AbortController();
      try {
        const data = await load(controller.signal);
        setState({ status: 'success', data, error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError('UNKNOWN_ERROR', String(err));
        setState((previous) => ({ status: 'error', data: previous.data, error }));
      }
    };

    run();
    const timer = window.setInterval(run, intervalMs);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
