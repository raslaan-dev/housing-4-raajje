import type { PrismaClient } from '@prisma/client';

// The client depends on the runtime: Node opens the SQLite file from DATABASE_URL, the
// Worker talks to D1 through its binding. Each entry point installs one before serving.
export let prisma: PrismaClient;

export function setPrisma(client: PrismaClient) {
  prisma = client;
}
