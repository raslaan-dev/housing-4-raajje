import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { prisma } from './prisma.js';
import { HttpError } from './http.js';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function otpSecret() {
  const secret = process.env.STAFF_OTP_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(503, 'Staff email verification is not configured.');
  }
  return secret;
}

function otpHash(userId: string, code: string) {
  return createHmac('sha256', otpSecret()).update(`${userId}:${code}`).digest('hex');
}

function emailDestination(userEmail: string) {
  const destination = process.env.STAFF_OTP_EMAIL?.trim() || userEmail;
  if (destination.endsWith('.test')) {
    throw new HttpError(503, 'Configure STAFF_OTP_EMAIL to deliver staff verification codes.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
    throw new HttpError(503, 'Staff email verification has an invalid destination.');
  }
  return destination;
}

function maskedEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
}

async function sendCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY ?? '';
  if (!apiKey.startsWith('re_') || apiKey.length <= 20 || /your|placeholder|xxx|fake/i.test(apiKey)) {
    throw new HttpError(503, 'Staff email verification is not configured.');
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'Housing_4_Raajje <onboarding@resend.dev>',
    to: email,
    subject: 'Your staff sign-in code',
    text: `Your Housing_4_Raajje staff sign-in code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`
  });
  if (error) {
    console.error('Resend staff OTP delivery failed:', error);
    throw new HttpError(503, 'Could not send the staff verification email. Try again later.');
  }
}

export async function issueStaffOtp(userId: string, userEmail: string) {
  const secret = otpSecret();
  const destination = emailDestination(userEmail);
  const now = new Date();
  const existing = await prisma.staffOtpChallenge.findUnique({ where: { userId } });

  if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new HttpError(429, 'Wait a minute before requesting another verification code.');
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const data = {
    codeHash: createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex'),
    expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
    attempts: 0,
    lastSentAt: now
  };

  if (existing) {
    const updated = await prisma.staffOtpChallenge.updateMany({
      where: { id: existing.id, lastSentAt: existing.lastSentAt },
      data
    });
    if (updated.count !== 1) throw new HttpError(429, 'Wait a minute before requesting another verification code.');
  } else {
    try {
      await prisma.staffOtpChallenge.create({ data: { userId, ...data } });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new HttpError(429, 'Wait a minute before requesting another verification code.');
      }
      throw error;
    }
  }

  await sendCode(destination, code);
  return maskedEmail(destination);
}

export async function verifyStaffOtp(userId: string, code: string) {
  const challenge = await prisma.staffOtpChallenge.findUnique({ where: { userId } });
  const now = new Date();
  if (!challenge || challenge.expiresAt <= now || challenge.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(401, 'Invalid or expired verification code.');
  }

  const expected = Buffer.from(challenge.codeHash, 'hex');
  const provided = Buffer.from(otpHash(userId, code), 'hex');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    await prisma.staffOtpChallenge.updateMany({
      where: { id: challenge.id, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: now } },
      data: { attempts: { increment: 1 } }
    });
    throw new HttpError(401, 'Invalid or expired verification code.');
  }

  const consumed = await prisma.staffOtpChallenge.deleteMany({
    where: { id: challenge.id, codeHash: challenge.codeHash, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: now } }
  });
  if (consumed.count !== 1) throw new HttpError(401, 'Invalid or expired verification code.');
}
