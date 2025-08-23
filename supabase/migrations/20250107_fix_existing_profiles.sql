-- Fix existing profiles that may have been created with older schema
-- This migration ensures all existing profiles have the correct structure

-- First, ensure the profiles table has the correct structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) THEN
    -- If 'id' column doesn't exist, try to rename from 'user_id' or 'user_uuid'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.profiles RENAME COLUMN user_id TO id;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_uuid'
    ) THEN
      ALTER TABLE public.profiles RENAME COLUMN user_uuid TO id;
    ELSE
      -- If no user ID column exists, add one
      ALTER TABLE public.profiles ADD COLUMN id UUID;
    END IF;
  END IF;

  -- Add other missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update existing profiles that have NULL id values
-- This happens when profiles were created before the user_id -> id migration
UPDATE public.profiles 
SET id = auth.users.id
FROM auth.users 
WHERE profiles.id IS NULL 
  AND profiles.email = auth.users.email;

-- Update profiles that have NULL email values
UPDATE public.profiles 
SET email = auth.users.email
FROM auth.users 
WHERE profiles.email IS NULL 
  AND profiles.id = auth.users.id;

-- Set created_at for profiles that don't have it
UPDATE public.profiles 
SET created_at = COALESCE(created_at, NOW())
WHERE created_at IS NULL;

-- Set updated_at for profiles that don't have it
UPDATE public.profiles 
SET updated_at = COALESCE(updated_at, NOW())
WHERE updated_at IS NULL;

-- Ensure all profiles have the correct primary key constraint
DO $$
BEGIN
  -- Drop existing primary key if it's not on the 'id' column
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'profiles' 
      AND constraint_type = 'PRIMARY KEY'
      AND constraint_name != 'profiles_pkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
  END IF;

  -- Add primary key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'profiles' 
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' AND table_name = 'profiles' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%auth_users%'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies if they don't exist
DO $$
BEGIN
  -- Drop existing policies to recreate them
  DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles insert self" ON public.profiles;
  DROP POLICY IF EXISTS "Profiles update own" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

  -- Create new policies
  CREATE POLICY "Profiles select own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Profiles insert self" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

  CREATE POLICY "Profiles update own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
END $$;

-- Create a function to ensure all users have profiles
CREATE OR REPLACE FUNCTION ensure_all_users_have_profiles()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all auth users
    FOR user_record IN 
        SELECT id, email FROM auth.users 
        WHERE id NOT IN (SELECT id FROM public.profiles WHERE id IS NOT NULL)
    LOOP
        -- Insert profile for users who don't have one
        INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            NULL,
            NULL,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to ensure all users have profiles
SELECT ensure_all_users_have_profiles();

-- Clean up the function
DROP FUNCTION ensure_all_users_have_profiles();
