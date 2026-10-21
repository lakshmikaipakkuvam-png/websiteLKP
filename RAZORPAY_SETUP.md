# Payment security and live setup

This React/Vite + Express + Supabase application uses Razorpay Standard Checkout. Only the public key ID is returned to the browser. API secrets are backend environment variables. The old simulated-success endpoint returns 410.

## Owner login

See ADMIN_LOGIN_SETUP.md. The verified owner UUID is 5569f562-3a8f-4a3a-b305-a84a9330f2bc for lakshmikaipakkuvam@gmail.com. The password is managed privately in Supabase Auth; no password was read, generated, or stored by this implementation. Configure ADMIN_USER_IDS and ADMIN_EMAIL on Render before using /admin.

## Security behavior

- Admin API access defaults to authenticated-only. Browser admin mutations require an allowed Origin and custom header. Secure HttpOnly sessions expire after at most one hour; logout invalidates them. A server restart requires signing in again.
- Guest orders belong to an opaque HttpOnly browser cookie. A phone number alone no longer retrieves another browser's orders or authorizes payment/reviews. Clearing cookies or using a different device requires owner assistance. Legacy orders remain admin-only.
- Prices, delivery, discounts, INR currency, receipt, and paise are computed on the server. Requests cannot select a cheaper amount. Orders are limited to 50 lines, 100 units per item and Rs. 100,000 total.
- Callback signatures use HMAC-SHA256 and constant-time comparison against the persisted provider order ID. The server fetches authoritative payment details and accepts captured payments only. Amount, currency, order and test/live mode must match.
- Atomic database settlement locks the order. Duplicates do not create another payment. Refund amounts never decrease; stale captures cannot undo refunds. Cancelled orders with a captured payment require owner review.
- POST /api/payment-status reconciles a lost browser callback for the owning browser. The checkout provides Check payment status. It does not charge the customer again.
- POST /api/webhooks/razorpay verifies the exact raw-body signature and merchant account, then fetches payment status from Razorpay. Configure payment.captured, order.paid and refund.processed. Retry delivery after transient failures is supported. Unknown payment orders return 503 to handle attachment races; this endpoint is intended for this shop's Standard Checkout orders.
- Only a paid, live-mode order can enter preparing/shipped/delivered or receive tracking details. Test and historical simulated payments cannot authorize fulfilment. No automatic refunds or real charges are initiated by the tests.
- App tables deny anon/authenticated database access and enable RLS; the server uses its private service-role credential. Keep that credential out of client code. Public image storage is separate; review its bucket policies before launch.

## Migration and deployment

The security migration is supabase/migrations/20261021090000_protect_guest_order_access.sql. It adds ownership/payment-state fields, an atomic settlement function restricted to service_role, fulfilment guards, and app-table access restrictions. Apply with the new backend deployment; old browser tabs must reload. Existing orders are preserved, but historic payments are not automatically certified as live.

Run npx supabase db push --linked --dry-run, then npx supabase db push --linked when deploying the new backend. Render auto-deploy is off: after pushing, use Manual Deploy > Deploy latest commit. Confirm the deployed /api/orders returns 401 without login and /admin displays Owner sign in.

## Live environment settings (enter privately in Render)

RAZORPAY_KEY_ID: your new live key ID
RAZORPAY_KEY_SECRET: its secret; never put this in chat, Git, or a VITE variable
RAZORPAY_WEBHOOK_SECRET: a separately generated random secret, also entered in Razorpay's webhook settings
RAZORPAY_ACCOUNT_ID: the exact account_id from Razorpay webhook payloads for your merchant account
LIVE_PAYMENTS_ENABLED: false until the deployed test-mode acceptance checks pass; then true for live activation
CORS_ORIGIN: https://lakshmikaipakkuvam.com,https://www.lakshmikaipakkuvam.com

Webhook URL: https://lakshmikaipakkuvam.com/api/webhooks/razorpay
To verify delivery when Razorpay does not show a delivery-history view, open Render service Logs and search for `razorpay_webhook` after a new test checkout. Successful processing logs `status:200`, `event:payment.captured` or `event:order.paid`, and `outcome:reconciled`. A 200 with `event_ignored` or `payment_ignored` does not confirm settlement. Failure labels distinguish `configuration_missing`, `signature_invalid`, `account_mismatch`, and `reconciliation_retry`. These logs exclude payloads, signatures, payment IDs, account IDs, and customer details. Historical deliveries before this logging release are not available in these application logs.
During rotation, RAZORPAY_WEBHOOK_PREVIOUS_SECRET can temporarily validate retries signed with the old secret. Remove it after the retry window.
Enable automatic payment capture in Razorpay. Authorized-only payments cannot release an order. Use separate test/live webhook secrets and switch both API keys together. Old test orders cannot be paid with live keys; create a fresh order after switching. Rotate the previously shared test secret.

## Tests and limits

Run npm --prefix api test, npm --prefix admin-dashboard test, npm --prefix admin-dashboard run build, and npm --prefix admin-dashboard run lint. Database tests use an isolated PGlite PostgreSQL fixture, not production records. Tests cover auth bypass, CSRF, forged/expired sessions, rate-limit spoofing, cross-browser ownership, forged signatures, amount/currency/order/mode tampering, replay, refunds, webhook authentication, reconciliation and fulfilment guards.

Before enabling live payments, test the deployed owner login plus Razorpay test-mode success, failure, cancellation, duplicate callback and callback-loss recovery. Confirm webhook delivery in Razorpay and compare the order/payment IDs. A real-money acceptance transaction must be performed by the owner after live configuration; none was performed by the agent.

These automated adversarial checks are not a full independent penetration test and cannot guarantee zero fraud. Browser end-to-end checkout and live webhook delivery still need acceptance testing. MFA is not implemented. Session storage and rate limiting assume one Render instance; proxy-based limits may be shared among visitors. Strict CSP enforcement is deferred until Razorpay browser compatibility is tested. Inventory reservation is not transactional; manually reconcile stock before fulfilment. Free-host cold starts can delay webhook delivery; monitor failed deliveries and reconcile payments before dispatch.

References:
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/
- https://supabase.com/docs/reference/javascript/auth-getuser
