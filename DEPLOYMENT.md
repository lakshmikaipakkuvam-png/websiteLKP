# lakshmikaipakkuvam.com deployment

Domain registrar: Hostinger. User requires free hosting and a live shop with real payments. Render's free plan is configured in `render.yaml`; the payment gateway is pending selection. Do not enable a paid hosting plan.

## Source and Render setup

1. Create an empty private GitHub repository named `lakshmikaipakkuvam`. Do not initialize it with a README, license, or gitignore when uploading the local repository.
2. Push the local project to that repository. Local `.env` files, dependencies, build output, and debug logs must stay excluded.
3. In Render, create a Blueprint from the private repository and grant access only to this repository. The Blueprint requests a free Node web service; verify the plan before creating it.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render's secure environment configuration using the backend's existing values. Do not paste secrets in chat or commit them.
5. Resolve the launch blockers below before deploying publicly. The current Blueprint is deployment configuration, not confirmation that the application is ready for customer orders.
6. After deployment, verify `/api/health`, the storefront, and API behavior on the assigned Render URL before changing domain DNS.

The production Express server serves the built storefront and preserves `/api` routes on the same origin. Local smoke checks passed for the health endpoint, unknown API route (JSON 404), storefront, and direct admin-page navigation. These checks do not verify authentication, database connectivity, or payment processing.

## Application

- `admin-dashboard`: React/Vite storefront at `/` and administration at `/admin`.
- `api`: Express backend mounted at `/api`, using Supabase database and storage.
- Build frontend: `npm --prefix admin-dashboard ci` then `npm --prefix admin-dashboard run build`.
- Production frontend uses `/api` on the same domain via `.env.production`. Configure hosting to route `/api/**` to the backend before the SPA fallback to `/index.html`.
- Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend environment configuration. Never place the service role key in a `VITE_` variable or static output.

## Launch blockers found during inspection

- Admin screens and privileged API routes have no authentication or authorization. Protect the backend as well as the UI before a public shop launch.
- Order lookup by phone does not verify customer ownership. Restrict access to customer order information.
- Checkout calls `/api/payments/test-success`, which records success without collecting money. A real shop needs a payment provider and server-side payment verification; a preview should stay access-restricted.
- There is no Firebase project selected or hosting deployment created for this app.

## Hosting choices

Firebase Hosting can serve the frontend and forward API requests to Cloud Functions or Cloud Run. The backend requires billing (Blaze). A Cloud Functions adaptation must account for pre-parsed multipart request bodies used by the existing Multer upload route, and keep local `.env` files out of uploaded source archives.

Vercel can host the frontend and Express backend, but commercial use requires a suitable paid plan. Check function request-size limits against uploads, currently configured for up to eight 5 MB images, before choosing this route.

Render offers free static sites and Node web services with custom domains, but its documentation advises against free instances for production: the API sleeps after 15 minutes idle and can take about a minute to wake. This is a material checkout availability limitation, not a production hosting recommendation. An alternative free-tier architecture requires adapting the backend to a compatible serverless provider and checking its quotas.

## Domain connection after deployment

1. Deploy and verify the app on the provider's generated URL.
2. Add `lakshmikaipakkuvam.com` and `www.lakshmikaipakkuvam.com` to the hosting project and choose the canonical hostname.
3. Enter the exact DNS records supplied by that project in Hostinger's DNS manager. Preserve email MX/TXT records; no registrar transfer is needed.
4. Wait for domain verification and HTTPS provisioning, then verify storefront, direct admin navigation, API requests, image uploads, and the intended checkout behavior.

References: https://firebase.google.com/docs/hosting/functions ; https://firebase.google.com/docs/hosting/custom-domain ; https://vercel.com/docs/plans/hobby
