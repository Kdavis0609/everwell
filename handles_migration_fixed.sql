-- Add profile handles system - Fixed version
-- This migration adds unique, human-readable handles for all users

-- 1) Column + unique index (idempotent)
DO $$ 
BEGIN
    -- Add handle column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'handle'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN handle text;
    END IF;
END $$;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_key ON public.profiles (handle);

-- 2) Normalize/slugify to allowed charset (lowercase; a-z, 0-9, hyphen/underscore)
CREATE OR REPLACE FUNCTION public.slugify_handle(input text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT
    trim(both '-' from
      regexp_replace(
        lower(coalesce(input, '')),
        '[^a-z0-9_-]+', '-', 'g'
      )
    )
$$;

-- 3) Enforce length and uniqueness by suffixing -2, -3, ...
CREATE OR REPLACE FUNCTION public.next_handle(candidate text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base text := left(public.slugify_handle(candidate), 30);
  h    text;
  n    int  := 0;
BEGIN
  IF base IS NULL OR length(base) < 3 THEN
    base := 'user';
  END IF;

  h := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = h) LOOP
    n := n + 1;
    h := left(base || '-' || n::text, 30);
  END LOOP;

  RETURN h;
END
$$;

-- 4) BEFORE INSERT trigger to auto-assign handle on new profiles
CREATE OR REPLACE FUNCTION public.set_default_profile_handle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
BEGIN
  IF new.handle IS NULL OR new.handle = '' THEN
    -- Check if email column exists and use it, otherwise use id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'email'
    ) THEN
      candidate := coalesce(split_part(new.email, '@', 1), 'user-' || substr(new.id::text, 1, 8));
    ELSE
      candidate := 'user-' || substr(new.id::text, 1, 8);
    END IF;
    new.handle := public.next_handle(candidate);
  ELSE
    new.handle := public.next_handle(new.handle);
  END IF;

  -- enforce min length 3 even after slug
  IF length(new.handle) < 3 THEN
    new.handle := public.next_handle('user-' || substr(new.id::text, 1, 8));
  END IF;

  RETURN new;
END
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_set_default_profile_handle ON public.profiles;
CREATE TRIGGER trg_set_default_profile_handle
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_default_profile_handle();

-- 5) RPC: check availability (security definer; read-only)
CREATE OR REPLACE FUNCTION public.is_handle_available(candidate text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE handle = public.slugify_handle(candidate)
  );
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.is_handle_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_handle_available(text) TO anon, authenticated;

-- 6) RPC: update current user's handle (security definer; self-only)
CREATE OR REPLACE FUNCTION public.update_my_handle(new_handle text)
RETURNS TABLE (id uuid, handle text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired text := left(public.slugify_handle(new_handle), 30);
  final   text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF desired IS NULL OR length(desired) < 3 THEN
    RAISE EXCEPTION 'invalid_handle';
  END IF;

  -- If desired is taken by someone else, suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE handle = desired AND id <> auth.uid()) THEN
    final := public.next_handle(desired);
  ELSE
    final := desired;
  END IF;

  UPDATE public.profiles
     SET handle = final
   WHERE id = auth.uid()
   RETURNING public.profiles.id, public.profiles.handle
    INTO id, handle;

  RETURN NEXT;
END
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_my_handle(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_my_handle(text) TO authenticated;

-- 7) Backfill any missing handles safely (only if email column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    -- Update profiles that don't have handles
    UPDATE public.profiles p
       SET handle = public.next_handle(coalesce(split_part(email,'@',1), 'user-' || substr(p.id::text, 1, 8)))
     WHERE (handle IS NULL OR handle = '');
  ELSE
    -- Fallback if email column doesn't exist
    UPDATE public.profiles p
       SET handle = public.next_handle('user-' || substr(p.id::text, 1, 8))
     WHERE (handle IS NULL OR handle = '');
  END IF;
END $$;
