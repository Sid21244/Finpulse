import { debts, goals, spending, transactions as seededTransactions } from '../../data/mockData';

type LedgerItem = {
  merchant: string;
  category: string;
  date: string;
  amount: number;
  status?: string;
};

const MONTHLY_INCOME = 65_000;
const BASE_MONTHLY_EXPENSES = 41_250;
const LIQUID_SAVINGS = 186_000;
const ESSENTIAL_MONTHLY_EXPENSES = 35_770;

function cleanLedger(value: unknown): LedgerItem[] {
  if (!Array.isArray(value)) return seededTransactions;

  return value.slice(0, 50).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<LedgerItem>;
    if (
      typeof candidate.merchant !== 'string' ||
      typeof candidate.category !== 'string' ||
      typeof candidate.date !== 'string' ||
      typeof candidate.amount !== 'number' ||
      !Number.isFinite(candidate.amount)
    ) return [];

    return [{
      merchant: candidate.merchant.slice(0, 80),
      category: candidate.category.slice(0, 60),
      date: candidate.date.slice(0, 60),
      amount: Math.round(candidate.amount * 100) / 100,
      status: typeof candidate.status === 'string' ? candidate.status.slice(0, 40) : undefined,
    }];
  });
}

function buildFinancialContext(ledger: LedgerItem[]) {
  const voiceExpenses = ledger
    .filter((item) => !seededTransactions.some((seed) => seed.merchant === item.merchant && seed.amount === item.amount))
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const monthlyExpenses = BASE_MONTHLY_EXPENSES + voiceExpenses;
  const monthlyEmis = debts.reduce((sum, debt) => sum + debt.emi, 0);
  const savingsRate = ((MONTHLY_INCOME - monthlyExpenses) / MONTHLY_INCOME) * 100;
  const dti = (monthlyEmis / MONTHLY_INCOME) * 100;
  const runway = LIQUID_SAVINGS / ESSENTIAL_MONTHLY_EXPENSES;

  return {
    profile: 'Alex Sharma, salaried professional in India. All values are simulated hackathon data.',
    metrics: {
      monthlyIncome: MONTHLY_INCOME,
      monthlyExpenses,
      monthlyEmis,
      savingsRate: Number(savingsRate.toFixed(1)),
      debtToIncome: Number(dti.toFixed(1)),
      emergencyRunwayMonths: Number(runway.toFixed(1)),
      liquidSavings: LIQUID_SAVINGS,
      flaggedTransactions: 1,
    },
    spending,
    debts,
    goals,
    recentTransactions: ledger.slice(0, 12),
    deterministicSignals: [
      'Food-delivery spending is 28% above the three-month average.',
      'Three streaming subscriptions renewed this week.',
      'A ₹7,990 DIGITAL HUB card payment at 3:42 AM is flagged as unusual, not confirmed fraud.',
      'Credit health shown by FinPulse is an internal estimate, not a bureau credit score.',
    ],
  };
}

function fallbackAnswer(question: string, context: ReturnType<typeof buildFinancialContext>) {
  const query = question.toLowerCase();
  const { metrics } = context;

  if (query.includes('afford') || query.includes('trip') || query.includes('purchase')) {
    return `A ₹50,000 purchase would consume about ${Math.round(50_000 / metrics.liquidSavings * 100)}% of your liquid savings. Your current monthly surplus is ₹${(metrics.monthlyIncome - metrics.monthlyExpenses).toLocaleString('en-IN')}, so paying immediately would reduce your 5.2-month emergency runway. Safer option: fund it over several months without touching the emergency reserve. Assumption: your income and essential expenses stay stable.`;
  }
  if (query.includes('spend') || query.includes('money') || query.includes('reduce')) {
    return `Housing is your largest category at ₹18,400, followed by food at ₹8,240. The clearest controllable issue is food delivery, which is 28% above your three-month average. A weekly cap of ₹1,400 is a realistic first cut. Evidence: September expenses are ₹${metrics.monthlyExpenses.toLocaleString('en-IN')} and your savings rate is ${metrics.savingsRate}%.`;
  }
  if (query.includes('debt') || query.includes('credit')) {
    return `Your monthly EMIs total ₹${metrics.monthlyEmis.toLocaleString('en-IN')}, making debt-to-income ${metrics.debtToIncome}%. That is high, and the 36% revolving credit-card rate is the most expensive balance. Prioritize that card before accelerating the lower-rate home loan. FinPulse's credit-health indicator is an estimate, not an official bureau score.`;
  }
  if (query.includes('fraud') || query.includes('suspicious') || query.includes('unusual')) {
    return `One payment needs review: ₹7,990 at DIGITAL HUB at 3:42 AM. It was flagged because the merchant is unusual and the time is outside your normal pattern. This is a warning signal, not proof of fraud; verify it before blocking the card.`;
  }
  if (query.includes('runway') || query.includes('emergency')) {
    return `Your liquid savings of ₹${metrics.liquidSavings.toLocaleString('en-IN')} cover about ${metrics.emergencyRunwayMonths} months of essential expenses. That is stable, but below a strong six-month buffer. Direct the next ₹8,500 of surplus toward the emergency fund before increasing discretionary spending.`;
  }

  return `Your cash flow is positive: income is ₹${metrics.monthlyIncome.toLocaleString('en-IN')}, expenses are ₹${metrics.monthlyExpenses.toLocaleString('en-IN')}, and the savings rate is ${metrics.savingsRate}%. The biggest risks are a ${metrics.debtToIncome}% debt-to-income ratio and rising food-delivery spending. Ask about affordability, spending, debt, runway, or suspicious transactions for an evidence-backed answer.`;
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === 'string') return response.output_text.trim();
  if (!Array.isArray(response.output)) return '';

  return response.output.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) return [];
    return item.content.flatMap((part) => {
      if (!part || typeof part !== 'object' || !('text' in part) || typeof part.text !== 'string') return [];
      return [part.text];
    });
  }).join('\n').trim();
}

export async function POST(request: Request) {
  let body: { question?: unknown; ledger?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!question) return Response.json({ error: 'Ask a financial question.' }, { status: 400 });

  const ledger = cleanLedger(body.ledger);
  const context = buildFinancialContext(ledger.length ? ledger : seededTransactions);
  const fallback = fallbackAnswer(question, context);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({ answer: fallback, source: 'demo', reason: 'OPENAI_API_KEY is not configured.' });
  }

  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-sol',
        store: false,
        max_output_tokens: 450,
        instructions: [
          'You are Fin, the explainable financial copilot inside the FinPulse hackathon prototype.',
          'Use only the supplied simulated financial context. Never invent balances, transactions, or market facts.',
          'Application code has already calculated all metrics. Explain them; do not silently recalculate or replace them.',
          'Reference exact metrics or transactions as evidence. State material assumptions.',
          'Keep the answer under 170 words and use plain language.',
          'Do not present educational estimates as professional financial, credit, fraud, investment, or tax advice.',
        ].join(' '),
        input: `Financial context:\n${JSON.stringify(context)}\n\nUser question: ${question}`,
      }),
    });

    if (!apiResponse.ok) throw new Error(`OpenAI request failed with ${apiResponse.status}`);
    const payload: unknown = await apiResponse.json();
    const answer = outputText(payload);
    if (!answer) throw new Error('OpenAI returned no text.');

    return Response.json({ answer, source: 'openai' });
  } catch (error) {
    console.error('FinPulse AI fallback:', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ answer: fallback, source: 'demo', reason: 'AI service unavailable; deterministic fallback used.' });
  }
}
