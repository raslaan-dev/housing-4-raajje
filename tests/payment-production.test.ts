import { createServer } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { paymentCreate, paymentFindMany } = vi.hoisted(() => ({
  paymentCreate: vi.fn(),
  paymentFindMany: vi.fn()
}));
vi.mock('../apps/api/src/lib/prisma.js', () => ({
  prisma: {
    payment: { create: paymentCreate, findMany: paymentFindMany },
    user: { findUnique: vi.fn() }
  }
}));
vi.mock('../apps/api/src/middleware/auth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next()
}));
vi.mock('../apps/api/src/middleware/authorize.js', () => ({
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next()
}));

import clientRoutes from '../apps/api/src/routes/client.js';
import legacyPaymentRoutes from '../apps/api/src/routes/payments.js';
import { errorMiddleware } from '../apps/api/src/lib/http.js';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  vi.clearAllMocks();
});

describe('production payment routes', () => {
  it('refuses simulated client payments without writing a payment record', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.use(express.json());
    app.use('/api/client', clientRoutes);
    app.use(errorMiddleware);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected an HTTP server address.');

      const response = await fetch(`http://127.0.0.1:${address.port}/api/client/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-10' })
      });

      expect(response.status).toBe(503);
      expect(paymentCreate).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it('hides legacy payment list and write endpoints in production', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.use(express.json());
    app.use('/api/payments', legacyPaymentRoutes);
    app.use(errorMiddleware);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected an HTTP server address.');
      const baseUrl = `http://127.0.0.1:${address.port}/api/payments`;

      const listResponse = await fetch(baseUrl);
      const writeResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', amount: 1 })
      });

      expect(listResponse.status).toBe(404);
      expect(writeResponse.status).toBe(404);
      expect(paymentFindMany).not.toHaveBeenCalled();
      expect(paymentCreate).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
