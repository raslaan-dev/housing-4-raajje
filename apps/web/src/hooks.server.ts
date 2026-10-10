import type { Handle } from '@sveltejs/kit';

// In production the API is a separate Worker bound as API; in `vite dev` the proxy in
// vite.config.ts handles /api before this hook runs.
export const handle: Handle = async ({ event, resolve }) => {
  const api = event.platform?.env?.API;
  if (api && event.url.pathname.startsWith('/api/')) {
    return api.fetch(event.request);
  }
  return resolve(event);
};
