create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  account_type text not null check (account_type in ('bank', 'upi', 'cash', 'credit_card', 'loan', 'investment')),
  institution text,
  masked_identifier text,
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  current_balance numeric(16,2) not null default 0,
  credit_limit numeric(16,2) check (credit_limit is null or credit_limit >= 0),
  source text not null default 'manual' check (source in ('manual', 'csv', 'sms', 'bank_sync', 'tax_document', 'voice', 'demo')),
  status text not null default 'active' check (status in ('active', 'disconnected', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_type_idx on public.accounts (user_id, account_type);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('bank_statement', 'sms', 'tax_document', 'manual', 'voice')),
  original_filename text,
  storage_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'needs_review')),
  row_count integer not null default 0 check (row_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index import_batches_user_created_idx on public.import_batches (user_id, created_at desc);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  external_id text,
  occurred_at timestamptz not null,
  amount numeric(16,2) not null check (amount <> 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  merchant text not null check (char_length(merchant) between 1 and 180),
  description text,
  category text not null default 'Other',
  channel text not null default 'Manual',
  source text not null default 'manual' check (source in ('manual', 'csv', 'sms', 'bank_sync', 'voice', 'demo')),
  status text not null default 'posted' check (status in ('pending', 'posted', 'reversed', 'excluded')),
  is_recurring boolean not null default false,
  needs_review boolean not null default false,
  raw_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc);
create index transactions_user_category_idx on public.transactions (user_id, category, occurred_at desc);
create index transactions_account_idx on public.transactions (account_id, occurred_at desc);
create unique index transactions_user_source_external_uidx
  on public.transactions (user_id, source, external_id)
  where external_id is not null;
create unique index transactions_user_raw_hash_uidx
  on public.transactions (user_id, raw_hash)
  where raw_hash is not null;

create table public.liability_details (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  principal_outstanding numeric(16,2) not null default 0 check (principal_outstanding >= 0),
  interest_rate numeric(7,4) check (interest_rate is null or interest_rate >= 0),
  monthly_payment numeric(16,2) not null default 0 check (monthly_payment >= 0),
  next_payment_date date,
  tenure_months_remaining integer check (tenure_months_remaining is null or tenure_months_remaining >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.investment_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  symbol text,
  name text not null,
  asset_class text not null check (asset_class in ('equity', 'mutual_fund', 'etf', 'bond', 'gold', 'fixed_deposit', 'crypto', 'other')),
  units numeric(22,8) not null default 0 check (units >= 0),
  average_cost numeric(16,4) check (average_cost is null or average_cost >= 0),
  current_price numeric(16,4) check (current_price is null or current_price >= 0),
  current_value numeric(16,2) not null default 0,
  invested_value numeric(16,2) not null default 0,
  as_of_date date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index holdings_user_account_idx on public.investment_holdings (user_id, account_id);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  goal_type text not null default 'other' check (goal_type in ('emergency_fund', 'home', 'travel', 'education', 'purchase', 'retirement', 'debt_payoff', 'other')),
  target_amount numeric(16,2) not null check (target_amount > 0),
  current_amount numeric(16,2) not null default 0 check (current_amount >= 0),
  target_date date,
  color text not null default '#22e0c9' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_status_idx on public.goals (user_id, status);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  amount numeric(16,2) not null check (amount > 0),
  contributed_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id, contributed_at desc);

create table public.credit_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null check (score between 300 and 900),
  utilisation_percent numeric(6,2) check (utilisation_percent between 0 and 100),
  payment_history_percent numeric(6,2) check (payment_history_percent between 0 and 100),
  active_accounts integer not null default 0 check (active_accounts >= 0),
  hard_enquiries integer not null default 0 check (hard_enquiries >= 0),
  captured_at timestamptz not null default now(),
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index credit_snapshots_user_captured_idx on public.credit_snapshots (user_id, captured_at desc);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  insight_type text not null check (insight_type in ('spending', 'subscription', 'runway', 'credit', 'debt', 'goal', 'tax', 'fraud', 'general')),
  title text not null,
  body text not null,
  potential_monthly_saving numeric(16,2),
  severity text not null default 'info' check (severity in ('info', 'opportunity', 'warning', 'critical')),
  evidence jsonb not null default '[]'::jsonb,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index insights_user_active_idx on public.insights (user_id, created_at desc) where dismissed_at is null;

create table public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete cascade,
  rule_key text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  title text not null,
  detail text not null,
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  status text not null default 'open' check (status in ('open', 'reviewed', 'confirmed_fraud', 'false_positive')),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  unique (transaction_id, rule_key)
);

create index fraud_signals_user_status_idx on public.fraud_signals (user_id, status, created_at desc);

create table public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  document_type text not null check (document_type in ('bank_statement', 'sms_export', 'form16', 'investment_proof', 'capital_gains', 'loan_statement', 'other')),
  financial_year text,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  processing_status text not null default 'uploaded' check (processing_status in ('uploaded', 'processing', 'processed', 'needs_review', 'failed')),
  extracted_data jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index financial_documents_user_created_idx on public.financial_documents (user_id, created_at desc);

create table public.tax_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  financial_year text not null,
  taxable_income numeric(16,2) not null default 0,
  deductions_found numeric(16,2) not null default 0,
  estimated_tax numeric(16,2) not null default 0,
  capital_gains numeric(16,2) not null default 0,
  remaining_80c_capacity numeric(16,2) not null default 150000,
  assumptions jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, financial_year)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'FinPulse conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  sources jsonb not null default '[]'::jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create table public.voice_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  transcript text not null check (char_length(transcript) between 1 and 2000),
  parsed_payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'discarded')),
  locale text not null default 'en-IN',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  base_currency text not null default 'INR' check (base_currency ~ '^[A-Z]{3}$'),
  emergency_target_months numeric(4,1) not null default 6 check (emergency_target_months between 1 and 24),
  timezone text not null default 'Asia/Kolkata',
  monthly_budget numeric(16,2),
  alert_preferences jsonb not null default '{"fraud":true,"credit":true,"budget":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_set_updated_at before update on public.accounts
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger liabilities_set_updated_at before update on public.liability_details
for each row execute function public.set_updated_at();
create trigger holdings_set_updated_at before update on public.investment_holdings
for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();
create trigger tax_summaries_set_updated_at before update on public.tax_summaries
for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.ai_conversations
for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_goal_contribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.goals set current_amount = current_amount + new.amount where id = new.goal_id and user_id = new.user_id;
  elsif tg_op = 'DELETE' then
    update public.goals set current_amount = greatest(0, current_amount - old.amount) where id = old.goal_id and user_id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger goal_contribution_totals
after insert or delete on public.goal_contributions
for each row execute function public.handle_goal_contribution();

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_goal_contribution() from public, anon, authenticated;
