-- Create notification preferences table
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  delegate_id uuid references public.delegates(id) on delete cascade unique,
  notify_discourse boolean default true,
  notify_snapshot boolean default true,
  notify_tally boolean default true,
  notify_active_only boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.notification_preferences enable row level security;

-- RLS policies for notification preferences
create policy "notification_preferences_select_own"
  on public.notification_preferences for select
  using (true);

create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert
  with check (true);

create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  using (true);

-- Create index
create index if not exists idx_notification_preferences_delegate on public.notification_preferences(delegate_id);

-- Create function to auto-create notification preferences
create or replace function public.handle_new_delegate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (delegate_id)
  values (new.id)
  on conflict (delegate_id) do nothing;
  return new;
end;
$$;

-- Create trigger to auto-create notification preferences
drop trigger if exists on_delegate_created on public.delegates;

create trigger on_delegate_created
  after insert on public.delegates
  for each row
  execute function public.handle_new_delegate();
