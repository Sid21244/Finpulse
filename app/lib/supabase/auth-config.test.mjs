import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Supabase browser sessions persist and use PKCE', async () => {
  const client = await source('app/lib/supabase/client.ts');
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /autoRefreshToken:\s*true/);
  assert.match(client, /flowType:\s*'pkce'/);
});

test('the dashboard checks both authentication and onboarding', async () => {
  const guard = await source('app/components/auth/AuthGuard.tsx');
  assert.match(guard, /auth\.getSession\(\)/);
  assert.match(guard, /from\('profiles'\)/);
  assert.match(guard, /onboarding_completed/);
  assert.match(guard, /router\.replace\('\/login'\)/);
  assert.match(guard, /router\.replace\('\/onboarding'\)/);
});

test('authentication supports password, recovery, and logout', async () => {
  const login = await source('app/components/auth/LoginScreen.tsx');
  const reset = await source('app/components/auth/ResetPasswordScreen.tsx');
  const guard = await source('app/components/auth/AuthGuard.tsx');
  assert.match(login, /signInWithPassword/);
  assert.match(login, /signUp/);
  assert.doesNotMatch(login, /signInWithOAuth|provider:\s*['"]google['"]/);
  assert.match(reset, /resetPasswordForEmail/);
  assert.match(reset, /updateUser/);
  assert.match(guard, /auth\.signOut\(\)/);
});

test('all financial tables use row-level security', async () => {
  const migration = await source('supabase/migrations/202609020003_security_and_metrics.sql');
  const protectedTables = [
    'accounts', 'import_batches', 'transactions', 'liability_details',
    'investment_holdings', 'goals', 'goal_contributions', 'credit_snapshots',
    'insights', 'fraud_signals', 'financial_documents', 'tax_summaries',
    'ai_conversations', 'ai_messages', 'voice_entries', 'user_preferences',
  ];
  for (const table of protectedTables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
});
