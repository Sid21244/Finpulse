import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type LedgerDraft = { kind: 'expense' | 'income'; amount: number; merchant: string; category: string; occurredAt: string; transcript: string };
type MoneySummary = { income: number; spent: number; saved: number; savingsRate: number; liquidSavings: number };
type Notice = { id: string; level: 'warning' | 'critical' | 'success'; title: string; message: string };

const CATEGORY_RULES: Array<[string, RegExp]> = [
  ['Food & Dining', /food|lunch|dinner|breakfast|restaurant|swiggy|zomato|cafe|coffee|grocery|groceries|dmart/i],
  ['Transport', /uber|ola|rapido|taxi|cab|fuel|petrol|diesel|bus|train|metro|travel/i],
  ['Housing', /rent|housing|maintenance/i],
  ['Bills', /bill|electricity|water|internet|wifi|recharge|mobile|phone/i],
  ['Shopping', /amazon|flipkart|shopping|clothes|clothing/i],
  ['Healthcare', /medicine|medical|doctor|hospital|pharmacy|health/i],
  ['Entertainment', /movie|netflix|spotify|game|entertainment/i],
  ['EMI', /emi|loan payment/i],
];

function asNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function signedMoney(value: number) {
  return `${value < 0 ? '−' : ''}${money(value)}`;
}

function parseLedgerEntry(text: string): LedgerDraft | null {
  const expenseIntent = /\b(spent|paid|bought|expense|purchase|purchased|debit|debited)\b/i.test(text);
  const incomeIntent = /\b(credit|credited|received|earned|income|salary|deposit|deposited)\b/i.test(text);
  if (!expenseIntent && !incomeIntent) return null;
  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replaceAll(',', ''));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  const merchantMatch = text.match(/\b(?:on|at|for|from)\s+(.+?)(?=\s*(?:[,!?.]|$|\s+(?:today|yesterday|this morning|this evening|last night|\d{1,2}:\d{2}\s*(?:AM|PM)|[MTWTF]?[a-z]+day)))/i);
  const rawMerchant = merchantMatch?.[1]
    ?.replace(/\b(?:today|yesterday|this morning|this evening|last night)\b/gi, '').trim();
  const kind = incomeIntent && !expenseIntent ? 'income' : 'expense';
  const fallbackMerchant = text
    .replace(amountMatch[0], '')
    .replace(/\b(add|spent|paid|bought|expense|purchase|purchased|debit|debited|credit|credited|received|earned|income|deposit|deposited|rupees|rs|inr)\b/gi, '')
    .trim();
  return {
    kind,
    amount: Math.round(amount * 100) / 100,
    merchant: (rawMerchant || fallbackMerchant || (kind === 'income' ? 'Income' : 'Expense')).slice(0, 180),
    category: kind === 'income' ? 'Income' : CATEGORY_RULES.find(([, rule]) => rule.test(text))?.[0] || 'Other',
    occurredAt: new Date().toISOString(),
    transcript: text.slice(0, 500),
  };
}

function validateLedgerDraft(value: unknown): LedgerDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Partial<LedgerDraft>;
  const amount = asNumber(draft.amount);
  const occurredAt = typeof draft.occurredAt === 'string' ? new Date(draft.occurredAt) : new Date('invalid');
  if ((draft.kind !== 'expense' && draft.kind !== 'income') || amount <= 0 || amount > 10_000_000 || typeof draft.merchant !== 'string' || !draft.merchant.trim() ||
      typeof draft.category !== 'string' || !draft.category.trim() || Number.isNaN(occurredAt.getTime())) return null;
  return {
    kind: draft.kind,
    amount: Math.round(amount * 100) / 100,
    merchant: draft.merchant.trim().slice(0, 180),
    category: draft.category.trim().slice(0, 80),
    occurredAt: occurredAt.toISOString(),
    transcript: typeof draft.transcript === 'string' ? draft.transcript.slice(0, 500) : '',
  };
}

