import { Resend } from 'resend';
import { prisma } from './prisma.js';

export type Channel = 'SMS' | 'Email' | 'SMS + Email';

const apiKey = process.env.RESEND_API_KEY ?? '';
const resendConfigured = apiKey.startsWith('re_') && apiKey.length > 20 && !/your|placeholder|xxx|fake/i.test(apiKey);
const resend = resendConfigured ? new Resend(apiKey) : null;
const from = process.env.RESEND_FROM ?? 'Housing_4_Raajje <onboarding@resend.dev>';

/** Store an in-app notification and, when Resend is configured, send the email copy (fire and forget). */
export async function notify(userId: string, type: string, title: string, body: string, channel: Channel = 'Email') {
  const row = await prisma.notification.create({ data: { userId, type, title, body, channel } });

  if (resend && channel !== 'SMS') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    // Seeded accounts use the reserved .test domain; never try to deliver to them.
    if (user?.email && !user.email.endsWith('.test')) {
      resend.emails.send({ from, to: user.email, subject: title, text: body }).catch((err: unknown) => {
        console.warn('Resend email failed:', err);
      });
    }
  }

  return row;
}
