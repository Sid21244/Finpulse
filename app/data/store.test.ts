/**
 * Headless test for store.ts CRUD operations.
 * Run with: node --import tsx app/data/store.test.ts
 *
 * Tests transactions, budgets, goals, and profile persistence.
 */

// Minimal localStorage polyfill for Node
const store = new Map<string, string>();
const localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => [...store.keys()][i] ?? null,
};
Reflect.set(globalThis, 'window', { localStorage });
Reflect.set(globalThis, 'localStorage', localStorage);

// Import after polyfill
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgets, addBudget, updateBudget, deleteBudget,
  getGoals, addGoal, contributeToGoal, deleteGoal,
  getProfile, saveProfile,
  type GoalItem, type ProfileData,
} from './store';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// --- Transactions ---
console.log('\n=== Transactions ===');
const initialTx = getTransactions();
assert(initialTx.length > 0, `Initial transactions loaded (${initialTx.length})`);

const newTx = addTransaction({
  merchant: 'Test Shop', category: 'Shopping', date: 'Today',
  amount: -1500, icon: 'a', color: 'navy', status: 'Completed',
});
assert(newTx.id > 0, `New transaction has id: ${newTx.id}`);
assert(newTx.merchant === 'Test Shop', 'Merchant matches');
assert(newTx.amount === -1500, 'Amount matches');

const afterAdd = getTransactions();
assert(afterAdd.length === initialTx.length + 1, `Transaction count increased by 1`);

const updated = updateTransaction(newTx.id, { merchant: 'Updated Shop', amount: -2000 });
assert(updated !== null, 'Update returned a result');
assert(updated!.merchant === 'Updated Shop', 'Merchant updated');
assert(updated!.amount === -2000, 'Amount updated');

const afterUpdate = getTransactions();
const found = afterUpdate.find((t) => t.id === newTx.id);
assert(found?.merchant === 'Updated Shop', 'Persisted update found');

const deleted = deleteTransaction(newTx.id);
assert(deleted === true, 'Delete returned true');
const afterDelete = getTransactions();
assert(afterDelete.length === initialTx.length, `Transaction count restored to ${initialTx.length}`);

const missingDelete = deleteTransaction(999999);
assert(missingDelete === false, 'Deleting non-existent returns false');

// --- Budgets ---
console.log('\n=== Budgets ===');
const initialBudgets = getBudgets();
assert(initialBudgets.length > 0, `Initial budgets loaded (${initialBudgets.length})`);

const newBudget = addBudget({ category: 'Test Category', limit: 5000, month: 'Sep 2026' });
assert(newBudget.id > 0, `New budget has id: ${newBudget.id}`);
assert(newBudget.spent === 0, 'New budget starts with 0 spent');
assert(newBudget.limit === 5000, 'Limit matches');

const afterBudgetAdd = getBudgets();
assert(afterBudgetAdd.length === initialBudgets.length + 1, 'Budget count increased by 1');

const budgetUpdated = updateBudget(newBudget.id, { limit: 7000 });
assert(budgetUpdated !== null, 'Budget update returned a result');
assert(budgetUpdated!.limit === 7000, 'Budget limit updated');

const budgetDeleted = deleteBudget(newBudget.id);
assert(budgetDeleted === true, 'Budget deleted');
const afterBudgetDelete = getBudgets();
assert(afterBudgetDelete.length === initialBudgets.length, 'Budget count restored');

// --- Goals ---
console.log('\n=== Goals ===');
const initialGoals = getGoals();
assert(initialGoals.length > 0, `Initial goals loaded (${initialGoals.length})`);

const goalBefore = initialGoals[0].saved;
const afterContribute = contributeToGoal(0, 5000);
assert(afterContribute[0].saved === goalBefore + 5000, `Goal saved amount increased by 5000 (was ${goalBefore}, now ${afterContribute[0].saved})`);

// Contribute beyond target
const goal = afterContribute[0];
const overshoot = contributeToGoal(0, goal.target + 100000);
assert(overshoot[0].saved === goal.target, 'Cannot exceed target amount');

// Contribute to invalid index
const noChange = contributeToGoal(999, 5000);
assert(noChange.length === initialGoals.length, 'Invalid index returns unchanged array');

const newGoal: GoalItem = { title: 'Test Goal', saved: 10000, target: 50000, date: 'Dec 2027', color: 'blue' };
const afterGoalAdd = addGoal(newGoal);
assert(afterGoalAdd.length === initialGoals.length + 1, 'Goal added');

const afterGoalDelete = deleteGoal(afterGoalAdd.length - 1);
assert(afterGoalDelete.length === initialGoals.length, 'Goal deleted');

// --- Profile ---
console.log('\n=== Profile ===');
const profile = getProfile();
assert(profile.fullName.length > 0, `Profile loaded: ${profile.fullName}`);

const newProfile: ProfileData = { ...profile, fullName: 'Test User', email: 'test@test.com' };
saveProfile(newProfile);
const reloaded = getProfile();
assert(reloaded.fullName === 'Test User', 'Profile name persisted');
assert(reloaded.email === 'test@test.com', 'Profile email persisted');

// Restore original
saveProfile(profile);

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('All tests passed!');
