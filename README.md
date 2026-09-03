# FinPulse

A responsive, installable personal-finance application built with Next.js, React, TypeScript, and Supabase. It includes a private ledger assistant, confirmed voice transaction entry, budgets, alerts, goals, and demo-safe financial import flows.

## Run locally

1. Open this folder in VS Code.
2. Open the integrated terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address shown in the terminal (normally `http://localhost:3000`).

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` before testing authentication or persistent ledger features. Apply the migrations in `supabase/migrations` to the connected Supabase project.

## Included

- Responsive desktop sidebar and mobile navigation with dark and white themes
- Navy/cyan authentication experience with dark theme as the first-visit default
- Installable mobile PWA manifest, icons, safe static-asset service worker, and install control
- Dashboard with net worth, metrics, cash-flow chart, spending, and AI insight
- Searchable and filterable transactions with fraud alert
- Analytics and spending signals
- Private financial copilot grounded in the signed-in user's Supabase ledger
- Savings goals and contribution progress
- Debt payoff and credit-health views
- Browser voice expense, debit, and credit entry with parsed amount, merchant, category, review, and confirmed ledger update

## Install on mobile

- Android/Chrome: open the deployed HTTPS site and use the download button in the dashboard or **Install app** from the browser menu.
- iPhone/iPad/Safari: tap **Share**, then **Add to Home Screen**.
- Local HTTP installation support varies by browser. Use the deployed HTTPS address for the real install test.

## Deploy on Vercel

Import this repository into Vercel and keep the detected framework as **Next.js**. Leave the build and output settings on their defaults. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** for Production and Preview, then redeploy. Update the Supabase Site URL and redirect allow-list to include the final Vercel domain and `/auth/callback`.

## Voice support

Voice recognition uses the browser Speech Recognition API and requires microphone permission. Chrome-based browsers provide the most reliable hackathon demo. Say phrases such as “Debit 350 for lunch” or “Credit 65,000 salary.” Every parsed transaction is shown for review before it is saved.

## Bank and UPI connections

CSV statement import is the usable hackathon connection path. Direct bank, card, and UPI data connections require an approved Account Aggregator or banking-data provider. Money transfers are deliberately not implemented: production transfers require a regulated payment partner, explicit user consent, transaction signing, bank approval, fraud controls, and compliance review.

## Other commands

- `npm run build` creates a production build.
- `npm run start` runs the built project.
- `npm run lint` checks source quality.

Do not describe simulated connections as real and do not add a transfer button until a regulated provider has been selected and reviewed.
