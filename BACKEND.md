# FinPulse backend

FinPulse uses Supabase for authentication, PostgreSQL, row-level security, private document storage, database workflows, and Edge Functions. OpenAI is called only from the `financial-assistant` Edge Function; the browser never receives the OpenAI API key.

## What is implemented

- Supabase email/password authentication with protected dashboard routes
- Accounts for banks, UPI, cash, cards, loans, and investments
- Unified, deduplicated transaction ledger with CSV imports
- Atomic manual and voice expense entry
- Loan details and debt-to-income calculation
- Investment holdings and net-worth calculation
- Credit-score history and utilisation
- Emergency runway, savings rate, monthly spending, category mix, and cash-flow RPC
- Goals and contribution tracking
- Rule-based fraud signals for duplicates, late-night high-value payments, and spending outliers
- Private financial-document storage and tax summary records
- Ledger-grounded FinPulse AI conversations and message history
- Private in-app financial assistant that calculates monthly income, spending, savings, budget warnings, and fraud notifications from the authenticated user's ledger
- Natural-language expense capture with an explicit confirmation step before the `create_expense` database workflow runs
- Per-user row-level security on every financial record
- Optional sample-data workflow for hackathon demonstrations

## Connect a Supabase project

1. Create or select a Supabase project.
2. Copy `.env.example` to `.env.local` and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings → API**. The publishable/anonymous key is public browser configuration; never use the service-role key in the browser.
3. Link the local project and apply migrations:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

4. Add the server-only OpenAI secret and deploy the two Edge Functions:

   ```sh
   npx supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY OPENAI_MODEL=gpt-5.6-luna
   npx supabase functions deploy financial-assistant
   npx supabase functions deploy import-financial-data
   ```

5. In Supabase Authentication URL settings, set the Site URL to the deployed FinPulse origin and add local and deployed callback URLs ending in `/auth/callback` for email confirmation and password recovery.

## Authentication routes

- `/login` supports email/password signup and sign-in.
- `/auth/callback` completes PKCE email-confirmation and recovery callbacks.
- `/reset-password` sends recovery mail and accepts a new password after callback.
- `/onboarding` stores the user's financial baseline in `profiles`.
- `/` is protected in the browser, while PostgreSQL row-level security is the final authorization boundary for financial records.

## Security rules

- Never put a secret or service-role key in any `VITE_*` variable.
- Browser queries run with the signed-in user's JWT and are constrained by PostgreSQL row-level security.
- Documents live in a private bucket under a user-ID folder.
- The web assistant currently keeps balances and transaction details inside FinPulse and uses deterministic, ledger-grounded answers. The optional Edge Function can call OpenAI, but it must not be connected to real financial data without explicit user consent and a reviewed data-minimization policy.
- Fraud and tax results are signals and estimates, not proof of fraud or a filed tax return.

## Import format

CSV headers are normalized automatically. The importer recognises common fields including:

```csv
date,description,amount,type,category,channel,reference
2026-09-01,Reliance Smart,1840,debit,Food & Dining,UPI,TXN-1001
2026-09-01,Salary Credit,48000,credit,Income,Bank,TXN-1002
```

It also supports separate `debit` and `credit` columns. Invalid rows are counted as needing review; duplicates are skipped using a stable row hash.
