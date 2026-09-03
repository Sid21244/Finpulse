alter table public.accounts enable row level security;
alter table public.import_batches enable row level security;
alter table public.transactions enable row level security;
alter table public.liability_details enable row level security;
alter table public.investment_holdings enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.credit_snapshots enable row level security;
alter table public.insights enable row level security;
alter table public.fraud_signals enable row level security;
alter table public.financial_documents enable row level security;
alter table public.tax_summaries enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.voice_entries enable row level security;
alter table public.user_preferences enable row level security;

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.import_batches to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.liability_details to authenticated;
grant select, insert, update, delete on public.investment_holdings to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goal_contributions to authenticated;
grant select, insert, update, delete on public.credit_snapshots to authenticated;
grant select, insert, update, delete on public.insights to authenticated;
grant select, insert, update, delete on public.fraud_signals to authenticated;
grant select, insert, update, delete on public.financial_documents to authenticated;
grant select, insert, update, delete on public.tax_summaries to authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.voice_entries to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

create policy "accounts_owner_all" on public.accounts for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "imports_owner_all" on public.import_batches for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_owner_all" on public.transactions for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and
  (account_id is null or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))) and
  (import_batch_id is null or exists (select 1 from public.import_batches b where b.id = import_batch_id and b.user_id = (select auth.uid())))
);
create policy "liabilities_owner_all" on public.liability_details for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
);
create policy "holdings_owner_all" on public.investment_holdings for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
);
create policy "goals_owner_all" on public.goals for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goal_contributions_owner_all" on public.goal_contributions for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
);
create policy "credit_owner_all" on public.credit_snapshots for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "insights_owner_all" on public.insights for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "fraud_owner_all" on public.fraud_signals for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and
  (transaction_id is null or exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())))
);
create policy "documents_owner_all" on public.financial_documents for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tax_owner_all" on public.tax_summaries for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "conversations_owner_all" on public.ai_conversations for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "messages_owner_all" on public.ai_messages for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
);
create policy "voice_owner_all" on public.voice_entries for all to authenticated
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and
  (transaction_id is null or exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())))
);
create policy "preferences_owner_all" on public.user_preferences for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-documents',
  'financial-documents',
  false,
  10485760,
  array['text/csv', 'text/plain', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "financial_documents_select_own" on storage.objects for select to authenticated
using (bucket_id = 'financial-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "financial_documents_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'financial-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "financial_documents_update_own" on storage.objects for update to authenticated
using (bucket_id = 'financial-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'financial-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "financial_documents_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'financial-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.detect_transaction_risk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_count integer;
  historical_average numeric;
begin
  if new.amount >= 0 or new.status <> 'posted' then
    return new;
  end if;

  select count(*) into previous_count
  from public.transactions t
  where t.user_id = new.user_id
    and t.id <> new.id
    and lower(t.merchant) = lower(new.merchant)
    and abs(t.amount) = abs(new.amount)
    and t.occurred_at between new.occurred_at - interval '10 minutes' and new.occurred_at + interval '10 minutes';

  if previous_count > 0 then
    insert into public.fraud_signals (user_id, transaction_id, rule_key, risk_level, title, detail, score)
    values (new.user_id, new.id, 'possible_duplicate', 'medium', 'Possible duplicate charge',
      'A payment with the same merchant and amount occurred within 10 minutes.', 72)
    on conflict (transaction_id, rule_key) do nothing;
  end if;

  if extract(hour from new.occurred_at at time zone 'Asia/Kolkata') between 0 and 4 and abs(new.amount) >= 5000 then
    insert into public.fraud_signals (user_id, transaction_id, rule_key, risk_level, title, detail, score)
    values (new.user_id, new.id, 'late_night_high_value', 'high', 'Unusual late-night payment',
      'A high-value payment was recorded between midnight and 5 AM.', 86)
    on conflict (transaction_id, rule_key) do nothing;
  end if;

  select avg(abs(t.amount)) into historical_average
  from public.transactions t
  where t.user_id = new.user_id and t.amount < 0 and t.status = 'posted'
    and t.id <> new.id and t.occurred_at >= new.occurred_at - interval '30 days';

  if historical_average is not null and abs(new.amount) >= greatest(2500, historical_average * 3) then
    insert into public.fraud_signals (user_id, transaction_id, rule_key, risk_level, title, detail, score)
    values (new.user_id, new.id, 'spend_outlier', 'medium', 'Spending amount is above normal',
      'This amount is at least three times the recent transaction average.', 67)
    on conflict (transaction_id, rule_key) do nothing;
  end if;

  return new;
end;
$$;

create trigger transactions_detect_risk
after insert on public.transactions
for each row execute function public.detect_transaction_risk();

revoke execute on function public.detect_transaction_risk() from public, anon, authenticated;

create or replace function public.get_dashboard_snapshot(p_month date default date_trunc('month', current_date)::date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with bounds as (
  select date_trunc('month', p_month)::timestamptz as month_start,
         (date_trunc('month', p_month) + interval '1 month')::timestamptz as month_end
),
monthly as (
  select
    coalesce(sum(t.amount) filter (where t.amount > 0), 0) as income,
    coalesce(abs(sum(t.amount) filter (where t.amount < 0)), 0) as expenses
  from public.transactions t, bounds b
  where t.user_id = (select auth.uid()) and t.status = 'posted'
    and t.occurred_at >= b.month_start and t.occurred_at < b.month_end
),
previous_monthly as (
  select coalesce(abs(sum(t.amount) filter (where t.amount < 0)), 0) as expenses
  from public.transactions t, bounds b
  where t.user_id = (select auth.uid()) and t.status = 'posted'
    and t.occurred_at >= b.month_start - interval '1 month' and t.occurred_at < b.month_start
),
balances as (
  select
    coalesce(sum(a.current_balance) filter (where a.account_type in ('bank','upi','cash')), 0) as liquid_balance,
    coalesce(sum(greatest(a.current_balance, 0)), 0) as assets,
    coalesce(abs(sum(least(a.current_balance, 0))), 0) as liabilities
  from public.accounts a
  where a.user_id = (select auth.uid()) and a.status = 'active'
),
debt as (
  select coalesce(sum(l.monthly_payment), 0) as monthly_payment
  from public.liability_details l where l.user_id = (select auth.uid())
),
credit as (
  select c.score, c.utilisation_percent
  from public.credit_snapshots c where c.user_id = (select auth.uid())
  order by c.captured_at desc limit 1
),
prefs as (
  select coalesce((select emergency_target_months from public.user_preferences where user_id = (select auth.uid())), 6) as emergency_target
),
emergency as (
  select coalesce(sum(g.current_amount) filter (where g.goal_type = 'emergency_fund' and g.status = 'active'), 0) as amount
  from public.goals g where g.user_id = (select auth.uid())
),
category_spend as (
  select t.category, abs(sum(t.amount)) as amount
  from public.transactions t, bounds b
  where t.user_id = (select auth.uid()) and t.amount < 0 and t.status = 'posted'
    and t.occurred_at >= b.month_start and t.occurred_at < b.month_end
  group by t.category
),
cashflow as (
  select date_trunc('month', t.occurred_at) as month,
    coalesce(sum(t.amount) filter (where t.amount > 0), 0) as income,
    coalesce(abs(sum(t.amount) filter (where t.amount < 0)), 0) as expenses
  from public.transactions t, bounds b
  where t.user_id = (select auth.uid()) and t.status = 'posted'
    and t.occurred_at >= b.month_start - interval '11 months' and t.occurred_at < b.month_end
  group by date_trunc('month', t.occurred_at)
  order by month
),
metrics as (
  select m.income, m.expenses, pm.expenses as previous_expenses,
    b.liquid_balance, b.assets, b.liabilities,
    case when m.income > 0 then round((d.monthly_payment / m.income * 100)::numeric, 1) else 0 end as dti,
    case when m.income > 0 then round(((m.income - m.expenses) / m.income * 100)::numeric, 1) else 0 end as savings_rate,
    case when m.expenses > 0 then round((e.amount / m.expenses)::numeric, 1) else 0 end as emergency_months,
    p.emergency_target, coalesce(c.score, 0) as credit_score, coalesce(c.utilisation_percent, 0) as utilisation
  from monthly m cross join previous_monthly pm cross join balances b cross join debt d
    cross join emergency e cross join prefs p left join credit c on true
)
select jsonb_build_object(
  'kpi', jsonb_build_object(
    'totalBalance', liquid_balance,
    'netWorth', assets - liabilities,
    'monthlyIncome', income,
    'monthlySpending', expenses,
    'spendingDelta', case when previous_expenses > 0 then round(((expenses - previous_expenses) / previous_expenses * 100)::numeric, 1) else 0 end,
    'creditScore', credit_score,
    'creditLabel', case when credit_score >= 750 then 'Excellent' when credit_score >= 700 then 'Good' when credit_score >= 650 then 'Fair' else 'Needs attention' end,
    'creditUtilisation', utilisation,
    'emergencyMonths', emergency_months,
    'emergencyTarget', emergency_target,
    'dti', dti,
    'savingsRate', savings_rate,
    'healthScore', least(100, greatest(0, round((least(savings_rate, 30) / 30 * 30 + greatest(0, 30 - dti) / 30 * 25 + least(emergency_months, emergency_target) / emergency_target * 25 + greatest(0, credit_score - 300)::numeric / 600 * 20)::numeric)))
  ),
  'categories', coalesce((select jsonb_agg(jsonb_build_object('name', category, 'amount', amount, 'pct', case when (select expenses from monthly) > 0 then round(amount / (select expenses from monthly) * 100, 1) else 0 end) order by amount desc) from category_spend), '[]'::jsonb),
  'cashflow', coalesce((select jsonb_agg(jsonb_build_object('month', to_char(month, 'Mon'), 'income', income, 'expenses', expenses) order by month) from cashflow), '[]'::jsonb),
  'generatedAt', now()
)
from metrics;
$$;

grant execute on function public.get_dashboard_snapshot(date) to authenticated;