async function loadFinancialContext(supabase: SupabaseClient) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [profileResult, transactionResult, accountResult, budgetResult, fraudResult] = await Promise.all([
    supabase.from('profiles').select('full_name, monthly_income, current_savings, financial_goal').maybeSingle(),
    supabase.from('transactions').select('occurred_at, amount, merchant, category').eq('status', 'posted')
      .gte('occurred_at', monthStart.toISOString()).order('occurred_at', { ascending: false }).limit(1000),
    supabase.from('accounts').select('account_type, current_balance').eq('status', 'active'),
    supabase.rpc('get_budget_status', { p_month: monthStart.toISOString().slice(0, 7) }),
    supabase.from('fraud_signals').select('id, risk_level, title, detail').eq('status', 'open')
      .order('created_at', { ascending: false }).limit(5),
  ]);
  const firstError = [profileResult, transactionResult, accountResult, budgetResult, fraudResult]
    .find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const transactions = transactionResult.data || [];
  const accounts = accountResult.data || [];
  const profile = profileResult.data;
  const transactionIncome = transactions.reduce((sum, item) => sum + Math.max(0, asNumber(item.amount)), 0);
  const income = transactionIncome || asNumber(profile?.monthly_income);
  const spent = transactions.reduce((sum, item) => sum + Math.abs(Math.min(0, asNumber(item.amount))), 0);
  const saved = income - spent;
  const summary: MoneySummary = {
    income, spent, saved,
    savingsRate: income > 0 ? Math.round((saved / income) * 1000) / 10 : 0,
    liquidSavings: accounts.filter((account) => ['bank', 'upi', 'cash'].includes(account.account_type))
      .reduce((sum, account) => sum + asNumber(account.current_balance), 0) || asNumber(profile?.current_savings),
  };

  const notices: Notice[] = (fraudResult.data || []).map((signal) => ({
    id: `fraud-${signal.id}`, level: signal.risk_level === 'high' ? 'critical' : 'warning',
    title: signal.title, message: signal.detail,
  }));
  for (const budget of Array.isArray(budgetResult.data) ? budgetResult.data : []) {
    const record = budget as Record<string, unknown>;
    const pct = asNumber(record.pctUsed);
    if (pct >= 80) notices.push({
      id: `budget-${String(record.category)}`, level: pct >= 100 ? 'critical' : 'warning',
      title: `${String(record.category)} budget ${pct >= 100 ? 'exceeded' : 'almost used'}`,
      message: `${pct}% of this month's budget has been spent.`,
    });
  }
  if (saved < 0) notices.push({
    id: 'negative-cashflow', level: 'critical', title: 'Spending is above income',
    message: `You have spent ${money(Math.abs(saved))} more than your income this month.`,
  });
  if (!notices.length) notices.push({
    id: 'cashflow-status', level: 'success', title: 'Cash flow is positive',
    message: `You have saved ${money(saved)} so far this month.`,
  });
  return {
    profile: { name: profile?.full_name || 'FinPulse user', goal: profile?.financial_goal || null },
    summary, notices: notices.slice(0, 8),
    recentTransactions: transactions.slice(0, 10),
  };
}

function answerQuestion(question: string, context: Awaited<ReturnType<typeof loadFinancialContext>>) {
  const { income, spent, saved, savingsRate, liquidSavings } = context.summary;
  const lower = question.toLowerCase();
  if (/spend|expense/.test(lower)) return `You have spent ${money(spent)} this month. Your income is ${money(income)}, leaving ${signedMoney(saved)} after expenses.`;
  if (/save|saving/.test(lower)) return `Your net cash flow this month is ${signedMoney(saved)}, a ${savingsRate}% savings rate. Your current liquid savings are ${money(liquidSavings)}.`;
  if (/income|earn/.test(lower)) return `Your recorded income this month is ${money(income)}. You have spent ${money(spent)}, leaving ${signedMoney(saved)}.`;
  if (/alert|notification|fraud|budget/.test(lower)) return context.notices.map((notice) => `${notice.title}: ${notice.message}`).join(' ');
  return `This month: income ${money(income)}, spending ${money(spent)}, and net cash flow ${signedMoney(saved)} (${savingsRate}%). Ask about spending, savings, budgets, or alerts. You can also type “Spent 350 on lunch” to prepare an expense.`;
}

