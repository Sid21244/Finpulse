import { transactions as seedTransactions, spending as seedSpending, goals as seedGoals, debts as seedDebts, cashFlow as seedCashFlow } from './mockData';

export type TransactionItem = {
  id: number;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  icon: string;
  color: string;
  status: string;
};

export type BudgetItem = {
  id: number;
  category: string;
  limit: number;
  spent: number;
  month: string;
};

export type GoalItem = {
  title: string;
  saved: number;
  target: number;
  date: string;
  color: string;
};

export type ProfileData = {
  fullName: string;
  email: string;
  phone: string;
  currency: string;
  avatar: string;
};

const STORAGE_KEYS = {
  transactions: 'finpulse-transactions',
  budgets: 'finpulse-budgets',
  goals: 'finpulse-goals',
  profile: 'finpulse-profile',
} as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Transactions ---
let nextTxId = 100;

export function getTransactions(): TransactionItem[] {
  const stored = load<TransactionItem[] | null>(STORAGE_KEYS.transactions, null);
  if (stored && stored.length > 0) return stored;
  return seedTransactions.map((tx) => ({ ...tx }));
}

export function saveTransactions(txns: TransactionItem[]) {
  save(STORAGE_KEYS.transactions, txns);
}

export function addTransaction(input: Omit<TransactionItem, 'id'>): TransactionItem {
  const tx: TransactionItem = { ...input, id: nextTxId++ };
  const all = getTransactions();
  saveTransactions([tx, ...all]);
  return tx;
}

export function updateTransaction(id: number, updates: Partial<Omit<TransactionItem, 'id'>>): TransactionItem | null {
  const all = getTransactions();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveTransactions(all);
  return all[idx];
}

export function deleteTransaction(id: number): boolean {
  const all = getTransactions();
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length === all.length) return false;
  saveTransactions(filtered);
  return true;
}

// --- Budgets ---
let nextBudgetId = 100;

const defaultBudgets: BudgetItem[] = [
  { id: 1, category: 'Housing', limit: 18400, spent: 18400, month: 'Sep 2026' },
  { id: 2, category: 'Food & dining', limit: 9000, spent: 8240, month: 'Sep 2026' },
  { id: 3, category: 'Shopping', limit: 6000, spent: 5775, month: 'Sep 2026' },
  { id: 4, category: 'Transport', limit: 5000, spent: 4125, month: 'Sep 2026' },
  { id: 5, category: 'Entertainment', limit: 3000, spent: 1948, month: 'Sep 2026' },
  { id: 6, category: 'Groceries', limit: 4000, spent: 1234, month: 'Sep 2026' },
];

export function getBudgets(): BudgetItem[] {
  const stored = load<BudgetItem[] | null>(STORAGE_KEYS.budgets, null);
  if (stored && stored.length > 0) return stored;
  return [...defaultBudgets];
}

export function saveBudgets(budgets: BudgetItem[]) {
  save(STORAGE_KEYS.budgets, budgets);
}

export function addBudget(input: Omit<BudgetItem, 'id' | 'spent'>): BudgetItem {
  const b: BudgetItem = { ...input, spent: 0, id: nextBudgetId++ };
  const all = getBudgets();
  saveBudgets([...all, b]);
  return b;
}

export function updateBudget(id: number, updates: Partial<Omit<BudgetItem, 'id'>>): BudgetItem | null {
  const all = getBudgets();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  saveBudgets(all);
  return all[idx];
}

export function deleteBudget(id: number): boolean {
  const all = getBudgets();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length === all.length) return false;
  saveBudgets(filtered);
  return true;
}

// --- Goals ---
export function getGoals(): GoalItem[] {
  return load<GoalItem[]>(STORAGE_KEYS.goals, seedGoals.map((g) => ({ ...g })));
}

export function saveGoals(goals: GoalItem[]) {
  save(STORAGE_KEYS.goals, goals);
}

export function addGoal(goal: GoalItem): GoalItem[] {
  const all = getGoals();
  const updated = [...all, goal];
  saveGoals(updated);
  return updated;
}

export function contributeToGoal(index: number, amount: number): GoalItem[] {
  const all = getGoals();
  if (index < 0 || index >= all.length) return all;
  const updated = all.map((g, i) =>
    i === index ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
  );
  saveGoals(updated);
  return updated;
}

export function deleteGoal(index: number): GoalItem[] {
  const all = getGoals();
  const updated = all.filter((_, i) => i !== index);
  saveGoals(updated);
  return updated;
}

// --- Profile ---
const defaultProfile: ProfileData = {
  fullName: 'Alex Sharma',
  email: 'alex@example.com',
  phone: '+91 98765 43210',
  currency: 'INR',
  avatar: 'AS',
};

export function getProfile(): ProfileData {
  return load<ProfileData>(STORAGE_KEYS.profile, { ...defaultProfile });
}

export function saveProfile(profile: ProfileData) {
  save(STORAGE_KEYS.profile, profile);
}

// --- Static data re-exports (for API route compatibility) ---
export { seedTransactions, seedSpending, seedDebts, seedCashFlow };
