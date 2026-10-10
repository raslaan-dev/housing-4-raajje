import { errorMessage } from './api';

/** Loads data once on creation; `reload()` refetches, `set()` swaps in a mutation result. */
export function resource<T>(fetcher: () => Promise<T>) {
  const state = $state<{ data: T | undefined; error: string | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: true
  });

  async function reload() {
    state.loading = true;
    state.error = null;
    try {
      state.data = await fetcher();
    } catch (e) {
      state.error = errorMessage(e);
    } finally {
      state.loading = false;
    }
  }

  reload();

  return {
    get data() {
      return state.data;
    },
    get error() {
      return state.error;
    },
    get loading() {
      return state.loading;
    },
    reload,
    set(value: T) {
      state.data = value;
    }
  };
}

/** Wraps a mutation with busy/error state for one form or button. */
export function action() {
  const state = $state<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  return {
    get busy() {
      return state.busy;
    },
    get error() {
      return state.error;
    },
    clear() {
      state.error = null;
    },
    async run<R>(fn: () => Promise<R>): Promise<R | undefined> {
      if (state.busy) return undefined;
      state.busy = true;
      state.error = null;
      try {
        return await fn();
      } catch (e) {
        state.error = errorMessage(e);
        return undefined;
      } finally {
        state.busy = false;
      }
    }
  };
}