// Simple in-memory rate limiter (per user). Limit: 30 requests per minute.
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const requestCounts = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestCounts.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

const MAX_REQUEST_SIZE_BYTES = 32 * 1024; // 32KB

export async function POST(request: Request) {
  // Enforce request size limit to prevent abuse
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_SIZE_BYTES) {
    return Response.json({ error: 'Request body too large.' }, { status: 413 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return Response.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Sign in to use FinPulse AI.' }, { status: 401 });
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(authorization.slice(7));
  if (authError || !authData.user) return Response.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401 });

  // Rate limit per authenticated user
  if (!checkRateLimit(authData.user.id)) {
    return Response.json({ error: 'Too many requests. Please wait a moment and try again.' }, { status: 429 });
  }

  let body: { action?: unknown; question?: unknown; expense?: unknown; entry?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (body.action === 'confirm_expense' || body.action === 'confirm_entry') {
    const entry = validateLedgerDraft(body.entry ?? body.expense);
    if (!entry) return Response.json({ error: 'The transaction details are invalid.' }, { status: 400 });
    const writeResult = entry.kind === 'expense'
      ? await supabase.rpc('create_expense', {
          p_account_id: null, p_amount: entry.amount, p_merchant: entry.merchant, p_category: entry.category,
          p_occurred_at: entry.occurredAt, p_channel: 'FinPulse Voice', p_transcript: entry.transcript || null,
        })
      : await supabase.from('transactions').insert({
          user_id: authData.user.id, account_id: null, occurred_at: entry.occurredAt, amount: entry.amount,
          merchant: entry.merchant, description: entry.merchant, category: 'Income', channel: 'FinPulse Voice',
          source: entry.transcript ? 'voice' : 'manual', metadata: entry.transcript ? { voiceTranscript: entry.transcript } : {},
        }).select('id').single();
    if (writeResult.error) return Response.json({ error: `Transaction could not be saved: ${writeResult.error.message}` }, { status: 400 });
    const context = await loadFinancialContext(supabase);
    const transactionId = typeof writeResult.data === 'object' && writeResult.data && 'id' in writeResult.data ? writeResult.data.id : writeResult.data;
    return Response.json({ answer: `${money(entry.amount)} ${entry.kind === 'income' ? 'income from' : 'expense at'} ${entry.merchant} was saved.`, source: 'private-ledger', transactionId, savedEntry: entry, ...context });
  }

  let context: Awaited<ReturnType<typeof loadFinancialContext>>;
  try { context = await loadFinancialContext(supabase); }
  catch (error) {
    console.error('[FinPulse AI] Financial context error:', error instanceof Error ? error.message : String(error));
    return Response.json({ error: 'Your financial data could not be loaded. Check that Supabase migrations are applied.' }, { status: 500 });
  }
  if (body.action === 'summary') return Response.json({ answer: answerQuestion('summary', context), source: 'private-ledger', ...context });
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!question) return Response.json({ error: 'Ask a financial question.' }, { status: 400 });
  const entryDraft = parseLedgerEntry(question);
  if (entryDraft) return Response.json({
    answer: `I understood ${entryDraft.kind === 'income' ? 'income' : 'an expense'} of ${money(entryDraft.amount)} ${entryDraft.kind === 'income' ? 'from' : 'at'} ${entryDraft.merchant}. Confirm it before I add it to your ledger.`,
    source: 'private-ledger', expenseDraft: entryDraft, entryDraft, ...context,
  });
  return Response.json({ answer: answerQuestion(question, context), source: 'private-ledger', ...context });
}
