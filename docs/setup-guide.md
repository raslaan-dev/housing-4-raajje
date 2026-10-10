# Setup guide

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide valid environment values.
3. Run `npm run db:generate`.
4. Run `npm run db:push`.
5. Run `npm run db:seed`.
6. Start the API with `npm run api:dev`.
7. Start the web app with `npm run web:dev`.

Production use requires valid Clerk and Resend credentials in application environment variables.

## Deploy the web app to Cloudflare Workers

The SvelteKit app is in the `apps/web` workspace and uses the Cloudflare adapter. For Git-connected Workers Builds, open the Worker’s **Settings > Build** and set **Root directory** to `/apps/web` and **Build command** to `npm run build`. This makes Cloudflare run the build and deploy from the web app instead of the npm workspace root. Keep deployments connected to the GitHub repository; Cloudflare applies the saved build settings on the next build.

The API in `apps/api` is a separate service and is not included in this Worker deployment.
