import { session } from './session.svelte';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined | null>;

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = session.user;
  if (user) {
    h['x-user-id'] = user.id;
    h['x-user-email'] = user.email;
    h['x-user-role'] = user.role;
    if (user.branch) h['x-user-branch'] = user.branch.id;
  }
  return h;
}

function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  let res: Response;
  try {
    res = await fetch(withQuery(`/api${path}`, query), {
      method,
      headers: headers(),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the API is running, then try again.');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const fallback =
      res.status === 401
        ? 'Your session has ended. Sign in again.'
        : res.status === 429
          ? 'Too many requests. Wait a few minutes, then try again.'
          : res.status === 403
          ? 'Your role does not have access to this.'
          : res.status >= 500
            ? 'The server could not complete this. Try again in a moment.'
            : `Request failed (${res.status}).`;
    throw new ApiError(res.status, data?.message ?? fallback);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {})
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
