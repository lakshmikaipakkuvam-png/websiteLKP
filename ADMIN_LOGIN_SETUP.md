# Owner login

The `/admin` page requires a server-validated owner session. There is no password in source code, environment examples, frontend storage, or Git. The owner uses Supabase Auth email/password authentication.

## One-time setup

1. In the linked Supabase project, open Authentication → Users → Add user → Create new user. Use `lakshmikaipakkuvam@gmail.com`, set a strong private password, and confirm the email for this known owner. Do not send the password through chat. If the account exists, use that account; do not create a duplicate.
2. Copy the user's UUID. In Render's Environment settings set `ADMIN_USER_IDS` to that UUID and `ADMIN_EMAIL` to `lakshmikaipakkuvam@gmail.com`. The service denies admin login if the UUID is missing.
3. Ensure `CORS_ORIGIN` includes the exact origin used for administration: `https://lakshmikaipakkuvam.com,https://www.lakshmikaipakkuvam.com`. To use the Render hostname for admin, explicitly add that HTTPS origin too. Do not use wildcards.
4. Deploy the code, open `https://lakshmikaipakkuvam.com/admin`, and sign in. Verify product edits, orders, profile updates, and logout. An unauthenticated request to `/api/orders` must return 401.
5. For local use set the same admin UUID in ignored `api/.env`; run the API and Vite. Admin requests always use Vite's `/api` proxy.

## Session behavior

Only the configured UUID with the expected confirmed email is accepted. Admin read and write APIs require a server session; mutations also require an allowed Origin and custom request header. The browser receives a random HttpOnly, Secure, SameSite=Strict cookie in production, never the Supabase access token. Sessions expire in at most one hour, are invalidated on logout, and are lost on server restart. Each request also checks the identity with Supabase. The in-memory session store is suitable for the current single Render instance; multiple instances require a shared session store. Login attempts are limited per directly connected IP, without trusting arbitrary forwarded headers. Behind a proxy this may share a limit among users; do not enable arbitrary proxy trust to bypass this restriction.

## Validation and remaining launch requirements

`npm --prefix api test` exercises unauthorized API access, cookie flags, logout replay, expiry, forged/non-owner sessions, CSRF, missing configuration and login throttling, alongside payment signature tests. These are isolated automated tests, not a complete independent penetration test or a guarantee of security.

Guest order ownership, webhook reconciliation, refund state handling, database API-only access, and fulfilment gating are included in the security migration. Existing guest orders are not reassigned based on an unverified phone number; the owner can access them after login. See `RAZORPAY_SETUP.md` for the remaining live configuration and browser acceptance checks. Automated local tests do not replace testing the deployed login and Razorpay integration.
