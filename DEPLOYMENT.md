# Reconcile — Production Deployment Checklist

This document details the configuration and environment setup required to deploy Reconcile to a production environment.

## 1. Required Environment Variables

Ensure the following environment variables are set in your production environment (e.g. Vercel, AWS, or local `.env`):

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | The API URL of your Supabase project | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The public anonymous key for Supabase client queries | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | The administrative service-role key (used for server-side pipeline operations) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (replaces OpenAI key for accounts-payable extraction) | `AIzaSyD-your-key-here` |

> [!CAUTION]
> Keep `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` strictly private. Never expose them to client components or push them to version control.

---

## 2. Supabase Database Migration

Apply the initial schema to your Supabase PostgreSQL instance:

1. Copy the contents of the initial migration file: [001_initial_schema.sql](file:///home/Sohan/Reconsile/supabase/migrations/001_initial_schema.sql)
2. In your Supabase Dashboard, navigate to the **SQL Editor**.
3. Create a new query, paste the SQL, and click **Run**.
4. This script will automatically:
   - Create all application tables (`vendors`, `purchase_orders`, `invoices`, etc.).
   - Configure constraints and performance indexes.
   - Enable **Row Level Security (RLS)** on all tables.
   - Create policies linking rows to `auth.users` (`auth.uid() = user_id`).
   - Create updated-at triggers.
   - Set up the private `invoices` storage bucket and its prefix-based policies.

---

## 3. Supabase Auth Configuration

Ensure that **Email Signups** are enabled in your Supabase Auth settings:

1. In Supabase Dashboard, go to **Auth** -> **Providers** -> **Email**.
2. Confirm **Enable Email Provider** is checked.
3. If you want to disable email confirmation for testing/easier onboarding, toggle off **Confirm email**.

---

## 4. Verification and Health

You can verify the health of the deployment:
- Access `/api/health` to confirm the server runs.
- Run `pnpm run build` to verify Next.js builds cleanly.
- Run `pnpm test` to run the deterministic validation test suite.
