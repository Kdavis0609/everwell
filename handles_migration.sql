-- Add profile handles system - Run this in Supabase SQL Editor
-- This migration adds unique, human-readable handles for all users

-- 1) Column + unique index (idempotent)
alter table public.profiles
  add column if not exists handle text;

create unique index if not exists profiles_handle_key
  on public.profiles (handle);

-- 2) Normalize/slugify to allowed charset (lowercase; a-z, 0-9, hyphen/underscore)
create or replace function public.slugify_handle(input text)
returns text
language sql
stable
as $$
  select
    trim(both '-' from
      regexp_replace(
        lower(coalesce(input, '')),
        '[^a-z0-9_-]+', '-', 'g'
      )
    )
$$;

-- 3) Enforce length and uniqueness by suffixing -2, -3, ...
create or replace function public.next_handle(candidate text)
returns text
language plpgsql
stable
as $$
declare
  base text := left(public.slugify_handle(candidate), 30);
  h    text;
  n    int  := 0;
begin
  if base is null or length(base) < 3 then
    base := 'user';
  end if;

  h := base;
  while exists (select 1 from public.profiles where handle = h) loop
    n := n + 1;
    h := left(base || '-' || n::text, 30);
  end loop;

  return h;
end
$$;

-- 4) BEFORE INSERT trigger to auto-assign handle on new profiles
create or replace function public.set_default_profile_handle()
returns trigger
language plpgsql
as $$
declare
  candidate text;
begin
  if new.handle is null or new.handle = '' then
    candidate := coalesce(split_part(new.email, '@', 1), 'user-' || substr(new.id::text, 1, 8));
    new.handle := public.next_handle(candidate);
  else
    new.handle := public.next_handle(new.handle);
  end if;

  -- enforce min length 3 even after slug
  if length(new.handle) < 3 then
    new.handle := public.next_handle('user-' || substr(new.id::text, 1, 8));
  end if;

  return new;
end
$$;

drop trigger if exists trg_set_default_profile_handle on public.profiles;
create trigger trg_set_default_profile_handle
before insert on public.profiles
for each row execute function public.set_default_profile_handle();

-- 5) RPC: check availability (security definer; read-only)
create or replace function public.is_handle_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where handle = public.slugify_handle(candidate)
  );
$$;

revoke all on function public.is_handle_available(text) from public;
grant execute on function public.is_handle_available(text) to anon, authenticated;

-- 6) RPC: update current user's handle (security definer; self-only)
create or replace function public.update_my_handle(new_handle text)
returns table (id uuid, handle text)
language plpgsql
security definer
set search_path = public
as $$
declare
  desired text := left(public.slugify_handle(new_handle), 30);
  final   text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if desired is null or length(desired) < 3 then
    raise exception 'invalid_handle';
  end if;

  -- If desired is taken by someone else, suffix
  if exists (select 1 from public.profiles where handle = desired and id <> auth.uid()) then
    final := public.next_handle(desired);
  else
    final := desired;
  end if;

  update public.profiles
     set handle = final
   where id = auth.uid()
   returning public.profiles.id, public.profiles.handle
    into id, handle;

  return next;
end
$$;

revoke all on function public.update_my_handle(text) from public;
grant execute on function public.update_my_handle(text) to authenticated;

-- 7) Backfill any missing handles safely
update public.profiles p
   set handle = public.next_handle(coalesce(split_part(email,'@',1), 'user-' || substr(p.id::text, 1, 8)))
 where (handle is null or handle = '');
