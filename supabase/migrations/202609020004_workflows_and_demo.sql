create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.create_expense(
  p_account_id uuid,
  p_amount numeric,
  p_merchant text,
  p_category text,
  p_occurred_at timestamptz,
  p_channel text default 'Manual',
  p_transcript text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Expense amount must be positive'; end if;
  if nullif(trim(p_merchant), '') is null then raise exception 'Merchant is required'; end if;
  if p_account_id is not null and not exists (
    select 1 from public.accounts where id = p_account_id and user_id = v_user_id and status = 'active'
  ) then raise exception 'Account not found'; end if;

  insert into public.transactions (
    user_id, account_id, occurred_at, amount, merchant, description, category, channel, source, metadata
  ) values (
    v_user_id, p_account_id, p_occurred_at, -abs(p_amount), trim(p_merchant), trim(p_merchant),
    coalesce(nullif(trim(p_category), ''), 'Other'), coalesce(nullif(trim(p_channel), ''), 'Manual'),
    case when p_transcript is null then 'manual' else 'voice' end,
    case when p_transcript is null then '{}'::jsonb else jsonb_build_object('voiceTranscript', p_transcript) end
  ) returning id into v_transaction_id;

  if p_transcript is not null then
    insert into public.voice_entries (user_id, transaction_id, transcript, parsed_payload, status, confirmed_at)
    values (
      v_user_id,
      v_transaction_id,
      left(p_transcript, 2000),
      jsonb_build_object('amount', p_amount, 'merchant', trim(p_merchant), 'category', p_category, 'accountId', p_account_id),
      'confirmed',
      now()
    );
  end if;

  return v_transaction_id;
end;
$$;

grant execute on function public.create_expense(uuid, numeric, text, text, timestamptz, text, text) to authenticated;

create or replace function public.add_cash_balance(p_name text, p_balance numeric)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_balance is null or p_balance < 0 then raise exception 'Cash balance cannot be negative'; end if;
  insert into public.accounts (user_id, name, account_type, current_balance, source, last_synced_at)
  values (v_user_id, coalesce(nullif(trim(p_name), ''), 'Cash wallet'), 'cash', p_balance, 'manual', now())
  returning id into v_account_id;
  return v_account_id;
end;
$$;

grant execute on function public.add_cash_balance(text, numeric) to authenticated;

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
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.accounts where user_id = v_user_id) then
    return jsonb_build_object('seeded', false, 'reason', 'Account data already exists');
  end if;

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
      (v_user_id, v_upi, v_month + interval '5 days 19 hours', -(5400 + (5 - v_index) * 210), 'Groceries & dining', 'Food & Dining', 'UPI', 'demo', 'food-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '9 days 18 hours', -(3200 + (5 - v_index) * 130), 'Transport & fuel', 'Transport', 'Card', 'demo', 'transport-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_upi, v_month + interval '14 days 12 hours', -2640, 'Utilities', 'Bills', 'UPI', 'demo', 'bills-' || to_char(v_month, 'YYYY-MM')),
      (v_user_id, v_card, v_month + interval '19 days 20 hours', -(2500 + (5 - v_index) * 90), 'Shopping', 'Shopping', 'Card', 'demo', 'shopping-' || to_char(v_month, 'YYYY-MM'));
  end loop;

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

  return jsonb_build_object('seeded', true, 'accounts', 6, 'months', 6);
end;
$$;

grant execute on function public.seed_demo_data() to authenticated;
