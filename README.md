# Lakshmi Kai Pakkuvam

Storefront and administration website for lakshmikaipakkuvam.com.

- `admin-dashboard/`: React storefront and admin interface.
- `api/`: Express API using Supabase.
- `supabase/migrations/`: Database migrations.
- `render.yaml`: Free Render web service configuration.

See [DEPLOYMENT.md](DEPLOYMENT.md) for setup and outstanding launch requirements, and [RAZORPAY_SETUP.md](RAZORPAY_SETUP.md) for the Razorpay checkout integration. Authentication and approved live payment configuration must be completed before accepting customer orders.

## Local development

Install dependencies with `npm --prefix api ci` and `npm --prefix admin-dashboard ci`.
Copy each `.env.example` to `.env` in its own directory and configure local values.
Run `npm run dev` from `api/` and `admin-dashboard/` in separate terminals.

Never commit secrets or local environment files.
