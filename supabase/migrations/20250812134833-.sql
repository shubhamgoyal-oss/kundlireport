-- Create table to capture front-end analytics events
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  page text,
  step int,
  puja_id int,
  puja_name text,
  metadata jsonb,
  session_id text,
  user_id uuid
);

-- Enable RLS for security
alter table public.analytics_events enable row level security;

-- Allow anonymous clients to insert events (no read access)
create policy "Allow inserts for anonymous analytics" on public.analytics_events
for insert
with check (true);

-- (Optional) Allow authenticated users to read only their events in future
-- create policy "Users can read their own events" on public.analytics_events
-- for select using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_metadata_gin_idx on public.analytics_events using gin (metadata);
