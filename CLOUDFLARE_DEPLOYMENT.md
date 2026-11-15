# Cloudflare deployment

## Current deployment

On November 14, 2026 (America/Los_Angeles), the root and `www` business domains
were attached to the existing Worker `lkp-shop-preview`. The internal Worker name
does not appear in the customer domain. Live payments are enabled using the
existing server settings; no new payment keys, database, or product records were
created. Deployed version: `7324d105-acf2-427a-9ee3-6161473f2c45`.

Both domains passed HTTPS, health, catalog (28 products), and access-control checks.
The root domain passed the Chrome Buy It Now and shipping checks and the signed
ignored webhook test. The owner confirmed preview admin login/orders and the
admin-only Worker payment SDK readiness check. A real captured checkout and large
upload have not been exercised by these checks.

After cutover, the owner confirmed updating and enabling the existing Razorpay
live webhook at `https://lakshmikaipakkuvam.com/api/webhooks/razorpay`, retaining
its secret and events. Subsequent live-domain checks passed: storefront/admin,
health, 28-product catalog, anonymous order access denial, read-only gateway
credential verification, and signed/forged webhook handling. This confirmation
and synthetic webhook test do not establish that Razorpay has delivered an actual
captured-payment event; that remains part of a supervised checkout validation.

The React storefront is served as Workers Static Assets. Only `/api` and `/api/*`
invoke the Express Worker. The application continues to use the existing Supabase
database and storage; no database migration or data copy is required.

## Runtime changes

- `api/app.js` builds the shared Express application. `api/server.js` remains the
  Node/Render entry point; `api/worker.js` is the Cloudflare entry point.
- Worker admin sessions use a SQLite-backed Durable Object, retaining the same
  opaque secure cookies and Supabase owner checks across Worker instances.
- The Worker sanitizes the client-IP forwarding header before Express rate limiting.
  In-memory rate counters are per Worker instance; they are not a global limit.
- `api/scripts/build-worker.mjs` bundles Node dependency entrypoints. Wrangler's
  default browser resolution disables iconv-lite's streams and cannot be used.
- Existing order creation, shipping, discounts, payment signature verification,
  refunds, capture checks, and database payment invariants remain in their modules.
- `/api/runtime-readiness` is admin-only and checks the actual Worker Razorpay SDK
  with a read-only list request. It returns a boolean and never order data.

## Local credentials

`api/.env.cloudflare` contains deployment access. `api/.env.migration` contains
existing server settings. Both files, `.dev.vars`, and `.wrangler/` are ignored by
Git. Do not put service-role keys or payment secrets into `VITE_` variables.

From `api`, using PowerShell:

```powershell
node --env-file=.env.cloudflare node_modules/wrangler/bin/wrangler.js whoami
node scripts/prepare-migration-secrets.mjs
node --env-file=.env.cloudflare node_modules/wrangler/bin/wrangler.js secret bulk .wrangler/migration-secrets.json
```

Secret preparation intentionally excludes `LIVE_PAYMENTS_ENABLED`. That flag is
controlled explicitly in `wrangler.jsonc`. Do not overwrite secrets with examples.

## Build and deploy

From the repository root:

```powershell
npm.cmd --prefix api ci --include=dev
npm.cmd --prefix admin-dashboard ci --include=dev
npm.cmd --prefix api test
npm.cmd --prefix admin-dashboard test
npm.cmd --prefix admin-dashboard run lint
npm.cmd --prefix admin-dashboard run build
```

Then from `api`:

```powershell
node --env-file=.env.cloudflare node_modules/wrangler/bin/wrangler.js deploy --dry-run
node --env-file=.env.cloudflare node_modules/wrangler/bin/wrangler.js deploy
```

Check the configured domains and live-payment flag before deploying. Deploying
`wrangler.jsonc` applies its custom-domain routes and variables to the Worker.
Wrangler retains existing encrypted secrets. No paid plan is required by this
configuration; free request, CPU, storage, and Durable Object quotas still apply.

## Validation and cutover

1. Confirm Cloudflare zone activation and the assigned nameservers.
2. On a payments-disabled preview, check public catalog, anonymous access denial,
   owner login and orders, Buy It Now, state/district dropdowns, and shipping.
3. While logged into admin, open `/api/runtime-readiness` and confirm
   `{"gatewayReady":true}`.
4. Test raw webhook signatures with an intentionally ignored signed event. The
   `scripts/check-preview-payments.mjs` script does not reconcile, charge, or refund.
5. Enable live payments and attach the root/www custom domains together only after
   readiness checks pass and the cutover is authorized.
6. Verify both domains over HTTPS, `/api/health`, public catalog, and checkout.
7. Verify Razorpay's live webhook URL is the same existing domain plus
   `/api/webhooks/razorpay`, enabled for the existing events. A Render-hostname URL
   must be changed to the business domain. Do not recreate keys or change the
   webhook secret during cutover.
8. A supervised real checkout and upload test are still required for end-to-end
   confirmation. Read-only tests do not prove a live transaction was captured.

The original root A record targeted `216.24.57.1` (Render). Nameservers were moved
from Hostinger to `cloe.ns.cloudflare.com` and `matias.ns.cloudflare.com`.
Restoring Render routing only helps after its suspended service is restored.

## Testing helpers

- `scripts/check-cloudflare-preview.mjs [base-url]`: read-only HTTP/catalog checks.
- `scripts/check-preview-browser.mjs`: Chrome storefront, Buy It Now, and shipping
  checks. It dismisses the existing offer popup and submits no orders/payments.
- `scripts/cloudflare-smoke.mjs`: local Worker test with a fake upstream; no live
  data. On the current Windows host, workerd exits with `0xC0000135` (a missing
  runtime library), so this local test has not passed. Remote preview testing is
  required until that host dependency is repaired.

After restoring service, rotate secrets shared in chat through the provider
dashboards and update the encrypted Worker secrets. Keep the local files private.
