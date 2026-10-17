import { createServer } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn().mockResolvedValue([]) }));
vi.mock('../apps/api/src/lib/prisma.js', () => ({ prisma: { user: { findMany } } }));

import authRoutes from '../apps/api/src/routes/auth.js';
import { errorMiddleware } from '../apps/api/src/lib/http.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalDemoLogin = process.env.DEMO_LOGIN;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalDemoLogin === undefined) delete process.env.DEMO_LOGIN;
  else process.env.DEMO_LOGIN = originalDemoLogin;
});

describe('demo sign-in endpoints', () => {
  it('returns 404 for both demo endpoints in production even when the flag is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_LOGIN = 'true';

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorMiddleware);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected an HTTP server address.');
      const baseUrl = `http://127.0.0.1:${address.port}/api/auth`;

      const accountsResponse = await fetch(`${baseUrl}/demo-accounts`);
      const loginResponse = await fetch(`${baseUrl}/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com' })
      });

      expect(accountsResponse.status).toBe(404);
      expect(loginResponse.status).toBe(404);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('allows demo sign-in in configured preview', async () => {
    process.env.NODE_ENV = 'preview';
    process.env.DEMO_LOGIN = 'true';

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorMiddleware);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected an HTTP server address.');
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/demo-accounts`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
