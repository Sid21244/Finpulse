# FinPulse

A responsive personal-finance intelligence prototype built with React, Vinext, TypeScript, and the OpenAI Responses API. All financial information is realistic simulated data; there is no bank or UPI connection.

## Run locally

1. Open this folder in VS Code.
2. Open the integrated terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address shown in the terminal (normally `http://localhost:3000`).

## Included

- Responsive desktop sidebar and mobile bottom navigation
- Dashboard with net worth, metrics, cash-flow chart, spending, and AI insight
- Searchable and filterable transactions with fraud alert
- Analytics and spending signals
- AI financial copilot grounded in the simulated ledger and deterministic metrics
- Deterministic AI fallback responses when the API is unavailable
- Savings goals and contribution progress
- Debt payoff and credit-health views
- Browser voice expense entry with parsed amount, merchant, category, review, and ledger update
- Voice questions and spoken AI answers when supported by the browser

## AI configuration

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The key is read only by the server route and is never sent to browser code. `OPENAI_MODEL` defaults to `gpt-5.6-sol`.

The AI route sends only the simulated demo ledger and pre-calculated metrics. It uses `store: false` and falls back to deterministic evidence-backed answers if the API is unavailable.

## Voice support

Voice recognition uses the browser Speech Recognition API and requires microphone permission. Chrome-based browsers provide the most reliable hackathon demo. Every parsed expense is shown for review before it is saved.

## Other commands

- `npm run build` creates a production build.
- `npm run start` runs the built project.
- `npm run lint` checks source quality.

The app is intentionally frontend-only. Connect real APIs and authentication only after the demo flow is validated.
