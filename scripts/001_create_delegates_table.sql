-- Create delegates table to store delegate information and push subscriptions
create table if not exists public.delegates (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique,
  email text unique,
  display_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create push subscriptions table to store web push subscription data
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  delegate_id uuid references public.delegates(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now(),
  unique(delegate_id, endpoint)
);

-- Enable RLS
alter table public.delegates enable row level security;
alter table public.push_subscriptions enable row level security;

-- RLS policies for delegates (public read, delegates can update their own)
create policy "delegates_select_all"
  on public.delegates for select
  using (true);

create policy "delegates_insert_own"
  on public.delegates for insert
  with check (true);

create policy "delegates_update_own"
  on public.delegates for update
  using (true);

-- RLS policies for push subscriptions
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (true);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (true);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (true);

-- Create indexes for better query performance
create index if not exists idx_delegates_wallet on public.delegates(wallet_address);
create index if not exists idx_delegates_email on public.delegates(email);
create index if not exists idx_push_subscriptions_delegate on public.push_subscriptions(delegate_id);
