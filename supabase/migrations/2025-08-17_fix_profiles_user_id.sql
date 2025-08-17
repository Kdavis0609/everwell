-- Fix profiles table to use user_id consistently
-- This migration ensures the profiles table uses user_id as the primary key

-- First, check if we need to rename the primary key column
do $$
begin
  -- If the table has 'id' as primary key, rename it to 'user_id'
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) then
    -- Rename id to user_id
    alter table public.profiles rename column id to user_id;
    
    -- Update the primary key constraint name
    alter table public.profiles drop constraint if exists profiles_pkey;
    alter table public.profiles add constraint profiles_pkey primary key (user_id);
    
    -- Update the foreign key constraint
    alter table public.profiles drop constraint if exists profiles_user_id_fkey;
    alter table public.profiles add constraint profiles_user_id_fkey 
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end$$;

-- Ensure user_id column exists and is the primary key
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) then
    -- Add user_id column if it doesn't exist
    alter table public.profiles add column user_id uuid;
    
    -- Copy data from id if it exists
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
    ) then
      update public.profiles set user_id = id where user_id is null;
      alter table public.profiles drop column id;
    end if;
    
    -- Make user_id the primary key
    alter table public.profiles drop constraint if exists profiles_pkey;
    alter table public.profiles add constraint profiles_pkey primary key (user_id);
    
    -- Add foreign key constraint
    alter table public.profiles add constraint profiles_user_id_fkey 
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end$$;

-- Ensure unique index on user_id for upsert operations
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

-- Update RLS policies to use user_id
drop policy if exists "Profiles select own" on public.profiles;
create policy "Profiles select own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Profiles insert self" on public.profiles;
create policy "Profiles insert self" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ensure all required columns exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email')
    then alter table public.profiles add column email text; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name')
    then alter table public.profiles add column full_name text; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_url')
    then alter table public.profiles add column avatar_url text; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='created_at')
    then alter table public.profiles add column created_at timestamptz default now(); end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at')
    then alter table public.profiles add column updated_at timestamptz default now(); end if;
end$$;
