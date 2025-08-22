-- Migration: Add insights usage tracking and caching
-- Date: 2025-01-04
-- Description: Track per-user daily usage and cache insights to avoid repeat LLM calls

-- 1) Track per-user daily usage (how many insights generated today)
create table if not exists public.insights_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (current_date at time zone 'utc'),
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 2) Cache last generated insights to avoid repeat LLM calls (optional but saves $$)
create table if not exists public.insights_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_date date not null,
  payload_hash text not null, -- hash of the metrics JSON used for insights
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, cache_date, payload_hash)
);

-- Allow authenticated users to read their own usage + cache
alter table public.insights_usage enable row level security;
alter table public.insights_cache enable row level security;

create policy "read own usage"
on public.insights_usage for select
to authenticated
using (user_id = auth.uid());

create policy "read own cache"
on public.insights_cache for select
to authenticated
using (user_id = auth.uid());

-- We will write/modify from the server with the service role key (no public writes).
-- (So: no insert/update policies for normal users here.)

-- Create indexes for better performance
create index if not exists idx_insights_usage_user_day on public.insights_usage(user_id, day);
create index if not exists idx_insights_cache_user_date on public.insights_cache(user_id, cache_date);
create index if not exists idx_insights_cache_hash on public.insights_cache(payload_hash);

-- Function to increment usage count
create or replace function increment_insights_usage(user_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.insights_usage (user_id, day, count)
  values (user_uuid, current_date at time zone 'utc', 1)
  on conflict (user_id, day)
  do update set 
    count = insights_usage.count + 1,
    updated_at = now();
end;
$$;

-- Function to get today's usage count
create or replace function get_today_insights_usage(user_uuid uuid)
returns integer
language plpgsql
security definer
as $$
declare
  usage_count integer;
begin
  select count into usage_count
  from public.insights_usage
  where user_id = user_uuid 
    and day = current_date at time zone 'utc';
  
  return coalesce(usage_count, 0);
end;
$$;

-- Function to check if user has exceeded daily limit (default: 10)
create or replace function has_exceeded_daily_limit(user_uuid uuid, daily_limit integer default 10)
returns boolean
language plpgsql
security definer
as $$
begin
  return get_today_insights_usage(user_uuid) >= daily_limit;
end;
$$;
