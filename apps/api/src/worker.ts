import { httpServerHandler } from 'cloudflare:node';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { setPrisma } from './lib/prisma.js';
import app from './app.js';

interface Env {
  DB: ConstructorParameters<typeof PrismaD1>[0];
}

// The Worker runtime routes incoming requests to this in-process listener.
const port = 8787;
app.listen(port);
const handler = httpServerHandler({ port });

let ready = false;

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Prisma's engine can't start in global scope (no randomness there), so connect on first request.
    if (!ready) {
      setPrisma(new PrismaClient({ adapter: new PrismaD1(env.DB) }));
      ready = true;
    }
    return handler.fetch!(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
