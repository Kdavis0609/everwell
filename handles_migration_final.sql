-- Add profile handles system - Final version
-- This migration adds unique, human-readable handles for all users

-- First, let's check what columns actually exist in the profiles table
DO $$
DECLARE
    col_record RECORD;
    has_id BOOLEAN := FALSE;
    has_email BOOLEAN := FALSE;
    has_handle BOOLEAN := FALSE;
    primary_key_col TEXT;
BEGIN
    -- Check what columns exist
    FOR col_record IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    LOOP
        IF col_record.column_name = 'id' THEN
            has_id := TRUE;
        ELSIF col_record.column_name = 'email' THEN
            has_email := TRUE;
        ELSIF col_record.column_name = 'handle' THEN
            has_handle := TRUE;
        END IF;
    END LOOP;

    -- Find the primary key column
    SELECT column_name INTO primary_key_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'profiles' 
    AND tc.constraint_type = 'PRIMARY KEY'
    LIMIT 1;

    RAISE NOTICE 'Profile table structure: has_id=%, has_email=%, has_handle=%, primary_key=%', 
        has_id, has_email, has_handle, primary_key_col;

    -- Add handle column if it doesn't exist
    IF NOT has_handle THEN
        ALTER TABLE public.profiles ADD COLUMN handle text;
        RAISE NOTICE 'Added handle column to profiles table';
    ELSE
        RAISE NOTICE 'Handle column already exists';
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
  has_email BOOLEAN;
BEGIN
  -- Check if email column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) INTO has_email;

  IF new.handle IS NULL OR new.handle = '' THEN
    -- Use email if available, otherwise use id
    IF has_email THEN
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

-- 6) RPC: update current user's handle (security definer; self-only) - FIXED VERSION
CREATE OR REPLACE FUNCTION public.update_my_handle(new_handle text)
RETURNS TABLE (id uuid, handle text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired text := left(public.slugify_handle(new_handle), 30);
  final   text;
  result_id uuid;
  result_handle text;
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

  -- Use explicit column references to avoid ambiguity
  UPDATE public.profiles
     SET handle = final
   WHERE id = auth.uid()
   RETURNING public.profiles.id, public.profiles.handle
    INTO result_id, result_handle;

  -- Set return values explicitly
  id := result_id;
  handle := result_handle;
  RETURN NEXT;
END
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.update_my_handle(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_my_handle(text) TO authenticated;

-- 7) Backfill any missing handles safely
DO $$
DECLARE
    has_email BOOLEAN;
    has_id BOOLEAN;
    primary_key_col TEXT;
BEGIN
    -- Check what columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) INTO has_email;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id'
    ) INTO has_id;

    -- Find the primary key column
    SELECT column_name INTO primary_key_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' 
    AND tc.table_name = 'profiles' 
    AND tc.constraint_type = 'PRIMARY KEY'
    LIMIT 1;

    RAISE NOTICE 'Backfilling handles: has_email=%, has_id=%, primary_key=%', has_email, has_id, primary_key_col;

    -- Update profiles that don't have handles
    IF has_email AND has_id THEN
        -- Use email and id columns
        EXECUTE format('
            UPDATE public.profiles
               SET handle = public.next_handle(coalesce(split_part(email,''@'',1), ''user-'' || substr(%I::text, 1, 8)))
             WHERE (handle IS NULL OR handle = '''')
        ', primary_key_col);
        RAISE NOTICE 'Backfilled handles using email and id columns';
    ELSIF has_id THEN
        -- Use only id column
        EXECUTE format('
            UPDATE public.profiles
               SET handle = public.next_handle(''user-'' || substr(%I::text, 1, 8))
             WHERE (handle IS NULL OR handle = '''')
        ', primary_key_col);
        RAISE NOTICE 'Backfilled handles using id column only';
    ELSE
        RAISE NOTICE 'Cannot backfill handles: missing required columns';
    END IF;
END $$;
