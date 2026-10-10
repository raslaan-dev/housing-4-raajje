import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import applicationRoutes from './routes/applications.js';
import viewingRoutes from './routes/viewings.js';
import leaseRoutes from './routes/leases.js';
import paymentRoutes from './routes/payments.js';
import maintenanceRoutes from './routes/maintenance.js';
import adminRoutes from './routes/admin.js';
import clientRoutes from './routes/client.js';
import ownerRoutes from './routes/owner.js';
import staffRoutes from './routes/staff.js';
import { errorMiddleware } from './lib/http.js';

const app = express();
// Node-only middleware: Workers disallow timers at startup and eval (morgan compiles its format),
// and they already log requests. Rate limit there with a Cloudflare WAF rule instead.
const onWorkers = globalThis.navigator?.userAgent === 'Cloudflare-Workers';

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json());
// The portal is a single-page app that makes several reads per screen, so the general
// limit is generous; sign-in and registration get a tight limit of their own.
const limited = { windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Wait a few minutes, then try again.' } };
if (!onWorkers) {
  app.use(morgan('dev'));
  app.use('/api/auth', rateLimit({ ...limited, max: 60 }));
  app.use(rateLimit({ ...limited, max: 2000 }));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Housing_4_Raajje', environment: env.nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/viewings', viewingRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/staff', staffRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

app.use(errorMiddleware);

export default app;
