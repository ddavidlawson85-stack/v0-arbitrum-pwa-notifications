-- Create proposals table to store proposals from Discourse, Snapshot, and Tally
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  source text not null check (source in ('discourse', 'snapshot', 'tally')),
  title text not null,
  description text,
  author text,
  status text not null,
  voting_starts_at timestamp with time zone,
  voting_ends_at timestamp with time zone,
  for_votes numeric default 0,
  against_votes numeric default 0,
  quorum numeric,
  url text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(external_id, source)
);

-- Create notifications tracking table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade,
  delegate_id uuid references public.delegates(id) on delete cascade,
  sent_at timestamp with time zone default now(),
  unique(proposal_id, delegate_id)
);

-- Enable RLS
alter table public.proposals enable row level security;
alter table public.notifications enable row level security;

-- RLS policies for proposals (public read, system can write)
create policy "proposals_select_all"
  on public.proposals for select
  using (true);

create policy "proposals_insert_system"
  on public.proposals for insert
  with check (true);

create policy "proposals_update_system"
  on public.proposals for update
  using (true);

-- RLS policies for notifications
create policy "notifications_select_all"
  on public.notifications for select
  using (true);

create policy "notifications_insert_system"
  on public.notifications for insert
  with check (true);

-- Create indexes for better query performance
create index if not exists idx_proposals_source on public.proposals(source);
create index if not exists idx_proposals_status on public.proposals(status);
create index if not exists idx_proposals_external_id on public.proposals(external_id, source);
create index if not exists idx_proposals_created_at on public.proposals(created_at desc);
create index if not exists idx_notifications_proposal on public.notifications(proposal_id);
create index if not exists idx_notifications_delegate on public.notifications(delegate_id);
