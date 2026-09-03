-- Onboarding fields on profiles
alter table public.profiles add column if not exists monthly_income numeric(16,2);
alter table public.profiles add column if not exists current_savings numeric(16,2);
alter table public.profiles add column if not exists monthly_rent numeric(16,2);
alter table public.profiles add column if not exists existing_loans_emi numeric(16,2);
alter table public.profiles add column if not exists financial_goal text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists monthly_budget_target numeric(16,2);

-- Monthly budgets table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  monthly_limit numeric(16,2) not null check (monthly_limit > 0),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create index budgets_user_month_idx on public.budgets (user_id, month);

alter table public.budgets enable row level security;

grant select, insert, update, delete on public.budgets to authenticated;

create policy "budgets_owner_all" on public.budgets for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create trigger budgets_set_updated_at before update on public.budgets
for each row execute function public.set_updated_at();

-- Onboarding complete helper
create or replace function public.complete_onboarding(
  p_full_name text,
  p_monthly_income numeric,
  p_current_savings numeric,
  p_monthly_rent numeric,
  p_existing_loans_emi numeric,
  p_financial_goal text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  update public.profiles
  set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
      monthly_income = p_monthly_income,
      current_savings = p_current_savings,
      monthly_rent = p_monthly_rent,
      existing_loans_emi = p_existing_loans_emi,
      financial_goal = p_financial_goal,
      onboarding_completed = true,
      updated_at = now()
  where id = v_user_id;
end;
$$;

grant execute on function public.complete_onboarding(text, numeric, numeric, numeric, numeric, text) to authenticated;

-- Budget query: spend per category in a given month
create or replace function public.get_budget_status(p_month text default to_char(current_date, 'YYYY-MM'))
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with spent as (
  select t.category, abs(sum(t.amount)) as amount
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.amount < 0 and t.status = 'posted'
    and to_char(t.occurred_at, 'YYYY-MM') = p_month
  group by t.category
),
budgeted as (
  select b.category, b.monthly_limit as limit_amount
  from public.budgets b
  where b.user_id = (select auth.uid()) and b.month = p_month
)
select coalesce((
  select jsonb_agg(jsonb_build_object(
    'category', coalesce(b.category, s.category),
    'limit', coalesce(b.limit_amount, 0),
    'spent', coalesce(s.amount, 0),
    'remaining', coalesce(b.limit_amount, 0) - coalesce(s.amount, 0),
    'pctUsed', case when b.limit_amount > 0 then round(coalesce(s.amount, 0) / b.limit_amount * 100, 1) else 0 end
  ) order by coalesce(s.amount, 0) desc)
  from budgeted b
  left join spent s on s.category = b.category
), '[]'::jsonb);
$$;

grant execute on function public.get_budget_status(text) to authenticated;

-- Update seed_demo_data to include budgets
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_bank uuid;
  v_upi uuid;
  v_cash uuid;
  v_card uuid;
  v_loan uuid;
  v_investment uuid;
  v_month timestamptz;
  v_index integer;
  v_budget_month text := to_char(current_date, 'YYYY-MM');
  v_prev_month text := to_char(current_date - interval '1 month', 'YYYY-MM');
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.accounts where user_id = v_user_id) then
    return jsonb_build_object('seeded', false, 'reason', 'Account data already exists');
  end if;

  -- Update profile with onboarding data
  update public.profiles
  set monthly_income = 65000,
      current_savings = 168000,
      monthly_rent = 18000,
      existing_loans_emi = 6500,
      financial_goal = 'Save more money',
      onboarding_completed = true,
      updated_at = now()
  where id = v_user_id;

  insert into public.accounts (user_id, name, account_type, institution, masked_identifier, current_balance, source, status, last_synced_at)
  values (v_user_id, 'HDFC Savings', 'bank', 'HDFC Bank', '••4821', 124380, 'demo', 'active', now()) returning id into v_bank;
  insert into public.accounts (user_id, name, account_type, institution, current_balance, source, status, last_synced_at)
  values (v_user_id, 'PhonePe UPI', 'upi', 'PhonePe', 18420, 'demo', 'active', now()) returning id into v_upi;
  insert into public.accounts (user_id, name, account_type, current_balance, source, status, last_synced_at)
  values (v_user_id, 'Cash wallet', 'cash', 5400, 'demo', 'active', now()) returning id into v_cash;
  insert into public.accounts (user_id, name, account_type, institution, masked_identifier, current_balance, credit_limit, source, status, last_synced_at)
  values (v_user_id, 'HDFC Millennia', 'credit_card', 'HDFC Bank', '••7724', -12340, 100000, 'demo', 'active', now()) returning id into v_card;
  insert into public.accounts (user_id, name, account_type, institution, current_balance, source, status, last_synced_at)
  values (v_user_id, 'Education loan', 'loan', 'HDFC Bank', -318000, 'demo', 'active', now()) returning id into v_loan;
  insert into public.accounts (user_id, name, account_type, institution, current_balance, source, status, last_synced_at)
  values (v_user_id, 'Mutual funds', 'investment', 'CAMS', 356660, 'demo', 'active', now()) returning id into v_investment;

  insert into public.liability_details (account_id, user_id, principal_outstanding, interest_rate, monthly_payment, next_payment_date, tenure_months_remaining)
  values (v_loan, v_user_id, 318000, 9.25, 11200, current_date + 12, 31);

  insert into public.investment_holdings (user_id, account_id, symbol, name, asset_class, units, average_cost, current_price, current_value, invested_value)
  values
    (v_user_id, v_investment, 'UTIN50', 'UTI Nifty 50 Index Fund', 'mutual_fund', 2018.421, 112.80, 124.70, 251680, 227709),
    (v_user_id, v_investment, 'PPFCF', 'Parag Parikh Flexi Cap Fund', 'mutual_fund', 1334.82, 69.10, 78.65, 104980, 92236);

  for v_index in 0..5 loop
    v_month := date_trunc('month', now()) - make_interval(months => v_index);
    insert into public.transactions (user_id, account_id, occurred_at, amount, merchant, category, channel, source, external_id)
    values
      (v_user_id, v_bank, v_month + interval '1 day 9 hours', 48000 + (5 - v_index) * 900, 'Salary Credit', 'Income', 'HDFC Bank', 'demo', 'salary-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_bank, v_month + interval '2 days 10 hours', -11500, 'Prestige Lakeside', 'Housing', 'NACH', 'demo', 'rent-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '3 days 8 hours', -3200, 'Swiggy Instamart', 'Food & Dining', 'UPI', 'demo', 'instamart-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '4 days 13 hours', -620, 'Zomato Order', 'Food & Dining', 'UPI', 'demo', 'zomato-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '5 days 18 hours', -1840, 'Reliance Smart', 'Food & Dining', 'Card', 'demo', 'reliance-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '6 days 20 hours', -649, 'Netflix', 'Entertainment', 'Card', 'demo', 'netflix-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '7 days 14 hours', -2140, 'BESCOM Electricity', 'Bills', 'UPI', 'demo', 'bescom-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '8 days 18 hours', -(3200 + (5 - v_index) * 130), 'Uber Rides', 'Transport', 'Card', 'demo', 'uber-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '9 days 10 hours', -1860, 'Indian Oil Fuel', 'Transport', 'Card', 'demo', 'fuel-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '10 days 16 hours', -890, 'Apollo Pharmacy', 'Healthcare', 'UPI', 'demo', 'apollo-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '11 days 12 hours', -428, 'Rapido Ride', 'Transport', 'Card', 'demo', 'rapido-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '12 days 20 hours', -(2500 + (5 - v_index) * 90), 'Amazon Shopping', 'Shopping', 'UPI', 'demo', 'amazon-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '13 days 19 hours', -1580, 'Flipkart Order', 'Shopping', 'Card', 'demo', 'flipkart-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_bank, v_month + interval '14 days 11 hours', -6500, 'Loan EMI', 'EMI', 'NACH', 'demo', 'emi-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '15 days 21 hours', -340, 'Jio Recharge', 'Bills', 'UPI', 'demo', 'jio-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '16 days 15 hours', -780, 'Dominos Pizza', 'Food & Dining', 'Card', 'demo', 'dominos-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '17 days 12 hours', -1200, 'DMart Grocery', 'Food & Dining', 'UPI', 'demo', 'dmart-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '18 days 18 hours', -2400, 'Lifestyle Store', 'Shopping', 'Card', 'demo', 'lifestyle-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_bank, v_month + interval '20 days 10 hours', -1800, 'Internet Bill', 'Bills', 'NACH', 'demo', 'internet-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '22 days 14 hours', -560, 'Reliance Fresh', 'Food & Dining', 'UPI', 'demo', 'reliancefresh-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '24 days 16 hours', -1950, 'Decathlon Sports', 'Shopping', 'Card', 'demo', 'decathlon-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '25 days 19 hours', -320, 'IRCTC Train', 'Travel', 'UPI', 'demo', 'irctc-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '27 days 20 hours', -480, 'BookMyShow', 'Entertainment', 'Card', 'demo', 'bms-' || to_char(v_month, 'YYYY-MM'));
  end loop;

  -- Recent transactions with risk signals
  insert into public.transactions (user_id, account_id, occurred_at, amount, merchant, category, channel, source, external_id)
  values
    (v_user_id, v_upi, now() - interval '2 days', -1840, 'Reliance Smart', 'Food & Dining', 'UPI', 'demo', 'recent-reliance'),
    (v_user_id, v_card, now() - interval '1 day', -428, 'Uber Ride', 'Transport', 'Card', 'demo', 'recent-uber'),
    (v_user_id, v_upi, now() - interval '15 hours', -620, 'Zomato Order', 'Food & Dining', 'UPI', 'demo', 'recent-zomato'),
    (v_user_id, v_card, date_trunc('day', now()) + interval '2 hours 14 minutes', -8450, 'DigiStore', 'Shopping', 'Card', 'demo', 'risk-late-night'),
    (v_user_id, v_card, now() - interval '4 hours', -1299, 'StreamPro', 'Entertainment', 'Card', 'demo', 'risk-duplicate-a'),
    (v_user_id, v_card, now() - interval '3 hours 57 minutes', -1299, 'StreamPro', 'Entertainment', 'Card', 'demo', 'risk-duplicate-b');

  insert into public.credit_snapshots (user_id, score, utilisation_percent, payment_history_percent, active_accounts, hard_enquiries, source, captured_at)
  values
    (v_user_id, 770, 23, 98, 4, 1, 'demo', now() - interval '30 days'),
    (v_user_id, 782, 18, 99, 4, 0, 'demo', now());

  insert into public.goals (user_id, name, goal_type, target_amount, current_amount, target_date, color)
  values
    (v_user_id, 'Emergency fund', 'emergency_fund', 210000, 168000, current_date + 120, '#34d399'),
    (v_user_id, 'Home down payment', 'home', 1200000, 312000, current_date + 550, '#22e0c9'),
    (v_user_id, 'Japan trip', 'travel', 180000, 76400, current_date + 180, '#8b7cf6'),
    (v_user_id, 'New MacBook', 'purchase', 165000, 98000, current_date + 90, '#38bdf8');

  insert into public.insights (user_id, insight_type, title, body, potential_monthly_saving, severity, evidence)
  values
    (v_user_id, 'spending', 'Food delivery is rising', 'Food delivery spending is above last month. Reducing three orders can preserve your savings rate.', 2150, 'opportunity', '["transactions","category-trend"]'),
    (v_user_id, 'subscription', 'Review recurring subscriptions', 'Two recurring entertainment charges deserve a usage review.', 1248, 'opportunity', '["transactions"]'),
    (v_user_id, 'runway', 'Emergency runway is below target', 'Redirect part of monthly surplus until the six-month buffer is reached.', null, 'warning', '["goals","monthly-spend"]'),
    (v_user_id, 'credit', 'Credit utilisation improved', 'Utilisation is below 20%, supporting the recent credit-score increase.', null, 'info', '["credit-snapshot"]');

  insert into public.tax_summaries (user_id, financial_year, taxable_income, deductions_found, estimated_tax, capital_gains, remaining_80c_capacity, assumptions)
  values (v_user_id, '2025-26', 684000, 132000, 28600, 18420, 58000, '["Old tax regime estimate","Documents require verification"]');

  -- Seed budgets for current and previous month
  insert into public.budgets (user_id, category, monthly_limit, month) values
    (v_user_id, 'Food & Dining', 8000, v_budget_month),
    (v_user_id, 'Food & Dining', 8000, v_prev_month),
    (v_user_id, 'Shopping', 5000, v_budget_month),
    (v_user_id, 'Shopping', 5000, v_prev_month),
    (v_user_id, 'Transport', 4000, v_budget_month),
    (v_user_id, 'Transport', 4000, v_prev_month),
    (v_user_id, 'Entertainment', 2000, v_budget_month),
    (v_user_id, 'Entertainment', 2000, v_prev_month),
    (v_user_id, 'Bills', 4000, v_budget_month),
    (v_user_id, 'Bills', 4000, v_prev_month),
    (v_user_id, 'Housing', 18000, v_budget_month),
    (v_user_id, 'Housing', 18000, v_prev_month),
    (v_user_id, 'Healthcare', 1500, v_budget_month),
    (v_user_id, 'Healthcare', 1500, v_prev_month),
    (v_user_id, 'Travel', 2000, v_budget_month),
    (v_user_id, 'Travel', 2000, v_prev_month);

  return jsonb_build_object('seeded', true, 'accounts', 6, 'months', 6);
end;
$$;

grant execute on function public.seed_demo_data() to authenticated;
