-- Repair profiles for users created before the profile trigger/migrations existed.
insert into public.profiles (id, full_name, avatar_url)
select
  users.id,
  nullif(users.raw_user_meta_data ->> 'full_name', ''),
  nullif(users.raw_user_meta_data ->> 'avatar_url', '')
from auth.users as users
on conflict (id) do nothing;

grant insert on table public.profiles to authenticated;

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

-- UPSERT is required because a user can exist before the profile trigger is installed.
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
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  insert into public.profiles (
    id, full_name, monthly_income, current_savings, monthly_rent,
    existing_loans_emi, financial_goal, onboarding_completed, updated_at
  ) values (
    v_user_id, nullif(trim(p_full_name), ''), p_monthly_income, p_current_savings,
    p_monthly_rent, p_existing_loans_emi, p_financial_goal, true, now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    monthly_income = excluded.monthly_income,
    current_savings = excluded.current_savings,
    monthly_rent = excluded.monthly_rent,
    existing_loans_emi = excluded.existing_loans_emi,
    financial_goal = excluded.financial_goal,
    onboarding_completed = true,
    updated_at = now();
end;
$$;

revoke execute on function public.complete_onboarding(text, numeric, numeric, numeric, numeric, text) from public, anon;
grant execute on function public.complete_onboarding(text, numeric, numeric, numeric, numeric, text) to authenticated;
