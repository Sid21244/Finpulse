-- Ensure users created before these migrations also receive FinPulse records.
insert into public.profiles (id, full_name, avatar_url)
select
  user_record.id,
  nullif(user_record.raw_user_meta_data ->> 'full_name', ''),
  nullif(user_record.raw_user_meta_data ->> 'avatar_url', '')
from auth.users as user_record
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select user_record.id
from auth.users as user_record
on conflict (user_id) do nothing;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
