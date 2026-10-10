// Runs wrangler without the Workers Builds name pinning. The build is connected to the
// website Worker, so Cloudflare sets WRANGLER_CI_OVERRIDE_NAME / WRANGLER_CI_MATCH_TAG to
// force every deploy onto that one name. This repo deploys several Workers (API, website,
// and their preview copies), each named in its own wrangler.jsonc, so drop the pinning.
import { spawnSync } from 'node:child_process';

const env = { ...process.env };
delete env.WRANGLER_CI_OVERRIDE_NAME;
delete env.WRANGLER_CI_MATCH_TAG;

const { status } = spawnSync('npx', ['wrangler', ...process.argv.slice(2)], { env, stdio: 'inherit', shell: true });
process.exit(status ?? 1);
