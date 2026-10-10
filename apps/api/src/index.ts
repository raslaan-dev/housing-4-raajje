import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { setPrisma } from './lib/prisma.js';
import { env } from './config/env.js';
import app from './app.js';

setPrisma(new PrismaClient());

app.listen(env.port, () => {
  console.log(`Housing_4_Raajje API listening on http://localhost:${env.port}`);
});
