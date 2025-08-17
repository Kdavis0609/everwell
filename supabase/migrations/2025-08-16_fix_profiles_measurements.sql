-- Ensure profiles table has expected shape
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add missing columns if the table already exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    -- Try to upgrade a legacy column name to 'id'
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name in ('user_id','user_uuid')
    ) then
      execute 'alter table public.profiles rename column ' ||
              (select column_name from information_schema.columns
                 where table_schema = 'public' and table_name = 'profiles'
                   and column_name in ('user_id','user_uuid') limit 1) || ' to id';
    else
      execute 'alter table public.profiles add column id uuid';
    end if;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email')
    then execute 'alter table public.profiles add column email text'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name')
    then execute 'alter table public.profiles add column full_name text'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url')
    then execute 'alter table public.profiles add column avatar_url text'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='created_at')
    then execute 'alter table public.profiles add column created_at timestamptz default now()'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at')
    then execute 'alter table public.profiles add column updated_at timestamptz default now()'; end if;
end$$;

-- RLS + policies for profiles
alter table public.profiles enable row level security;

-- Safe: create policies if missing
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles select own') then
    create policy "Profiles select own" on public.profiles
      for select using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles insert self') then
    create policy "Profiles insert self" on public.profiles
      for insert with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Profiles update own') then
    create policy "Profiles update own" on public.profiles
      for update using (auth.uid() = id);
  end if;
end$$;

-- Measurements: add metric_slug and backfill from metrics.slug
alter table public.measurements
  add column if not exists metric_slug text;

-- Backfill existing rows using metrics table (if metric_id exists)
update public.measurements m
   set metric_slug = mt.slug
  from public.metrics mt
 where m.metric_slug is null
   and (m.metric_id = mt.id or m.metric_slug is null and mt.slug is not null);

create index if not exists measurements_metric_slug_idx on public.measurements(metric_slug);

-- A helper function for weekly progress that uses metric_slug
create or replace function public.get_weekly_progress(target_date date, user_uuid uuid)
returns table (
  day date,
  metric_slug text,
  value numeric
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(date_trunc('week', target_date)::date,
                           (date_trunc('week', target_date) + interval '6 day')::date,
                           interval '1 day')::date as day
  )
  select d.day,
         m.metric_slug,
         avg(m.value)::numeric as value
    from days d
    left join public.measurements m
      on m.user_uuid = user_uuid
     and m.metric_slug is not null
     and m.measured_on::date = d.day
  group by d.day, m.metric_slug
  order by d.day, m.metric_slug;
$$;

grant execute on function public.get_weekly_progress(date, uuid) to anon, authenticated;
