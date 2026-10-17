import { createServer } from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique, challengeFindUnique, challengeCreate, challengeUpdateMany, challengeDeleteMany, sendEmail } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  challengeFindUnique: vi.fn(),
  challengeCreate: vi.fn(),
  challengeUpdateMany: vi.fn(),
  challengeDeleteMany: vi.fn(),
  sendEmail: vi.fn()
}));

vi.mock('../apps/api/src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    staffOtpChallenge: {
      findUnique: challengeFindUnique,
      create: challengeCreate,
      updateMany: challengeUpdateMany,
      deleteMany: challengeDeleteMany
    }
  }
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendEmail };
  }
}));

import authRoutes from '../apps/api/src/routes/auth.js';
import { errorMiddleware } from '../apps/api/src/lib/http.js';

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  demoLogin: process.env.DEMO_LOGIN,
  otpEmail: process.env.STAFF_OTP_EMAIL,
  otpSecret: process.env.STAFF_OTP_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM
};

const staffUser = {
  id: 'staff-1',
  code: 'STF-001',
  email: 'shiham.ali@housing-4-raajje.test',
  firstName: 'Shiham',
  lastName: 'Ali',
  status: 'ACTIVE',
  mfaEnabled: true,
  role: { name: 'SYSTEM_ADMIN' },
  branch: null
};

const clientUser = {
  ...staffUser,
  id: 'client-1',
  email: 'client@housing-4-raajje.test',
  role: { name: 'CLIENT' }
};

let challenge: Record<string, unknown> | null;

async function withAuthServer<T>(run: (baseUrl: string) => Promise<T>) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorMiddleware);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an HTTP server address.');
    return await run(`http://127.0.0.1:${address.port}/api/auth`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

beforeEach(() => {
  process.env.NODE_ENV = 'development';
  process.env.DEMO_LOGIN = 'true';
  process.env.STAFF_OTP_EMAIL = 'staff-otp@example.com';
  process.env.STAFF_OTP_SECRET = 'test-staff-otp-secret-that-is-at-least-32-characters';
  process.env.RESEND_API_KEY = 're_123456789012345678901234';
  process.env.RESEND_FROM = 'Housing Test <no-reply@example.test>';
  challenge = null;
  vi.resetAllMocks();
  userFindUnique.mockImplementation(({ where }: { where: { email: string } }) =>
    Promise.resolve(where.email === staffUser.email ? staffUser : where.email === clientUser.email ? clientUser : null)
  );
  challengeFindUnique.mockImplementation(() => Promise.resolve(challenge));
  challengeCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    challenge = { ...data, id: 'challenge-1', createdAt: new Date() };
    return Promise.resolve(challenge);
  });
  challengeUpdateMany.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    if (challenge) {
      const attempts = data.attempts as { increment?: number } | number | undefined;
      const updates = { ...data };
      if (attempts && typeof attempts === 'object' && 'increment' in attempts) {
        updates.attempts = Number(challenge.attempts ?? 0) + (attempts.increment ?? 0);
      }
      challenge = { ...challenge, ...updates };
    }
    return Promise.resolve({ count: 1 });
  });
  challengeDeleteMany.mockImplementation(() => {
    challenge = null;
    return Promise.resolve({ count: 1 });
  });
  sendEmail.mockResolvedValue({ data: { id: 'email-1' }, error: null });
});

afterEach(() => {
  if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.nodeEnv;
  if (originalEnv.demoLogin === undefined) delete process.env.DEMO_LOGIN;
  else process.env.DEMO_LOGIN = originalEnv.demoLogin;
  if (originalEnv.otpEmail === undefined) delete process.env.STAFF_OTP_EMAIL;
  else process.env.STAFF_OTP_EMAIL = originalEnv.otpEmail;
  if (originalEnv.otpSecret === undefined) delete process.env.STAFF_OTP_SECRET;
  else process.env.STAFF_OTP_SECRET = originalEnv.otpSecret;
  if (originalEnv.resendApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalEnv.resendApiKey;
  if (originalEnv.resendFrom === undefined) delete process.env.RESEND_FROM;
  else process.env.RESEND_FROM = originalEnv.resendFrom;
});

describe('staff email OTP', () => {
  it('emails a code to the configured shared mailbox and requires server-side verification', async () => {
    await withAuthServer(async (baseUrl) => {
      const login = await fetch(`${baseUrl}/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffUser.email, accountType: 'staff' })
      });
      const loginBody = await login.json();
      const emailArgs = sendEmail.mock.calls[0][0] as { to: string; text: string };
      const code = emailArgs.text.match(/\b(\d{6})\b/)?.[1];

      expect(login.status).toBe(200);
      expect(loginBody).toEqual({ otpRequired: true, destination: 's********@example.com' });
      expect(emailArgs.to).toBe('staff-otp@example.com');
      expect(challenge).not.toBeNull();
      expect((challenge as { codeHash: string }).codeHash).not.toContain(code);
      expect(code).toBeDefined();

      const verification = await fetch(`${baseUrl}/staff-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffUser.email, code })
      });

      expect(verification.status).toBe(200);
      expect(await verification.json()).toMatchObject({ user: { id: staffUser.id, role: 'SYSTEM_ADMIN' } });
      expect(challengeDeleteMany).toHaveBeenCalledOnce();
      expect(challenge).toBeNull();
    });
  });

  it('does not email client accounts', async () => {
    await withAuthServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientUser.email, accountType: 'client' })
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ user: { id: clientUser.id, role: 'CLIENT' } });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(challengeCreate).not.toHaveBeenCalled();
    });
  });

  it('enforces the resend cooldown', async () => {
    challenge = {
      id: 'challenge-1',
      userId: staffUser.id,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0
    };

    await withAuthServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/staff-otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffUser.email })
      });

      expect(response.status).toBe(429);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  it('rejects an incorrect code and increments the attempt count', async () => {
    challenge = {
      id: 'challenge-1',
      userId: staffUser.id,
      codeHash: '0'.repeat(64),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date()
    };

    await withAuthServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/staff-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffUser.email, code: '123456' })
      });

      expect(response.status).toBe(401);
      expect(challengeUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { attempts: { increment: 1 } } }));
      expect(challengeDeleteMany).not.toHaveBeenCalled();
    });
  });

  it('locks the code after five incorrect attempts', async () => {
    challenge = {
      id: 'challenge-1',
      userId: staffUser.id,
      codeHash: '0'.repeat(64),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      lastSentAt: new Date()
    };

    await withAuthServer(async (baseUrl) => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await fetch(`${baseUrl}/staff-otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: staffUser.email, code: '123456' })
        });
        expect(response.status).toBe(401);
      }

      expect((challenge as { attempts: number }).attempts).toBe(5);
      expect(challengeUpdateMany).toHaveBeenCalledTimes(5);
    });
  });
});
