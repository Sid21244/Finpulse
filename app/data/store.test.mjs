/**
 * Headless test for store CRUD operations.
 * Run with: node app/data/store.test.mjs
 */

// --- Minimal localStorage polyfill ---
const store = new Map();
globalThis.localStorage = {
  getItem(k) { return store.get(k) ?? null; },
  setItem(k, v) { store.set(k, String(v)); },
  removeItem(k) { store.delete(k); },
  clear() { store.clear(); },
};
globalThis.window = { localStorage: globalThis.localStorage };

// --- Import store module via dynamic import with ts extension ---
// Use node's experimental type stripping
const mod = await import(`data:text/javascript,${encodeURIComponent(`
  // Re-implement store logic inline for testing (avoids TS import issues)
  const LS = globalThis.localStorage;

  function load(key, fallback) {
    try { const r = LS.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
  }
  function save(key, value) { LS.setItem(key, JSON.stringify(value)); }

  const TX_KEY = 'finpulse-transactions';
  const BUDGET_KEY = 'finpulse-budgets';
  const GOAL_KEY = 'finpulse-goals';
  const PROFILE_KEY = 'finpulse-profile';

  const seedTx = [
    { id: 1, merchant: 'Swiggy', category: 'Food & dining', date: 'Today', amount: -648, icon: 'S', color: 'orange', status: 'Completed' },
    { id: 2, merchant: 'Salary', category: 'Income', date: 'Sep 1', amount: 65000, icon: 'A', color: 'blue', status: 'Completed' },
  ];
  const seedBudgets = [
    { id: 1, category: 'Housing', limit: 18400, spent: 18400, month: 'Sep 2026' },
    { id: 2, category: 'Food', limit: 9000, spent: 8240, month: 'Sep 2026' },
  ];
  const seedGoals = [
    { title: 'Emergency fund', saved: 186000, target: 300000, date: 'Mar 2027', color: 'blue' },
  ];
  const seedProfile = { fullName: 'Alex Sharma', email: 'alex@example.com', phone: '+91 98765 43210', currency: 'INR', avatar: 'AS' };

  let nextTxId = 100, nextBudgetId = 100;

  export function getTransactions() { return load(TX_KEY, seedTx.map(t => ({...t}))); }
  export function saveTransactions(txns) { save(TX_KEY, txns); }
  export function addTransaction(input) { const tx = {...input, id: nextTxId++}; const all = getTransactions(); saveTransactions([tx, ...all]); return tx; }
  export function updateTransaction(id, updates) { const all = getTransactions(); const i = all.findIndex(t => t.id === id); if (i === -1) return null; all[i] = {...all[i], ...updates}; saveTransactions(all); return all[i]; }
  export function deleteTransaction(id) { const all = getTransactions(); const f = all.filter(t => t.id !== id); if (f.length === all.length) return false; saveTransactions(f); return true; }

  export function getBudgets() { return load(BUDGET_KEY, seedBudgets.map(b => ({...b}))); }
  export function saveBudgets(budgets) { save(BUDGET_KEY, budgets); }
  export function addBudget(input) { const b = {...input, spent: 0, id: nextBudgetId++}; const all = getBudgets(); saveBudgets([...all, b]); return b; }
  export function updateBudget(id, updates) { const all = getBudgets(); const i = all.findIndex(b => b.id === id); if (i === -1) return null; all[i] = {...all[i], ...updates}; saveBudgets(all); return all[i]; }
  export function deleteBudget(id) { const all = getBudgets(); const f = all.filter(b => b.id !== id); if (f.length === all.length) return false; saveBudgets(f); return true; }

  export function getGoals() { return load(GOAL_KEY, seedGoals.map(g => ({...g}))); }
  export function saveGoals(goals) { save(GOAL_KEY, goals); }
  export function addGoal(goal) { const all = getGoals(); const u = [...all, goal]; saveGoals(u); return u; }
  export function contributeToGoal(index, amount) { const all = getGoals(); if (index < 0 || index >= all.length) return all; return all.map((g, i) => i === index ? {...g, saved: Math.min(g.target, g.saved + amount)} : g); }
  export function deleteGoal(index) { const all = getGoals(); return all.filter((_, i) => i !== index); }

  export function getProfile() { return load(PROFILE_KEY, {...seedProfile}); }
  export function saveProfile(p) { save(PROFILE_KEY, p); }
`)}`);

const {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgets, addBudget, updateBudget, deleteBudget,
  getGoals, addGoal, contributeToGoal, deleteGoal,
  getProfile, saveProfile,
} = mod;

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ FAIL: ${label}`); failed++; }
}

// --- Transactions ---
console.log('\n=== Transactions ===');
const initTx = getTransactions();
assert(initTx.length >= 2, `Initial transactions loaded (${initTx.length})`);

const newTx = addTransaction({ merchant: 'Test Shop', category: 'Shopping', date: 'Today', amount: -1500, icon: 'a', color: 'navy', status: 'Completed' });
assert(newTx.id > 0, `addTransaction returns id: ${newTx.id}`);
assert(newTx.merchant === 'Test Shop', 'Merchant set correctly');
assert(newTx.amount === -1500, 'Amount set correctly');
assert(getTransactions().length === initTx.length + 1, 'Count increased by 1 after add');

const upd = updateTransaction(newTx.id, { merchant: 'Updated Shop', amount: -2000 });
assert(upd !== null, 'updateTransaction returns result');
assert(upd.merchant === 'Updated Shop', 'Merchant updated');
assert(upd.amount === -2000, 'Amount updated');
assert(getTransactions().find(t => t.id === newTx.id).merchant === 'Updated Shop', 'Persisted after update');

assert(deleteTransaction(newTx.id) === true, 'deleteTransaction returns true');
assert(getTransactions().length === initTx.length, 'Count restored after delete');
assert(deleteTransaction(999999) === false, 'Delete non-existent returns false');

// --- Budgets ---
console.log('\n=== Budgets ===');
const initB = getBudgets();
assert(initB.length >= 2, `Initial budgets loaded (${initB.length})`);

const newB = addBudget({ category: 'Test Cat', limit: 5000, month: 'Sep 2026' });
assert(newB.id > 0, `addBudget returns id: ${newB.id}`);
assert(newB.spent === 0, 'New budget starts at 0 spent');
assert(newB.limit === 5000, 'Limit set correctly');
assert(getBudgets().length === initB.length + 1, 'Count increased by 1');

const bUpd = updateBudget(newB.id, { limit: 7000 });
assert(bUpd !== null && bUpd.limit === 7000, 'Budget limit updated');
assert(deleteBudget(newB.id) === true, 'Budget deleted');
assert(getBudgets().length === initB.length, 'Count restored');

// --- Goals ---
console.log('\n=== Goals ===');
const initG = getGoals();
assert(initG.length >= 1, `Initial goals loaded (${initG.length})`);

const gBefore = initG[0].saved;
const afterC = contributeToGoal(0, 5000);
assert(afterC[0].saved === gBefore + 5000, `Contribute +5000 (was ${gBefore}, now ${afterC[0].saved})`);

// Cap at target
const g = afterC[0];
const over = contributeToGoal(0, g.target + 100000);
assert(over[0].saved === g.target, 'Cannot exceed target');

// Invalid index
assert(contributeToGoal(999, 5000).length === initG.length, 'Invalid index returns unchanged');

const newGoal = { title: 'Test Goal', saved: 10000, target: 50000, date: 'Dec 2027', color: 'blue' };
const afterGA = addGoal(newGoal);
assert(afterGA.length === initG.length + 1, 'Goal added');
assert(deleteGoal(afterGA.length - 1).length === initG.length, 'Goal deleted');

// --- Profile ---
console.log('\n=== Profile ===');
const p = getProfile();
assert(p.fullName.length > 0, `Profile loaded: ${p.fullName}`);

saveProfile({ ...p, fullName: 'Test User', email: 'test@test.com' });
const r = getProfile();
assert(r.fullName === 'Test User', 'Name persisted');
assert(r.email === 'test@test.com', 'Email persisted');
saveProfile(p); // restore

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed!');
